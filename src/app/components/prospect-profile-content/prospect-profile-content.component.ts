import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';

import { STATUS_META, Tone } from '../../helpers/email-send-status';
import { IEmailSendItem, IEmailSendProfile } from '../../models/EmailSendProgress';
import {
  IProspectInsights,
  IProspectScore,
  IProspectSignal,
  IProspectTimeline,
  IProspectTimelineEvent,
  OpenerAngle,
  ProspectScoreStatus,
} from '../../models/ProspectProfile';
import { PROSPECT_PROFILE_USE_MOCK, ProspectProfileService } from '../../services/prospect-profile.service';

/** `locked`: KexyApi refused it (403) — the prospect hasn't opened an email yet. */
type LoadState = 'loading' | 'ready' | 'error' | 'locked';

/**
 * How often the page re-reads the timeline while the score is being made. A Score API call
 * takes seconds (90s at most).
 */
const SCORE_POLL_MS = 5000;

/** Re-check while a score is `due`: the 5-minute run starts it, so every 5s would be waste. */
const SCORE_DUE_POLL_MS = 30000;

/** What the prospect did that the score on screen doesn't count yet. */
const SCORE_UPDATE_EVENT: Record<'reply' | 'click' | 'open', string> = {
  reply: 'replied',
  click: 'clicked a link',
  open: 'opened an email',
};

/** The line under a score that is being replaced (KexyApi's `scoreUpdate`). */
function scoreUpdateText(u: IProspectTimeline['scoreUpdate']): string | null {
  if (!u) return null;
  const did = SCORE_UPDATE_EVENT[u.event] ?? 'did something new';
  switch (u.state) {
    case 'running':
      return `They ${did} since this score. Recalculating now…`;
    case 'soon':
      return `They ${did} since this score. It will be recalculated within about 5 minutes.`;
    case 'tomorrow':
      return `They ${did} since this score. It will be recalculated tomorrow (today's scoring limit is used up).`;
    default:
      return null;
  }
}

/** Signals shown before "view all" — the design's two strongest. */
const SIGNALS_PREVIEW = 2;

/** Ring and bar colours, by component position (always three). Matches the design's teal → blue → ink. */
const COMPONENT_COLORS = ['#0f7a6c', '#0b5bd3', '#0f172a'];

/** How long after a reply the design's "follow up within 24h" still applies. */
const FOLLOW_UP_WINDOW_MS = 24 * 60 * 60 * 1000;

const RING_RADIUS = 50;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** Space between ring segments, in the same units as the circumference. */
const RING_GAP = 3;

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/**
 * A signal's badge: what the prospect did with the email that signal opened, the email named
 * by its place in the sequence ("Clicked in Email 2"). Before anything happens it says so
 * plainly ("Email 2 not opened yet"), so it never reads as an open that didn't happen.
 */
const USED_IN_LABEL: Record<NonNullable<IProspectSignal['usedIn']>['outcome'], (n: number) => string> = {
  sent: (n) => `Email ${n} not opened yet`,
  opened: (n) => `Opened Email ${n}`,
  clicked: (n) => `Clicked in Email ${n}`,
  replied: (n) => `Replied to Email ${n}`,
};

/** The winner's name when Insights picked an angle outside its candidates (nothing cleared its floor). */
const ANGLE_LABEL: Record<OpenerAngle, string> = {
  local: 'Their city',
  personal: 'Their LinkedIn post',
  business: 'Company news',
  pain_point: 'A problem they mentioned',
  lead_magnet: 'A guide that fits their role',
};

const OPENER_OUTCOME: Record<NonNullable<IProspectInsights['openerSelection']>['outcome'], string> = {
  pending: ' — not sent yet.',
  sent: ' — sent, waiting to hear back.',
  opened: ' — opened, no reply yet.',
  replied: ' — and it worked.',
  no_response: ' — no reply yet.',
};

