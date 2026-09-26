import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';

import { STATUS_META, Tone } from '../../helpers/email-send-status';
import { IEmailSendItem, IEmailSendProfile } from '../../models/EmailSendProgress';
import {
  IProspectInsights,
  IProspectScore,
  IProspectSignal,
} from '../../models/ProspectProfile';
import { PROSPECT_PROFILE_USE_MOCK, ProspectProfileService } from '../../services/prospect-profile.service';

type LoadState = 'loading' | 'ready' | 'error';

/** Signals shown before "view all" — the design's two strongest. */
const SIGNALS_PREVIEW = 2;

/** Ring and bar colours, by component position. Matches the design's teal → blue → ink. */
const COMPONENT_COLORS = ['#0f7a6c', '#0b5bd3', '#0f172a', '#7c3aed', '#b45309'];

/** How long after a reply the design's "follow up within 24h" still applies. */
const FOLLOW_UP_WINDOW_MS = 24 * 60 * 60 * 1000;

const RING_RADIUS = 50;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** Space between ring segments, in the same units as the circumference. */
const RING_GAP = 3;

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const USED_IN_OUTCOME: Record<NonNullable<IProspectSignal['usedIn']>['outcome'], string> = {
  sent: '',
  opened: 'was opened',
  clicked: 'got a click',
  replied: 'got the reply',
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
 * One wording per stored email status, used by the header pill, the tag beside the
 * address in Contact and the Safety check — so the three can never disagree (a catch-all
 * address used to show nothing up top while Safety checks said "not validated").
 */
interface IEmailStatusView {
  tone: EmailTone;
  pill: string;
  tag: string;
  check: string;
  passed: boolean;
}

const EMAIL_STATUS: Record<string, IEmailStatusView> = {
  verified: {
    tone: 'good',
    pill: '✓ Email validated',
    tag: '✓ validated',
    check: 'Email validated by KEXY',
    passed: true,
  },
  'catch-all': {
    tone: 'warn',
    pill: '⚠ Catch-all email',
    tag: 'catch-all — can’t be fully validated',
    check: 'Catch-all domain — the address can’t be fully validated',
    passed: false,
  },
  invalid: {
    tone: 'bad',
    pill: '✕ Invalid email',
    tag: 'invalid',
    check: 'Email is invalid',
    passed: false,
  },
};

/** Unverified, unavailable, never checked — anything that is not a verdict. */
const EMAIL_NOT_VALIDATED: IEmailStatusView = {
  tone: 'mute',
  pill: 'Email not validated',
  tag: 'not validated',
  check: 'Email not validated yet',
  passed: false,
};

interface ISafetyCheck {
  label: string;
  passed: boolean;
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
 * ── Three sources ───────────────────────────────────────────────────────────
 * - The header, Contact card and email check are REAL: the list row that was clicked,
 *   handed in as `prospect` — name, company, send status, and `profile` (title,
 *   location, LinkedIn, phone, email status) from the prospect's stored details.
 * - Lead strength: the score API.
 * - The left column and the research checks: the insights API.
 * Both APIs are mocked until KexyApi ships them (`ProspectProfileService`), and they
 * load independently so a slow or failed one never blanks the other's cards.
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
export class ProspectProfileContentComponent implements OnInit {
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
  scoreState: LoadState = 'loading';
  insightsState: LoadState = 'loading';

  // ── Derived: header ─────────────────────────────────────────────────────
  displayName = '';
  jobTitle = '';
  company = '';
  location = '';
  linkedinUrl = '';
  linkedinLabel = '';
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
  /** The portal's own email check first, then the insights API's research checks. */
  safetyChecks: ISafetyCheck[] = [];
  showPhone = false;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private prospectProfileService: ProspectProfileService,
  ) {}

  ngOnInit(): void {
    this.email = this.prospect.email;
    this.__recomputeProfile();
    this.loadScore();
    this.loadInsights();
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  loadScore = async (): Promise<void> => {
    this.scoreState = 'loading';
    try {
      this.score = await this.prospectProfileService.getScore(this.campaignId, this.email);
      this.__recomputeScore();
      this.scoreState = 'ready';
    } catch {
      this.scoreState = 'error';
    }
  };

  loadInsights = async (): Promise<void> => {
    this.insightsState = 'loading';
    try {
      this.insights = await this.prospectProfileService.getInsights(this.campaignId, this.email);
      this.__recomputeInsights();
      this.insightsState = 'ready';
    } catch {
      this.insightsState = 'error';
    }
  };

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
    this.jobTitle = p.jobTitle || '';
    this.company = item.company || '';
    this.location = [p.city, p.state, p.country].filter(Boolean).join(', ');
    this.linkedinUrl = p.linkedinUrl || '';
    this.linkedinLabel = this.linkedinUrl.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

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
    this.__recomputeSafetyChecks();
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

  private __recomputeSafetyChecks(): void {
    const emailCheck: ISafetyCheck = { label: this.emailStatus.check, passed: this.emailStatus.passed };
    this.safetyChecks = [
      emailCheck,
      ...(this.insights?.safetyChecks ?? []).map((c) => ({ label: c.label, passed: c.passed })),
    ];
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

    this.signals = ins.signals.map((sig) => ({
      ...sig,
      usedInLabel: sig.usedIn
        ? [`Opened email ${sig.usedIn.emailSequence}`, USED_IN_OUTCOME[sig.usedIn.outcome]].filter(Boolean).join(' · ')
        : null,
    }));

    const op = ins.openerSelection;
    if (op) {
      const n = op.candidates.length;
      this.openerIntro = `We compare ${NUMBER_WORDS[n] ?? n} possible opener${n === 1 ? '' : 's'} and use the strongest.`;
      this.openerWinner = op.candidates.find((c) => c.key === op.winnerKey)?.label || '';
      this.openerOutcome = OPENER_OUTCOME[op.outcome] ?? '';
      this.openerBars = op.candidates.map((c) => ({
        label: c.label,
        score: Math.max(0, Math.min(100, c.score)),
        isWinner: c.key === op.winnerKey,
      }));
    }

    this.__recomputeSafetyChecks();
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
