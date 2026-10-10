import { CommonModule } from '@angular/common';
import { Component, Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { NgbOffcanvas, OffcanvasDismissReasons } from '@ng-bootstrap/ng-bootstrap';

import {
  EmailDeliveryStatus,
  IAiPausedState,
  EmailSendFilter,
  EmailSendStatus,
  IEmailSendDetail,
  IEmailSendItem,
  IEmailSendSchedule,
  IEmailSendSummary,
} from '../../models/EmailSendProgress';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { PROSPECT_PROFILE_ENABLED } from '../../services/prospect-profile.service';
import { IStatusMeta, STATUS_META, Tone } from '../../helpers/email-send-status';
import { IScheduleLabel, scheduleEventAt, scheduleLabel } from '../../helpers/send-schedule-label';
import { ProspectProfileContentComponent } from '../prospect-profile-content/prospect-profile-content.component';
import { ProspectingContactsComponent } from '../prospecting-contacts/prospecting-contacts.component';
import { ProspectingService } from '../../services/prospecting.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

/**
 * Keeps a framed email's images inside the frame, in proportion.
 *
 * `max-width` alone is NOT enough, and getting it wrong is what produced the
 * "stretched" emails: an image written by the old CKEditor carries its INTRINSIC size in
 * the width/height attributes (3496x1967 was live in real content) with the display size
 * only as a percentage on the `<figure>`. Clamp the width without releasing the height
 * and the height attribute still applies — `aspect-ratio` is ignored once both dimensions
 * are set — so the picture renders as a tall vertical smear. `height:auto` is what lets
 * the ratio follow the width.
 *
 * Applied to a full email document as well as a fragment, because the stored body of an
 * older campaign is usually a bare fragment but a newer one is a whole document, and both
 * can contain such an image. It cannot disturb the current editor's own media blocks:
 * those carry their size in an INLINE style, which beats a stylesheet rule.
 *
 * KexyApi does the same thing to the email itself on the way out
 * (`normalizeEmailImages`), so this frame and the prospect's inbox agree.
 */
export const EMAIL_FRAME_IMAGE_CSS = 'img{max-width:100%;height:auto}';

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
    const head = `${base}<style>${EMAIL_FRAME_IMAGE_CSS}</style>`;
    if (/<html[\s>]/i.test(html)) {
      return /<head[\s>]/i.test(html) ? html.replace(/<head([\s>])/i, `<head$1${head}`) : `${head}${html}`;
    }
    return (
      `<!DOCTYPE html><html><head><meta charset="utf-8">${head}` +
      `<style>body{margin:14px;font:14px/1.6 Arial,Helvetica,sans-serif;color:#202124;word-wrap:break-word}` +
      `</style></head><body>${html}</body></html>`
    );
  }
}

/**
 * What happened after the send, per Amazon SES. "Sent" alone only means SES accepted it;
 * these say whether it then reached the inbox. `problem` rows also show SES's reason.
 */
const DELIVERY_META: Record<EmailDeliveryStatus, { label: string; tone: Tone; problem: boolean }> = {
  delivered: { label: 'Delivered', tone: 'good', problem: false },
  delayed: { label: 'Delivery delayed', tone: 'wait', problem: false },
  bounced: { label: 'Bounced', tone: 'bad', problem: true },
  rejected: { label: 'Rejected by SES', tone: 'bad', problem: true },
  failed: { label: 'Not delivered', tone: 'bad', problem: true },
  complained: { label: 'Marked as spam', tone: 'bad', problem: true },
};

/** Delivery outcomes that mean the email never arrived; see `rowStatus`. */
const UNDELIVERED = new Set<string>(['bounced', 'rejected', 'failed']);

/** Plain-language name for each failure/skip code; the code itself is still shown beside it. */
const ERROR_TITLES: Record<string, string> = {
  ai_api_error: 'AI service unavailable',
  ai_generation_error: 'The AI could not write this email',
  ai_declined_prospect: 'The AI declined this prospect',
  empty_email_content: 'The AI returned no email',
  contact_not_found: 'Contact not found',
  smtp_error: 'Sending failed (SMTP)',
  conversation_create_error: 'Could not record the send',
  unexpected_error: 'Unexpected error',
  interrupted: 'Interrupted',
  suppressed: 'On the suppression list',
  unsubscribed: 'Unsubscribed',
  replied: 'Prospect replied — remaining emails cancelled',
  unenrolled: 'No longer enrolled in this campaign',
};