interface IRingSegment {
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface IScoreBar {
  label: string;
  points: number;
  maxPoints: number;
  pct: number;
  color: string;
}

interface IOpenerBar {
  label: string;
  score: number;
  isWinner: boolean;
}

type EmailTone = 'good' | 'warn' | 'bad' | 'mute';

/**
 * One wording per stored email status, used by the header pill and the tag beside the
 * address in Contact — so the two can never disagree.
 */
interface IEmailStatusView {
  tone: EmailTone;
  pill: string;
  tag: string;
}

const EMAIL_STATUS: Record<string, IEmailStatusView> = {
  verified: {
    tone: 'good',
    pill: '✓ Email validated',
    tag: '✓ validated',
  },
  'catch-all': {
    tone: 'warn',
    pill: '⚠ Catch-all email',
    tag: 'catch-all — can’t be fully validated',
  },
  invalid: {
    tone: 'bad',
    pill: '✕ Invalid email',
    tag: 'invalid',
  },
};

/** Unverified, unavailable, never checked — anything that is not a verdict. */
const EMAIL_NOT_VALIDATED: IEmailStatusView = {
  tone: 'mute',
  pill: 'Email not validated',
  tag: 'not validated',
};

interface ITimelineView extends IProspectTimelineEvent {
  /** Rescores only: which way the score went, for the badge colour. */
  scoreMove: 'up' | 'down' | 'same' | null;
  /** Leaves the year off the date — it's only noise for this year. */
  thisYear: boolean;
}

interface ISignalView extends IProspectSignal {
  usedInLabel: string | null;
}

/**
 * One prospect's profile: who they are, how strong a lead they are, and the research
 * behind the email they got.
 *
 * ── A drawer stacked on a drawer ────────────────────────────────────────────
 * Opened from "View" in the Prospects list of a drip email's Insights drawer
 * (`email-send-progress.openProfile`), ON TOP of that drawer rather than replacing it:
 * closing this one leaves you where you were in the list. The stacking (z-index, width,
 * scroll lock) is set up by the opener — see there.
 *
 * ── Four sources ────────────────────────────────────────────────────────────
 * - The header and Contact card are REAL: the list row that was clicked, handed in as
 *   `prospect` — name, company, send status, and `profile` (title, location, LinkedIn,
 *   phone, email status) from the prospect's stored details.
 * - "Why we chose this lead" and "How we picked the opening topic": the insights API,
 *   mocked until KexyApi ships it (`ProspectProfileService`).
 * - "What happened so far" AND Lead strength: the timeline API, one request. The score it
 *   returns is the real Score API's answer — the newest of the score lines the timeline
 *   narrates, so the card and the "Scored/Rescored" lines agree. Opening the page may make
 *   KexyApi rescore (new clicks/replies) or retry a failed score; while that runs the card
 *   shows a loader and the page polls (`poll=true`, which never starts another call), then
 *   renders the score in place. KexyApi refuses the page (403) until the prospect opened an
 *   email — the "View" button is gated on that, so it only shows if the two disagree.
 * The two requests load independently so a slow or failed one never blanks the other's cards.
 *
 * ── Everything derived is a FIELD ───────────────────────────────────────────
 * Same rule as the drawer: computed once per response, not by getters on every
 * change-detection pass.
 */
@Component({
  selector: 'prospect-profile-content',
  imports: [CommonModule],
  templateUrl: './prospect-profile-content.component.html',
  styleUrl: './prospect-profile-content.component.scss',
})
export class ProspectProfileContentComponent implements OnInit, OnDestroy {
  // Set on the offcanvas `componentInstance` by the opener, before the first render.
  @Input() campaignId = 0;
  /** 1-based position of the email whose Insights this was opened from. */
  @Input() emailSequence: number | null = null;
  /** The campaign un-enrolls on reply and cancels queued emails (its "un-enroll if reply" setting). */
  @Input() stopsOnReply = true;
  @Input() prospect!: IEmailSendItem;

  readonly isMock = PROSPECT_PROFILE_USE_MOCK;
  readonly signalsPreview = SIGNALS_PREVIEW;
  readonly ringRadius = RING_RADIUS;
  readonly ringCircumference = RING_CIRCUMFERENCE;

  email = '';
  score: IProspectScore | null = null;
  insights: IProspectInsights | null = null;
  /** "What happened so far", oldest first. */
  timeline: ITimelineView[] = [];
  scoreState: LoadState = 'loading';
  /** Where the score stands (KexyApi's `scoreStatus`); set once the timeline loaded. */
  scoreStatus: ProspectScoreStatus | null = null;
  /** Why a due score wasn't made, e.g. "Not rescored: campaign is paused." Shown as-is. */
  scoreNote: string | null = null;
  /** Shown under a score that newer activity is replacing; null when the score is current. */
  scoreUpdateText: string | null = null;
  scoreUpdateRunning = false;
  insightsState: LoadState = 'loading';
  timelineState: LoadState = 'loading';

