/**
 * Where one prospect is for ONE email in a drip sequence, as reported by
 * `GET drip-campaigns/:id/emails/:emailId/send-progress`.
 *
 * `scheduled` is the absence of a send record — the prospect's turn has not come yet —
 * so it only ever appears here, never in the API's own status enum.
 */
export type EmailSendStatus =
  | 'scheduled'
  | 'queued'
  | 'generating'
  | 'generated'
  | 'sending'
  | 'sent'
  | 'failed'
  /** This attempt failed; the sweep may try again. */
  | 'skipped_after_failures'
  /** Attempts exhausted. Terminal — nothing will retry this prospect for this email. */
  | 'declined_by_ai'
  | 'skipped';

/**
 * What a progress list can be narrowed to. `in_progress` groups
 * generating/generated/sending; `stopped` groups the two terminal failures, which need
 * the user's attention in a way a retrying `failed` does not.
 */
export type EmailSendFilter =
  | 'all'
  | 'scheduled'
  | 'queued'
  | 'in_progress'
  | 'sent'
  | 'failed'
  | 'stopped'
  | 'skipped';

export interface IEmailSendSummary {
  totalProspects: number;
  scheduled: number;
  queued: number;
  generating: number;
  generated: number;
  sending: number;
  sent: number;
  failed: number;
  skipped: number;
  /** Attempts exhausted — terminal, will not be retried. */
  skippedAfterFailures: number;
  /** The AI refused this prospect — terminal, will not be retried. */
  declinedByAi: number;
  /** True while the send sweep is actively working on at least one prospect. */
  inFlight: boolean;
  /** Generation attempts a queue row gets before it is parked (for "attempt 1/2"). */
  maxAttempts: number;
  /** A reply un-enrolls the prospect and cancels their queued emails (campaign setting, on by default). */
  stopsOnReply: boolean;
}

/** Who the prospect is, from the details stored when they were enrolled. Any field may be null. */
export interface IEmailSendProfile {
  jobTitle: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  /** Only a real `/in/…` profile URL. */
  linkedinUrl: string | null;
  phone: string | null;
  /** Whose number it is, e.g. "Company HQ line" — most are not personal. */
  phoneSource: string | null;
  /** `verified`, `invalid`, `catch-all`, `unavailable`, … as stored; null when never checked. */
  emailStatus: string | null;
  /** Where their COMPANY is — full address when stored, else city/state/country. */
  companyAddress: string | null;
}

/**
 * What the prospect did with THIS email — first open, click and reply. A reply to a
 * different email in the sequence never shows up here.
 */
export interface IEmailSendEngagement {
  openedAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
}

export interface IEmailSendItem {
  /** Set for rows written by the send log. Identifies the content to load. */
  logId: number | null;
  /** Set for a send from before the send log existed; content is read from its conversation. */
  conversationId: number | null;
  email: string;
  name: string;
  company: string;
  status: EmailSendStatus;
  attempt: number;
  errorCode: string | null;
  errorMessage: string | null;
  /** `service` (the AI API failed) or `prospect` (it could not write to this person). */
  errorClass: string | null;
  /** True when this prospect will never be retried for this email. */
  terminal: boolean;
  aiSubject: string | null;
  sentSubject: string | null;
  hasAiContent: boolean;
  hasSentContent: boolean;
  queuedAt: string | null;
  generationStartedAt: string | null;
  generatedAt: string | null;
  sendingAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  updatedAt: string | null;
  profile: IEmailSendProfile;
  engagement: IEmailSendEngagement;
}

/**
 * True once the AI email service has failed too many times in a row and the send sweep
 * has stopped itself. Nothing else explains it — every queued prospect just sits at
 * "queued". Global, not per campaign.
 */
export interface IAiPausedState {
  paused: boolean;
  failCount: number;
  limit: number;
  since: string | null;
}

export interface IEmailSendProgress {
  summary: IEmailSendSummary;
  aiPaused: IAiPausedState;
  prospects: {
    items: IEmailSendItem[];
    page: number;
    limit: number;
    total: number;
  };
  serverTime: string;
}

/** One recorded failure of one generation attempt. */
export interface IEmailSendAttempt {
  attempt: number;
  at: string;
  errorCode: string;
  errorClass: string | null;
  message: string | null;
  httpStatus: number | null;
}

/** One prospect's generated-versus-sent content for an email. */
export interface IEmailSendDetail {
  logId: number | null;
  email: string;
  name: string;
  status: EmailSendStatus;
  attempt: number;
  errorCode: string | null;
  errorMessage: string | null;
  errorClass: string | null;
  terminal: boolean;
  /**
   * Every failed attempt for this prospect, oldest first — including attempts a later
   * success would otherwise erase, which is the only way to see that a sent email took
   * two tries and why the first one failed.
   */
  attemptHistory: IEmailSendAttempt[];
  ai: {
    subject: string | null;
    /** The unmodified AI stream (`^^subject$$body[[PARA]]…`). */
    raw: string | null;
    /** The AI body after formatting, before placeholders/tracking. Already display-safe. */
    formatted: string | null;
  };
  sent: {
    subject: string | null;
    /** Exactly what went to the prospect, made display-safe by the server. */
    html: string | null;
  };
  conversationId: number | null;
  queuedAt: string | null;
  generationStartedAt: string | null;
  generatedAt: string | null;
  sendingAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  updatedAt: string | null;
}
