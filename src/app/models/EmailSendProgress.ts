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
  | 'skipped';

/** What a progress list can be narrowed to. `in_progress` groups generating/generated/sending. */
export type EmailSendFilter = 'all' | 'scheduled' | 'queued' | 'in_progress' | 'sent' | 'failed' | 'skipped';

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
  /** True while the send sweep is actively working on at least one prospect. */
  inFlight: boolean;
  /** Generation attempts a queue row gets before it is parked (for "attempt 1/2"). */
  maxAttempts: number;
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
}

export interface IEmailSendProgress {
  summary: IEmailSendSummary;
  prospects: {
    items: IEmailSendItem[];
    page: number;
    limit: number;
    total: number;
  };
  serverTime: string;
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