  // ── Derived: header ─────────────────────────────────────────────────────
  displayName = '';
  /** Two-letter avatar initials, same rule as the contacts table (`getContactInitials`). */
  initials = '';
  /** One of 6 gradients (`av-0`..`av-5`), same rule as the contacts table (`getAvatarClass`). */
  avatarClass = '';
  jobTitle = '';
  company = '';
  location = '';
  sendPill: { label: string; tone: Tone; at: string | null } | null = null;
  emailStatus: IEmailStatusView = EMAIL_NOT_VALIDATED;
  /** Set only when the prospect replied to THIS email — drives the pill and the Lead strength box. */
  /** Header pill — only when they replied to THIS email. */
  replyPill: { label: string; urgent: boolean } | null = null;
  /** Box under Lead strength — always says where this email stands with them. */
  replyBox: { tone: 'urgent' | 'positive' | 'neutral'; title: string; message: string } | null = null;
  /** "opened" / "clicked" beside the send status; empty once they replied (the reply pill says more). */
  sendEngagement = '';
  phone = '';
  phoneSource = '';
  companyAddress = '';
  maskedPhone = '';

  // ── Derived: score ──────────────────────────────────────────────────────
  ringSegments: IRingSegment[] = [];
  scoreBars: IScoreBar[] = [];

  // ── Derived: insights ───────────────────────────────────────────────────
  signals: ISignalView[] = [];
  showAllSignals = false;
  openerIntro = '';
  openerWinner = '';
  openerOutcome = '';
  openerBars: IOpenerBar[] = [];
  showPhone = false;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private prospectProfileService: ProspectProfileService,
  ) {}

  private destroyed = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.email = this.prospect.email;
    this.__recomputeProfile();
    this.loadInsights();
    this.loadTimeline();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.__stopPolling();
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  loadInsights = async (): Promise<void> => {
    this.insightsState = 'loading';
    try {
      this.insights = await this.prospectProfileService.getInsights(this.campaignId, this.email);
      this.__recomputeInsights();
      this.insightsState = 'ready';
    } catch (e: any) {
      // Like the timeline, KexyApi refuses it (403) until the prospect has opened an email.
      this.insightsState = e?.statusCode === 403 || e?.status === 403 ? 'locked' : 'error';
    }
  };

  /**
   * Feeds both "What happened so far" and Lead strength. `poll` = refreshing itself while
   * the score is `scoring`: it keeps what is on screen until the new answer arrives, and
   * never makes KexyApi start a call.
   */
  loadTimeline = async (poll = false): Promise<void> => {
    this.__stopPolling();
    if (!poll) {
      this.timelineState = 'loading';
      this.scoreState = 'loading';
    }
    try {
      const res = await this.prospectProfileService.getTimeline(this.campaignId, this.email, poll);
      if (this.destroyed) return;
      // KexyApi already sends them oldest first; sorted again (stable) so the order is
      // guaranteed by time here too, never by how the list happened to be built.
      this.timeline = res.events
        .map((e) => ({
          ...e,
          scoreMove: this.__scoreMove(e),
          thisYear: new Date(e.at).getFullYear() === new Date().getFullYear(),
        }))
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
      this.score = res.score ?? null;
      this.scoreStatus = res.scoreStatus ?? (res.score ? 'scored' : 'not_scored');
      this.scoreNote = res.scoreNote ?? null;
      this.scoreUpdateText = scoreUpdateText(res.scoreUpdate);
      this.scoreUpdateRunning = res.scoreUpdate?.state === 'running';
      if (this.score) this.__recomputeScore();
      this.timelineState = 'ready';
      this.scoreState = 'ready';
      // A rescore that is due soon is re-checked like a first score, so the new one replaces
      // the old in place without a reload.
      if (this.scoreStatus === 'scoring') this.__schedulePoll();
      else if (this.scoreStatus === 'due' || res.scoreUpdate?.state === 'soon') {
        this.__schedulePoll(SCORE_DUE_POLL_MS);
      }
    } catch (e: any) {
      if (this.destroyed) return;
      if (e?.statusCode === 403 || e?.status === 403) {
        this.timelineState = 'locked';
        this.scoreState = 'locked';
        return;
      }
      // A failed poll leaves the loader up and tries again; a failed load shows the error.
      if (poll) {
        this.__schedulePoll();
        return;
      }
      this.timelineState = 'error';
      this.scoreState = 'error';
    }
  };