/**
 * Failures the sweep retries on its own, up to the queue row's attempt limit. Anything
 * else is NOT retried by attempts: a missing contact's queue row is deleted outright, and
 * an SMTP failure pauses the whole campaign (see `retryNote`).
 */
const RETRIED_BY_ATTEMPTS = new Set([
  'ai_generation_error',
  'empty_email_content',
  'conversation_create_error',
  'unexpected_error',
  'interrupted',
]);

/**
 * Statuses that mean we have STOPPED trying, as opposed to `failed`, which means this
 * attempt failed and another may follow. Worth saying out loud: a prospect the sweep has
 * given up on used to look exactly like one still waiting its turn.
 */
const TERMINAL_STATUSES = new Set<EmailSendStatus>(['skipped_after_failures', 'declined_by_ai']);

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
/** Countdown tick. Only runs while a row on the page is counting down. */
const COUNTDOWN_TICK_MS = 1000;
/** Never fire a "their time has come" poll sooner than this after a load. */
const DUE_POLL_MIN_MS = 5000;
/** Rows whose `schedule` is shown: waiting to join the queue, and waiting in it. */
const COUNTED_STATUSES = ['scheduled', 'queued'];
/** setTimeout overflows past ~24.8 days; nothing here is scheduled that far out anyway. */
const MAX_TIMEOUT_MS = 2_000_000_000;

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
  /** 1-based position in the sequence, for "Replied to Email 3" in the profile. */
  @Input() emailSequence: number | null = null;
  /**
   * Opens on this tab instead of "All" — set when the drawer was opened from a countdown,
   * so the prospect it counts down for is in front of the user. See `focus`.
   */
  @Input() initialFilter: EmailSendFilter | null = null;

  readonly pageSize = PAGE_SIZE;

  summary: IEmailSendSummary | null = null;
  aiPaused: IAiPausedState | null = null;
  /** The Insights safety switch (same shape): while paused, AI-written emails wait. */
  insightsPaused: IAiPausedState | null = null;
  items: IEmailSendItem[] = [];
  total = 0;
  /** "Profile/Score" column; toggled by PROSPECT_PROFILE_ENABLED. */
  readonly showProfile = PROSPECT_PROFILE_ENABLED;
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
  /** The "When" cell of each `scheduled` row, keyed by `rowKey`. Refreshed every tick. */
  scheduleLabels: Record<string, IScheduleLabel> = {};
  /** Rows showing the raw AI stream instead of the formatted email. */
  rawView: Record<string, boolean> = {};

  /**
   * Hides the "Generated by AI" side of the comparison, leaving "Sent to prospect"
   * full-width — product decided the AI draft isn't something a brand user needs to
   * see day to day. Kept as a flag rather than deleted: flip to `true` locally when
   * debugging a generation issue (e.g. comparing AI raw output against what actually
   * sent) and flip back before committing. Do not remove the "Generated by AI" markup
   * or the underlying `data.ai` fetch/state — only this flag gates visibility.
   */
  readonly showAiGeneratedCard = false;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  /**
   * Server clock minus this browser's, from the response's `serverTime`. A countdown
   * read off a laptop clock that is a few minutes out would be wrong by that much.
   */
  private clockOffsetMs = 0;
  /** Bumped per request so a slow, superseded response cannot overwrite a newer one. */
  private requestSeq = 0;
  private destroyed = false;

  /** The row whose contact is being looked up before the edit drawer opens. */
  openingContact: string | null = null;

  constructor(
    private dripCampaignService: DripCampaignService,
    private ngbOffcanvas: NgbOffcanvas,
    private host: ElementRef<HTMLElement>,
    private prospectingService: ProspectingService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    if (this.initialFilter) this.filter = this.initialFilter;
    this.__load('initial');
  }

  /**
   * Scrolls this section to the top of the drawer. Called after its own first load when
   * opened on a tab, and by the drawer after the analytics above it load — whichever
   * lands last moves it down, so both ask and the later one leaves it in place.
   */
  focus = (): void => {
    setTimeout(() => this.host.nativeElement.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };

  ngOnDestroy(): void {
    this.destroyed = true;
    this.__clearTimers();
  }

  // ── Template helpers ────────────────────────────────────────────────────
  /**
   * The Status pill for a row. A sent email reads "Delivered", unless SES then reported it
   * never arrived (bounced, rejected, failed) — that outcome takes the pill instead, so a
   * lost email never reads as a success. A delay shows as "Delivery delayed" on its own.
   * Opened / Clicked / Replied pills join it as the prospect engages (see `isEngaged`).
   */
  rowStatus = (item: IEmailSendItem): IStatusMeta => {
    const meta = STATUS_META[item.status];
    if (item.status !== 'sent') return meta;
    const d = item.delivery;
    if (d && this.isUndelivered(d.status)) return { label: this.deliveryMeta(d.status).label, tone: 'bad', busy: false };
    if (d?.status === 'delayed') return { ...meta, label: this.deliveryMeta(d.status).label, tone: 'wait' };
    return { ...meta, label: 'Delivered' };
  };

  /** SES outcomes where the email never reached the inbox — shown AS the status. */
  isUndelivered = (status: string): boolean => UNDELIVERED.has(status);

  /** A secondary pill under the status, for what the status itself does not say (a spam report). */
  showDeliveryPill = (status: string): boolean =>
    status !== 'delivered' && status !== 'delayed' && !this.isUndelivered(status);

  /** An unknown status (a newer API) still reads sensibly rather than blank. */
  deliveryMeta = (status: string) =>
    DELIVERY_META[status as EmailDeliveryStatus] ?? { label: status, tone: 'mute' as Tone, problem: false };

  rowKey = (item: IEmailSendItem): string =>
    item.logId ? `log:${item.logId}` : item.conversationId ? `conv:${item.conversationId}` : `email:${item.email}`;

  trackByKey = (_: number, item: IEmailSendItem): string => this.rowKey(item);

  /**
   * Whether a failed prospect will be tried again, so "Failed" never leaves you guessing.
   * Null when there is nothing useful to say (it will not retry, and the error says why).
   */
  retryNote = (item: IEmailSendItem, maxAttempts: number): string | null => {
    // Terminal: the server has already decided, so say what it decided rather than
    // guessing from the attempt count.
    if (item.status === 'declined_by_ai') return 'skipped — not a match for this campaign';
    if (item.status === 'skipped_after_failures') {
      return `skipped after ${item.attempt} failed attempt${item.attempt === 1 ? '' : 's'}`;
    }

    if (item.status !== 'failed') return null;
    // The AI service being down is not this prospect's problem: their attempt is
    // refunded and they are retried once sending resumes.
    if (item.errorCode === 'ai_api_error') return 'retries once the AI service recovers';
    if (item.errorCode === 'smtp_error') return 'retries once the campaign is resumed';
    if (!RETRIED_BY_ATTEMPTS.has(item.errorCode ?? '')) return null;
    return item.attempt < maxAttempts
      ? `will retry · attempt ${item.attempt}/${maxAttempts}`
      : `gave up after ${maxAttempts} attempts`;
  };

  /** True when nothing further will happen to this prospect for this email. */
  isTerminal = (item: IEmailSendItem): boolean => TERMINAL_STATUSES.has(item.status);

  /** What went wrong, in words, for an expanded row. The raw text follows it verbatim. */
  errorTitle = (d: IEmailSendDetail): string =>
    ERROR_TITLES[d.errorCode ?? ''] ?? (d.status === 'skipped' ? 'Skipped' : 'Failed');

  /**
   * Whether the AI SERVICE was at fault rather than anything about this prospect —
   * worth saying, because it is the difference between "fix your list" and "wait".
   */
  isServiceFailure = (d: IEmailSendDetail): boolean => d.errorClass === 'service';

  /**
   * The AI card shows its raw response when there is no usable email to render — that is
   * the failure case, and the raw text IS the explanation. Otherwise the Email/Raw switch
   * decides.
   */
  showRaw = (key: string, d: IEmailSendDetail): boolean =>
    !!d.ai.raw && (!d.ai.formatted || !!this.rawView[key]);

  /** A queued or scheduled prospect has nothing to show yet, so its row does not open. */
  canExpand = (item: IEmailSendItem): boolean => item.status !== 'scheduled' && item.status !== 'queued';

  /**
   * Whether the prospect opened THIS send — the gate for the engagement pills (and, with a
   * real open, the profile: `canViewProfile`). Only a sent row that actually arrived: a scheduled, queued or
   * bounced row has nothing to open, whatever an earlier send left behind. The API sets
   * `openedAt` for a click or reply too (the pixel may have been blocked).
   */
  isEngaged = (item: IEmailSendItem): boolean =>
    item.status === 'sent' &&
    !(item.delivery && this.isUndelivered(item.delivery.status)) &&
    !!(item.engagement?.openedAt || item.engagement?.clickedAt || item.engagement?.repliedAt);

  /**
   * The gate for "View": the prospect has opened any email of this campaign (KexyApi's
   * `profileReady`, the same rule as the profile page), so a prospect scored after opening
   * Email 1 can be viewed from Email 2's list too. An older API without the field falls
   * back to this row's own open (the pixel — a click or reply with images blocked is not one).
   */
  canViewProfile = (item: IEmailSendItem): boolean =>
    // Fallback for an API without `profileReady`: any open, click or reply, like the API rule.
    item.profileReady ?? this.isEngaged(item);

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

  /**
   * Opens the prospect's profile as a second drawer STACKED on this one — the Insights
   * drawer stays open underneath, so closing the profile returns to the same list, page
   * and open rows.
   *
   * `scroll: true` is deliberate: ng-bootstrap tracks one scroll lock, and the Insights
   * drawer already holds it. If this drawer took it too, closing this one would release
   * it and the page behind Insights would start scrolling. The panel/backdrop classes
   * lift it above Insights (global `styles.scss`).
   */
  openProfile = (item: IEmailSendItem): void => {
    const ref = this.ngbOffcanvas.open(ProspectProfileContentComponent, {
      panelClass: 'prospect-profile-drawer',
      backdropClass: 'prospect-profile-backdrop',
      position: 'end',
      scroll: true,
    });
    ref.componentInstance.campaignId = this.campaignId;
    ref.componentInstance.emailSequence = this.emailSequence;
    // `?? true` for an API from before the field existed — on is the default setting.
    ref.componentInstance.stopsOnReply = this.summary?.stopsOnReply ?? true;
    ref.componentInstance.prospect = item;

    // Esc must close the TOP drawer. ng-bootstrap listens for Esc on each panel's own
    // element, so it goes to whichever panel has focus — and focus is still on this
    // "View" button, inside Insights, until the profile has animated in. Esc then closed
    // Insights and left the profile floating. Both panels ignore an Esc whose default is
    // already prevented, so claim it first, for as long as the profile is open.
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      ref.dismiss(OffcanvasDismissReasons.ESC);
    };
    document.addEventListener('keydown', onKeydown, true);
    const cleanup = (): void => document.removeEventListener('keydown', onKeydown, true);
    ref.result.then(cleanup, cleanup);
  };

  /**
   * Clicking the prospect's name/email opens the same edit drawer as Manage Contacts, on top
   * of Insights. The drawer needs the full contact row (lists, details), which this table
   * does not have, so it is looked up by email first. Reloads the table when it closes, so
   * an edited name shows.
   */
  openContact = async (item: IEmailSendItem): Promise<void> => {
    if (this.openingContact) return;
    const key = this.rowKey(item);
    this.openingContact = key;
    let contact = null;
    try {
      const companyId = this.authService.userTokenValue?.supplier_id;
      contact = await this.prospectingService.findContactByEmail(companyId, item.email);
    } catch {
      contact = null;
    } finally {
      this.openingContact = null;
    }
    if (!contact) {
      await Swal.fire('Contact not found', `${item.email} is no longer in your contacts.`, 'info');
      return;
    }

    this.prospectingService.isAddNewButtonClickedInContactPage = false;
    this.prospectingService.clickedContactInContactPage = [contact];
    const ref = this.ngbOffcanvas.open(ProspectingContactsComponent, {
      // `contact-over-insights`: stacked above the Insights drawer (styles.scss).
      panelClass: 'contact-slide-content edit-rep-canvas contact-over-insights',
      backdropClass: 'edit-rep-canvas-backdrop contact-over-insights-backdrop',
      position: 'end',
      scroll: false,
    });

    // Esc closes the TOP drawer only — same reason as `openProfile`.
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      ref.dismiss(OffcanvasDismissReasons.ESC);
    };
    document.addEventListener('keydown', onKeydown, true);
    const done = (): void => {
      document.removeEventListener('keydown', onKeydown, true);
      if (!this.destroyed) this.__load('user');
    };
    ref.result.then(done, done);
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
      this.aiPaused = res.aiPaused ?? null;
      this.insightsPaused = res.insightsPaused ?? null;
      this.items = res.prospects.items;
      this.total = res.prospects.total;
      this.totalPages = Math.max(1, Math.ceil(res.prospects.total / PAGE_SIZE));
      this.loadError = '';
      this.pollError = false;
      const serverNow = Date.parse(res.serverTime);
      if (!Number.isNaN(serverNow)) this.clockOffsetMs = serverNow - Date.now();
      this.__recompute();
      this.__refreshStaleDetails();
      this.__recomputeSchedules();
      this.__syncCountdown();
      if (mode === 'initial' && this.initialFilter) this.focus();

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

    // A row's countdown ends when it should change stage — a scheduled row joins the
    // queue, a queued one is sent — so look again then. Overdue rows are polled at the
    // queued pace until they move.
    const dueIn = this.__msUntilNextDue();
    const dueDelay =
      dueIn !== null ? Math.min(Math.max(dueIn, dueIn > 0 ? DUE_POLL_MIN_MS : POLL_QUEUED_MS), MAX_TIMEOUT_MS) : 0;
    const delay = this.pollError
      ? POLL_RETRY_MS
      : this.summary?.inFlight
        ? POLL_ACTIVE_MS
        : this.summary?.queued
          ? Math.min(POLL_QUEUED_MS, dueDelay || POLL_QUEUED_MS)
          : dueDelay;
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
      this.details[key] = { state: 'ready', data, forStatus: item.status, steps: this.__steps(data, item) };
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
      // "Stopped" is separated from "Failed" on purpose: a failed prospect may still be
      // retried, a stopped one never will, and only the second needs the user to act.
      chip('stopped', 'Stopped', s.skippedAfterFailures + s.declinedByAi),
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
    if (s.declinedByAi && !inProgress) {
      return `${s.declinedByAi} skipped — the AI judged them a poor match for this campaign.`;
    }
    if (s.skippedAfterFailures && !inProgress) {
      return `${s.skippedAfterFailures} skipped after repeated failures — open a row to see why.`;
    }
    if (s.failed && !inProgress) return `${s.failed} failed — open a row to see why.`;
    if (s.scheduled && !s.sent) return 'Nothing has been sent for this email yet.';
    if (s.scheduled) return `${s.scheduled} not reached yet — they follow the campaign schedule.`;
    return s.totalProspects ? 'Everything for this email has been processed.' : '';
  }

  private __steps(d: IEmailSendDetail, item: IEmailSendItem): ITimelineStep[] {
    const step = (label: string, at: string | null): ITimelineStep => ({
      label,
      at,
      tone: at ? 'done' : 'todo',
    });
    // No "Sending" step: it is stamped the same second as the send, so it only repeated
    // it. The last step reads like the row's status pill ("Delivered"), or SES's outcome
    // in red when the email never arrived (bounced, rejected, failed).
    const outcome = this.rowStatus(item);
    const last: ITimelineStep =
      d.status === 'sent' && outcome.tone === 'bad'
        ? { label: outcome.label, at: item.delivery?.updatedAt || d.sentAt, tone: 'bad' }
        : step(d.status === 'sent' ? outcome.label : 'Delivered', d.sentAt);
    const steps = [
      step('Queued', d.queuedAt),
      step('Generating', d.generationStartedAt),
      step('AI ready', d.generatedAt),
      last,
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

  // ── Countdown ───────────────────────────────────────────────────────────
  private __now(): number {
    return Date.now() + this.clockOffsetMs;
  }

  /** Rows on this page with a time to count down to. */
  private __countingRows(): IEmailSendSchedule[] {
    return this.items
      .filter((i) => COUNTED_STATUSES.includes(i.status) && scheduleEventAt(i.schedule ?? null) !== null)
      .map((i) => i.schedule as IEmailSendSchedule);
  }

  /** Ms until the soonest row on this page changes stage; negative if overdue; null if none. */
  private __msUntilNextDue(): number | null {
    const times = this.__countingRows().map((sc) => scheduleEventAt(sc) as number);
    return times.length ? Math.min(...times) - this.__now() : null;
  }

  /** Ticks only while there is something to count; a settled page costs nothing. */
  private __syncCountdown(): void {
    const needed = this.__countingRows().length > 0;
    if (needed && !this.countdownTimer) {
      this.countdownTimer = setInterval(() => this.__recomputeSchedules(), COUNTDOWN_TICK_MS);
    } else if (!needed) {
      this.__clearCountdown();
    }
  }

  private __recomputeSchedules(): void {
    const now = this.__now();
    const labels: Record<string, IScheduleLabel> = {};
    for (const item of this.items) {
      if (!COUNTED_STATUSES.includes(item.status)) continue;
      // A queued row from an API without schedules keeps its plain timestamp.
      if (item.status === 'queued' && !item.schedule) continue;
      labels[this.rowKey(item)] = scheduleLabel(item.schedule ?? null, now);
    }
    this.scheduleLabels = labels;
  }

  private __clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private __clearTimers(): void {
    this.__clearPollTimer();
    this.__clearCountdown();
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }
}
