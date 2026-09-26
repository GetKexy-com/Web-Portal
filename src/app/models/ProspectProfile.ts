/**
 * The two APIs behind the prospect profile page. These interfaces mirror the JSON Schemas
 * in `docs/prospect-profile-api/` — that folder is the contract handed to the backend, so
 * change the schema first and these to match, never the other way round.
 */

// ── GET drip-campaigns/:campaignId/prospects/score?email= ────────────────────

export interface IProspectScoreComponent {
  key: string;
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
  /** Display order; each is a bar AND a segment of the score ring. */
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
  /** Sorted by confidence, highest first. */
  signals: IProspectSignal[];
  openerSelection: {
    winnerKey: string;
    outcome: 'pending' | 'sent' | 'opened' | 'replied' | 'no_response';
    /** Sorted by score, highest first. */
    candidates: IOpenerCandidate[];
    rule: { label: string; text: string } | null;
  } | null;
  /** Oldest first. */
  timeline: { at: string; title: string; detail: string | null }[];
  /** Checks on the research; the portal adds its own email-validation check in front. */
  safetyChecks: { key: string; label: string; passed: boolean }[];
  generatedAt: string;
}