  private __schedulePoll(ms = SCORE_POLL_MS): void {
    this.pollTimer = setTimeout(() => this.loadTimeline(true), ms);
  }

  private __stopPolling(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  // ── Template actions ────────────────────────────────────────────────────
  toggleSignals = (): void => {
    this.showAllSignals = !this.showAllSignals;
  };

  togglePhone = (): void => {
    this.showPhone = !this.showPhone;
  };

  // ── Derived state ───────────────────────────────────────────────────────
  /** Everything from the row itself — set once, it does not wait on either API. */
  private __recomputeProfile(): void {
    const item = this.prospect;
    // A list served before KexyApi returned `profile` has none; the header just thins out.
    const p = item.profile ?? ({} as Partial<IEmailSendProfile>);

    this.displayName = item.name || this.email;
    this.initials = this.__initialsFor(item.name, this.email);
    this.avatarClass = this.__avatarClassFor(item.name || this.email);
    this.jobTitle = p.jobTitle || '';
    this.company = item.company || '';
    this.location = [p.city, p.state, p.country].filter(Boolean).join(', ');

    const meta = STATUS_META[item.status];
    this.sendPill = meta
      ? {
          label: meta.label,
          tone: meta.tone,
          at: item.status === 'sent' ? item.sentAt : item.status === 'failed' ? item.failedAt : null,
        }
      : null;

    const e = item.engagement;
    this.__recomputeReply(item);
    this.sendEngagement = e?.repliedAt ? '' : e?.clickedAt ? 'clicked' : e?.openedAt ? 'opened' : '';

    this.emailStatus = EMAIL_STATUS[p.emailStatus ?? ''] ?? EMAIL_NOT_VALIDATED;

    this.phone = p.phone || '';
    this.phoneSource = p.phoneSource || '';
    this.companyAddress = p.companyAddress || '';
    this.maskedPhone = this.__maskPhone(this.phone);
  }

  /**
   * From KEXY's own reply tracking for this one email — a reply to a different email in
   * the sequence never counts. What happens to the rest of the sequence depends on the
   * campaign's "un-enroll if reply" setting (`stopsOnReply`): on, KexyApi un-enrolls them
   * and cancels anything already queued; off, the later emails still go out.
   */
  private __recomputeReply(item: IEmailSendItem): void {
    const e = item.engagement;
    const email = this.emailSequence ? `Email ${this.emailSequence}` : 'this email';
    const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    if (e?.repliedAt) {
      const urgent = Date.now() - new Date(e.repliedAt).getTime() < FOLLOW_UP_WINDOW_MS;
      const when = day(e.repliedAt);
      this.replyPill = {
        label: urgent ? `Replied to ${email} — follow up within 24h` : `Replied to ${email} · ${when}`,
        urgent,
      };
      const rest = this.stopsOnReply
        ? 'Their remaining emails in this sequence were cancelled.'
        : 'Later emails in this sequence still go out — “un-enroll if they reply” is off for this campaign.';
      this.replyBox = {
        tone: urgent ? 'urgent' : 'positive',
        title: `Replied to ${email} on ${when}.`,
        message: urgent ? `Reach out personally within 24 hours. ${rest}` : rest,
      };
      return;
    }

    this.replyPill = null;
    if (item.status === 'sent') {
      const seen = e?.clickedAt
        ? `They clicked a link in it on ${day(e.clickedAt)}.`
        : e?.openedAt
          ? `They opened it on ${day(e.openedAt)}.`
          : 'No open recorded yet either.';
      this.replyBox = { tone: 'neutral', title: 'No reply yet.', message: `The prospect hasn't replied to ${email}. ${seen}` };
    } else if (item.errorCode === 'replied') {
      this.replyBox = {
        tone: 'neutral',
        title: 'Cancelled.',
        message: `They replied to an earlier email in this campaign, so ${email} was cancelled for them.`,
      };
    } else {
      const stopped = ['failed', 'skipped', 'skipped_after_failures', 'declined_by_ai'].includes(item.status);
      this.replyBox = {
        tone: 'neutral',
        title: stopped ? 'Not sent.' : 'Not sent yet.',
        message: `${email.charAt(0).toUpperCase() + email.slice(1)} ${stopped ? "wasn't" : "hasn't been"} sent to this prospect, so there's nothing to reply to.`,
      };
    }
  }

  private __recomputeScore(): void {
    const s = this.score;
    const max = s.maxScore || 1;
    const gap = s.components.filter((c) => c.points > 0).length > 1 ? RING_GAP : 0;

    let start = 0;
    this.ringSegments = [];
    s.components.forEach((c, i) => {
      const len = (c.points / max) * RING_CIRCUMFERENCE;
      if (len > 0) {
        this.ringSegments.push({
          color: COMPONENT_COLORS[i % COMPONENT_COLORS.length],
          dashArray: `${Math.max(len - gap, 0.5)} ${RING_CIRCUMFERENCE}`,
          dashOffset: -start,
        });
      }
      start += len;
    });

    this.scoreBars = s.components.map((c, i) => ({
      label: c.label,
      points: c.points,
      maxPoints: c.maxPoints,
      pct: c.maxPoints ? Math.min(100, (c.points / c.maxPoints) * 100) : 0,
      color: COMPONENT_COLORS[i % COMPONENT_COLORS.length],
    }));
  }

  private __recomputeInsights(): void {
    const ins = this.insights;

    // The contract promises highest confidence first; hold to it whatever arrives.
    this.signals = [...(ins.signals ?? [])].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)).map((sig) => ({
      ...sig,
      usedInLabel: sig.usedIn
        ? (USED_IN_LABEL[sig.usedIn.outcome] ?? USED_IN_LABEL.sent)(sig.usedIn.emailSequence)
        : null,
    }));

