import { CommonModule } from '@angular/common';
import { Component, Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

import {
  EmailSendFilter,
  EmailSendStatus,
  IEmailSendDetail,
  IEmailSendItem,
  IEmailSendSummary,
} from '../../models/EmailSendProgress';
import { DripCampaignService } from '../../services/drip-campaign.service';

/**
 * Sets an `<iframe>`'s `srcdoc` as a plain DOM property.
 *
 * Binding `[srcdoc]` in a template routes the string through Angular's HTML sanitiser,
 * which strips `<style>` and most of what makes an email look like an email. The preview
 * drawer avoids that by assigning the property directly; this directive is the same
 * thing for a frame that lives inside an `*ngFor`. The content is already made
 * display-safe by the API (tracking pixel, tracker links and unsubscribe link removed) and
 * the frame is `sandbox=""`, so no script runs and nothing can navigate.
 */
@Directive({ selector: 'iframe[kexySrcdoc]' })
export class SrcdocDirective {
  constructor(private el: ElementRef<HTMLIFrameElement>) {}

  @Input() set kexySrcdoc(html: string | null) {
    this.el.nativeElement.srcdoc = SrcdocDirective.wrap(html || '');
  }

  private static wrap(html: string): string {
    const base = '<base target="_blank" rel="noopener noreferrer" />';
    if (/<html[\s>]/i.test(html)) {
      return /<head[\s>]/i.test(html) ? html.replace(/<head([\s>])/i, `<head$1${base}`) : `${base}${html}`;
    }
    return (
      `<!DOCTYPE html><html><head><meta charset="utf-8">${base}` +
      `<style>body{margin:14px;font:14px/1.6 Arial,Helvetica,sans-serif;color:#202124;word-wrap:break-word}` +
      `img{max-width:100%}</style></head><body>${html}</body></html>`
    );
  }
}

type Tone = 'good' | 'live' | 'wait' | 'bad' | 'mute';

interface IStatusMeta {
  label: string;
  tone: Tone;
  /** Spins while the sweep is actively working on the prospect. */
  busy: boolean;
}

/** One place that decides how each state is worded and coloured. */
const STATUS_META: Record<EmailSendStatus, IStatusMeta> = {
  scheduled: { label: 'Scheduled', tone: 'mute', busy: false },
  queued: { label: 'Queued', tone: 'wait', busy: false },
  generating: { label: 'Generating', tone: 'live', busy: true },
  generated: { label: 'Generated', tone: 'live', busy: true },
  sending: { label: 'Sending', tone: 'live', busy: true },
  sent: { label: 'Sent', tone: 'good', busy: false },
  failed: { label: 'Failed', tone: 'bad', busy: false },
  skipped: { label: 'Skipped', tone: 'mute', busy: false },
};

interface ITimelineStep {
  label: string;
  at: string | null;
  tone: 'done' | 'bad' | 'todo';
}

/** What is known about one expanded row's content. */
interface IRowDetail {
  state: 'loading' | 'ready' | 'error';
  data?: IEmailSendDetail;
  error?: string;
  /** The row's status when this was fetched — a change means the content is stale. */
  forStatus: EmailSendStatus;
  steps?: ITimelineStep[];
}

interface ISegment {
  key: string;
  label: string;
  count: number;
  pct: number;
}

interface IFilterChip {
  key: EmailSendFilter;
  label: string;
  count: number;
}

const PAGE_SIZE = 25;
/** While the sweep is generating/sending — fast enough to feel live, slow enough to be cheap. */
const POLL_ACTIVE_MS = 3000;
/** Only queued: the next run has not started, so there is little to see change. */
const POLL_QUEUED_MS = 15000;
/** After a failed poll: back off rather than hammer an API that is struggling. */
const POLL_RETRY_MS = 15000;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * "Prospects" section of the per-email Insights drawer: every enrolled prospect and
 * where THIS email is for them, live while the send sweep runs, with the AI's output
 * beside what was actually sent when a row is opened.
 *
 * ── Polling ─────────────────────────────────────────────────────────────────
 * Only while something is happening (see POLL_*): a settled campaign costs no requests
 * after the first. Polls are SILENT — they never flip `isLoading`, so the list never
 * blanks to a skeleton — and a paused tab skips its tick rather than fetching unseen.
 *
 * ── Everything derived is a FIELD ───────────────────────────────────────────
 * Same rule as the drawer around it: a getter would re-run on every change-detection
 * pass, and this component re-renders every few seconds while live.
 */
@Component({
  selector: 'email-send-progress',
  imports: [CommonModule, SrcdocDirective],
  templateUrl: './email-send-progress.component.html',
  styleUrl: './email-send-progress.component.scss',
})
export class EmailSendProgressComponent implements OnInit, OnDestroy {
  @Input({ required: true }) campaignId!: number;
  @Input({ required: true }) emailId!: number;

  readonly pageSize = PAGE_SIZE;

  summary: IEmailSendSummary | null = null;
  items: IEmailSendItem[] = [];
  total = 0;
  page = 1;
  totalPages = 1;
  filter: EmailSendFilter = 'all';
  search = '';

  /** True only until the first response — polls and page changes never set it. */
  isLoading = true;
  loadError = '';
  /** A background poll failed; the list on screen is the last good one. */
  pollError = false;
  /** A page/filter change is in flight over existing rows. */
  isBusy = false;

  // ── Derived ─────────────────────────────────────────────────────────────
  isLive = false;
  headline = '';
  statusLine = '';
  segments: ISegment[] = [];
  chips: IFilterChip[] = [];

  expanded: Record<string, boolean> = {};
  details: Record<string, IRowDetail> = {};
  /** Rows showing the raw AI stream instead of the formatted email. */
  rawView: Record<string, boolean> = {};

  private timer: ReturnType<typeof setTimeout> | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped per request so a slow, superseded response cannot overwrite a newer one. */
  private requestSeq = 0;
  private destroyed = false;

  constructor(private dripCampaignService: DripCampaignService) {}

  ngOnInit(): void {
    this.__load('initial');
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.__clearTimers();
  }

  // ── Template helpers ────────────────────────────────────────────────────
  statusMeta = (status: EmailSendStatus): IStatusMeta => STATUS_META[status];

  rowKey = (item: IEmailSendItem): string =>
    item.logId ? `log:${item.logId}` : item.conversationId ? `conv:${item.conversationId}` : `email:${item.email}`;

  trackByKey = (_: number, item: IEmailSendItem): string => this.rowKey(item);

  /** A queued or scheduled prospect has nothing to show yet, so its row does not open. */
  canExpand = (item: IEmailSendItem): boolean => item.status !== 'scheduled' && item.status !== 'queued';

  // ── Actions ─────────────────────────────────────────────────────────────
  refresh = (): void => {
    this.__load('user');
  };

  selectFilter = (filter: EmailSendFilter): void => {
    if (filter === this.filter) return;
    this.filter = filter;
    this.page = 1;
    this.__load('user');
  };

  onSearch = (value: string): void => {
    this.search = value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page = 1;
      this.__load('user');
    }, SEARCH_DEBOUNCE_MS);
  };

  goToPage = (page: number): void => {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.page = page;
    this.__load('user');
  };

  toggleRow = (item: IEmailSendItem): void => {
    if (!this.canExpand(item)) return;
    const key = this.rowKey(item);
    this.expanded[key] = !this.expanded[key];
    if (this.expanded[key] && !this.details[key]) this.__loadDetail(item);
  };

  setRawView = (key: string, raw: boolean): void => {
    this.rawView[key] = raw;
  };

  /** Re-fetch a row's content after a failed load (a plain toggle would keep the error). */
  retryDetail = (item: IEmailSendItem): void => {
    delete this.details[this.rowKey(item)];
    this.__loadDetail(item);
  };

  clearFilters = (): void => {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.search = '';
    this.filter = 'all';
    this.page = 1;
    this.__load('user');
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  /**
   * Never falls back to the skeleton once there is something on screen.
   *
   * - `initial`: the first load, the only one that shows the skeleton.
   * - `user`: a filter, page, search or refresh — dims the list while it loads.
   * - `poll`: the background tick — changes nothing visible until data actually differs.
   */
  private async __load(mode: 'initial' | 'user' | 'poll'): Promise<void> {
    if (this.destroyed) return;
    this.__clearPollTimer();

    const seq = ++this.requestSeq;
    if (mode === 'user' && this.summary) this.isBusy = true;

    try {
      const res = await this.dripCampaignService.getEmailSendProgress(this.campaignId, this.emailId, {
        page: this.page,
        limit: PAGE_SIZE,
        status: this.filter,
        search: this.search,
      });
      if (seq !== this.requestSeq || this.destroyed) return;

      this.summary = res.summary;
      this.items = res.prospects.items;
      this.total = res.prospects.total;
      this.totalPages = Math.max(1, Math.ceil(res.prospects.total / PAGE_SIZE));
      this.loadError = '';
      this.pollError = false;
      this.__recompute();
      this.__refreshStaleDetails();

      // A filter can shrink the result under the page we were on.
      if (this.page > this.totalPages) {
        this.page = this.totalPages;
        this.__load('user');
        return;
      }
    } catch (e: any) {
      if (seq !== this.requestSeq || this.destroyed) return;
      if (this.summary) {
        // Keep the last good list; say updates are paused rather than blanking it.
        this.pollError = true;
      } else {
        this.loadError = e?.message || 'Could not load prospect progress for this email.';
      }
    } finally {
      if (seq === this.requestSeq) {
        this.isLoading = false;
        this.isBusy = false;
      }
    }

    if (seq === this.requestSeq) this.__schedule();
  }

  private __schedule(): void {
    this.__clearPollTimer();
    if (this.destroyed) return;

    const delay = this.pollError
      ? POLL_RETRY_MS
      : this.summary?.inFlight
        ? POLL_ACTIVE_MS
        : this.summary?.queued
          ? POLL_QUEUED_MS
          : 0;
    if (!delay) return;

    this.timer = setTimeout(() => {
      // A hidden tab shows nobody anything — skip the fetch, keep the schedule.
      if (typeof document !== 'undefined' && document.hidden) {
        this.__schedule();
        return;
      }
      this.__load('poll');
    }, delay);
  }

  private async __loadDetail(item: IEmailSendItem): Promise<void> {
    const key = this.rowKey(item);
    const previous = this.details[key];
    // Refreshing keeps the old content on screen; only a first load shows the spinner.
    this.details[key] = previous
      ? { ...previous, forStatus: item.status }
      : { state: 'loading', forStatus: item.status };

    try {
      const data = await this.dripCampaignService.getEmailSendDetail(this.campaignId, this.emailId, {
        logId: item.logId,
        conversationId: item.conversationId,
      });
      if (this.destroyed) return;
      this.details[key] = { state: 'ready', data, forStatus: item.status, steps: this.__steps(data) };
    } catch (e: any) {
      if (this.destroyed) return;
      this.details[key] = previous?.data
        ? { ...previous, forStatus: item.status }
        : { state: 'error', error: e?.message || 'Could not load this email.', forStatus: item.status };
    }
  }

  /**
   * A row that changed state since its content was fetched (generating → sent, say) is
   * re-fetched, or an open row would keep saying "waiting for the AI" after the email
   * had gone out.
   */
  private __refreshStaleDetails(): void {
    for (const item of this.items) {
      const key = this.rowKey(item);
      const detail = this.details[key];
      if (this.expanded[key] && detail && detail.state !== 'loading' && detail.forStatus !== item.status) {
        this.__loadDetail(item);
      }
    }
  }

  // ── Derived state ───────────────────────────────────────────────────────
  private __recompute(): void {
    const s = this.summary;
    if (!s) return;

    const inProgress = s.generating + s.generated + s.sending;
    this.isLive = s.inFlight;

    const total = s.totalProspects;
    const pct = (n: number) => (total ? (n / total) * 100 : 0);
    this.segments = [
      { key: 'sent', label: 'Sent', count: s.sent, pct: pct(s.sent) },
      { key: 'progress', label: 'In progress', count: inProgress, pct: pct(inProgress) },
      { key: 'queued', label: 'Queued', count: s.queued, pct: pct(s.queued) },
      { key: 'failed', label: 'Failed', count: s.failed, pct: pct(s.failed) },
      { key: 'skipped', label: 'Skipped', count: s.skipped, pct: pct(s.skipped) },
    ].filter((seg) => seg.count > 0);

    this.headline = total ? `${s.sent} of ${total} sent` : 'No prospects enrolled yet';
    this.statusLine = this.__statusLine(s, inProgress);

    const chip = (key: EmailSendFilter, label: string, count: number): IFilterChip => ({ key, label, count });
    this.chips = [
      chip('all', 'All', total),
      chip('sent', 'Sent', s.sent),
      chip('in_progress', 'In progress', inProgress),
      chip('queued', 'Queued', s.queued),
      chip('scheduled', 'Scheduled', s.scheduled),
      chip('failed', 'Failed', s.failed),
      chip('skipped', 'Skipped', s.skipped),
      // An empty chip is noise, except the one you are looking at or "All".
    ].filter((c) => c.key === 'all' || c.key === this.filter || c.count > 0);
  }

  /** Says what is true right now, and never claims more than the counts support. */
  private __statusLine(s: IEmailSendSummary, inProgress: number): string {
    if (s.inFlight) {
      const parts = [
        s.generating && `${s.generating} generating`,
        s.generated && `${s.generated} ready to send`,
        s.sending && `${s.sending} sending`,
      ].filter(Boolean);
      return `Live · ${parts.join(' · ')}`;
    }
    if (s.queued) return `${s.queued} queued — they go out when the next send run starts.`;
    if (s.failed && !inProgress) return `${s.failed} failed — open a row to see why.`;
    if (s.scheduled && !s.sent) return 'Nothing has been sent for this email yet.';
    if (s.scheduled) return `${s.scheduled} not reached yet — they follow the campaign schedule.`;
    return s.totalProspects ? 'Everything for this email has been processed.' : '';
  }

  private __steps(d: IEmailSendDetail): ITimelineStep[] {
    const step = (label: string, at: string | null): ITimelineStep => ({
      label,
      at,
      tone: at ? 'done' : 'todo',
    });
    const steps = [
      step('Queued', d.queuedAt),
      step('Generating', d.generationStartedAt),
      step('AI ready', d.generatedAt),
      step('Sending', d.sendingAt),
      step('Sent', d.sentAt),
    ];
    // A finished send lists only the stages it has times for. Sends from before the send
    // log existed have a sent time and nothing else, and greyed-out "Generating…" steps
    // would read as though those stages never happened.
    if (d.status === 'sent') return steps.filter((x) => x.at);

    if (d.status === 'failed' || d.status === 'skipped') {
      // A terminal failure replaces the steps that never happened.
      const label = d.status === 'failed' ? 'Failed' : 'Skipped';
      return [...steps.filter((x) => x.at), { label, at: d.failedAt || d.updatedAt, tone: 'bad' }];
    }
    return steps;
  }

  private __clearPollTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private __clearTimers(): void {
    this.__clearPollTimer();
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }
}
