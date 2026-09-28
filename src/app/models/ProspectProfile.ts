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

export type ProspectSignalKind =
  | 'linkedin_share'
  | 'linkedin_post'
  | 'city'
  | 'company_news'
  | 'pain_point'
  | 'lead_magnet'
  | 'other';

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
    tone: 'replied' | 'positive' | 'neutral' | 'warning';
    title: string;
    message: string;
    nextStep: string | null;
  } | null;
  /** At most 10, sorted by confidence, highest first. */
  signals: IProspectSignal[];
  openerSelection: {
    winnerKey: string;
    outcome: 'pending' | 'sent' | 'opened' | 'replied' | 'no_response';
    /** Sorted by score, highest first. */
    candidates: IOpenerCandidate[];
    rule: { label: string; text: string } | null;
  } | null;
  generatedAt: string;
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
  /** The starting score (on Imported) and rescores. `from` is null for the start. */
  score: { from: number | null; to: number } | null;
}

/**
 * The timeline, plus the prospect's CURRENT score in the score contract's shape — the
 * newest entry of the history the timeline narrates, so the Lead strength card and the
 * "Rescored" lines can never disagree. Loading it is what triggers a rescore server-side
 * when the prospect has done something since the last one. The score is still a mock
 * model on the server (`KexyApi/src/drip-campaigns/prospect-score.ts`).
 */
export interface IProspectTimeline {
  email: string;
  /** Oldest first — strictly by time; a rescore is dated at the action it reacted to. */
  events: IProspectTimelineEvent[];
  score: IProspectScore;
}