    const op = ins.openerSelection;
    if (op) {
      const n = op.candidates.length;
      this.openerIntro = n
        ? `We compare ${NUMBER_WORDS[n] ?? n} possible opener${n === 1 ? '' : 's'} and use the strongest.`
        : 'No opener was strong enough on its own, so we used the best one we had.';
      this.openerWinner = op.candidates.find((c) => c.key === op.winnerKey)?.label || ANGLE_LABEL[op.winnerKey] || '';
      this.openerOutcome = OPENER_OUTCOME[op.outcome] ?? '';
      this.openerBars = op.candidates.map((c) => ({
        label: c.label,
        score: Math.max(0, Math.min(100, c.score)),
        isWinner: c.key === op.winnerKey,
      }));
    }
  }

  private __scoreMove(e: IProspectTimelineEvent): ITimelineView['scoreMove'] {
    if (e.kind !== 'rescored' || !e.score || e.score.from == null) return null;
    return e.score.to > e.score.from ? 'up' : e.score.to < e.score.from ? 'down' : 'same';
  }

  /** Same rule as the contacts table's `getContactInitials`, minus its per-row memoization. */
  private __initialsFor(name: string | null, email: string): string {
    const trimmed = (name || '').trim();
    if (trimmed) {
      const parts = trimmed.split(/\s+/).filter(Boolean);
      return (parts.length >= 2 ? parts[0][0] + parts[1][0] : trimmed.substring(0, 2)).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : '?';
  }

  /** Same rule as the contacts table's `getAvatarClass`: one of 6 gradients, by name/email hash. */
  private __avatarClassFor(seed: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 6;
    return 'av-' + h;
  }

  /**
   * Keeps the country and area code, hides the rest: "+1 (918) 555-0142" →
   * "+1 (918) •••-••••". The number is one click away (`togglePhone`); the mask is so it
   * isn't read over a shoulder, not a secret.
   */
  private __maskPhone(phone: string | null): string {
    if (!phone) return '';
    const digits = (phone.match(/\d/g) || []).length;
    let keep = Math.max(0, digits - 7);
    return phone.replace(/\d/g, (d) => (keep-- > 0 ? d : '•'));
  }
}
