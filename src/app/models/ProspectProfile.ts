/**
 * The APIs behind the prospect profile page. These interfaces mirror the JSON Schemas
 * in `docs/prospect-profile-api/` — that folder is the contract handed to the backend, so
 * change the schema first and these to match, never the other way round.
 */

// ── GET drip-campaigns/:campaignId/prospects/score?email= ────────────────────

export interface IProspectScoreComponent {
  key: string;
  /** "Tier N". 0, 1, 2… in display order. */
  tier: number;
  label: string;
  points: number;
  maxPoints: number;
}

/** The score only. Whether they replied/opened is the portal's own tracking (`IEmailSendItem.engagement`). */
export interface IProspectScore {
  email: string;
  /** Sum of `components[].points`. */
  score: number;
  /** Sum of `components[].maxPoints`. */
  maxScore: number;
  band: 'strong' | 'good' | 'fair' | 'weak';
  /** e.g. "Strong — he replied". */
  headline: string;
  /** The tier the prospect has reached; one of `components[].tier`. */
  stage: number;
  /** Always exactly three (tiers 0, 1, 2), in display order; each is a bar AND a segment of the score ring. */
  components: IProspectScoreComponent[];
  scoredAt: string;
}

// ── GET drip-campaigns/:campaignId/prospects/insights?email= ─────────────────

/**
 * What kind of fact a signal is, as the Insights API labels it: `linkedin_share`,
 * `linkedin_post`, `city`, `company_news`, `pain_point`, `lead_magnet` or `other`. Any string
 * is accepted so a new value never breaks the page; the page shows `title`, never this.
 */
export type ProspectSignalKind = string;

/** The opening angles Insights picks between (`openerSelection.winnerKey`). */
export type OpenerAngle = 'local' | 'personal' | 'business' | 'pain_point' | 'lead_magnet';

export interface IProspectSignal {
  id: string;
  kind: ProspectSignalKind;
  title: string;
  timing: string | null;
  /** Verbatim, without quote marks. */
  quote: string;
  source: { platform: string; attribution: string | null; url: string | null };
  usedIn: { emailSequence: number; outcome: 'sent' | 'opened' | 'clicked' | 'replied' } | null;
  reason: { label: string; text: string };
  /** 0–1. The list arrives sorted by this, highest first. */
  confidence: number;
}

export interface IOpenerCandidate {
  key: string;
  label: string;
  /** 0–100. */
  score: number;
}

/** The prospect's own details (title, location, contact) are NOT here — they come with the send-progress row (`IEmailSendItem.profile`). */
export interface IProspectInsights {
  email: string;
  callout: {
    /** Known tones get their own colour; any other is shown neutral. */
    tone: 'replied' | 'positive' | 'neutral' | 'warning' | string;
    title: string;
    message: string;
    nextStep: string | null;
  } | null;
  /** At most 10, sorted by confidence, highest first. */
  signals: IProspectSignal[];
  openerSelection: {
    winnerKey: OpenerAngle;
    /** From KexyApi's own tracking of the email the opener was used in, never from the AI. */
    outcome: 'pending' | 'sent' | 'opened' | 'replied' | 'no_response';
    /** The `signals[].id` behind the winning angle; null for answers from before Insights named it. */
    signalId: string | null;
    /** Sorted by score, highest first. Usually holds the winner, but not always (it can be empty). */
    candidates: IOpenerCandidate[];
    rule: { label: string; text: string } | null;
  } | null;
  /** When the answer was produced; null when there is no answer yet (every section empty). */
  generatedAt: string | null;
}

// ── GET drip-campaigns/:campaignId/prospects/timeline?email= ─────────────────

/** `imported` = the contact coming in and being added to the drip — one step, always first. */
export type ProspectTimelineKind = 'imported' | 'sent' | 'opened' | 'replied' | 'clicked' | 'rescored';

/** One entry of "What happened so far". Worded by KexyApi; the portal shows it as-is. */
export interface IProspectTimelineEvent {
  at: string;
  kind: ProspectTimelineKind;
  title: string;
  detail: string | null;
  /** The campaign email it is about (sent / opened / replied / clicked); null otherwise. */
  emailSequence: number | null;
  /** Score lines ("Scored." / "Rescored."). `from` is null for the first score. */
  score: { from: number | null; to: number } | null;
}

/**
 * Where the prospect's score stands:
 * - `scored`: `score` is set;
 * - `scoring`: a Score API call is queued or running — show a loader and poll;
 * - `due`: no score yet, and the next 5-minute scoring run will start one — say it is coming;
 * - `unavailable`: every call failed and none is coming;
 * - `not_scored`: nothing to show yet (see `scoreNote`).
 */
export type ProspectScoreStatus = 'scored' | 'scoring' | 'due' | 'unavailable' | 'not_scored';

/**
 * The timeline, plus the prospect's CURRENT score — the real Score API's answer as KexyApi
 * stored it, the newest of the score lines the timeline narrates, so the Lead strength card
 * and the "Scored/Rescored" lines can never disagree. Reads only — the Score API is called by
 * KexyApi's 5-minute run, never by this page. 403 until the prospect has opened an email.
 */
export interface IProspectTimeline {
  email: string;
  /** Oldest first — strictly by time; a score line is dated at what triggered it. */
  events: IProspectTimelineEvent[];
  /** Null unless `scoreStatus` is `scored`. */
  score: IProspectScore | null;
  scoreStatus: ProspectScoreStatus;
  /** Why a due score was not made, e.g. "Not rescored: campaign is paused." Shown as-is. */
  scoreNote: string | null;
}
