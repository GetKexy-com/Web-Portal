/**
 * Whether KEXY reads a sending account's inbox for replies that skipped its Reply-To
 * (KexyApi `ReplyDetectionService`, `docs/reply-detection-plan.md`).
 * - `on`: checked every few minutes.
 * - `not_connected`: no inbox reachable with the sending login (e.g. Amazon SES); the user can
 *   enter their inbox's details.
 * - `problem`: stopped after repeated failures; Reconnect tries again.
 * - `not_checked`: not tried yet (it is tried within a few minutes of saving).
 */
export type ReplyDetectionStatus = 'on' | 'not_connected' | 'problem' | 'not_checked';

export interface IReplyDetection {
  smtpId: number;
  status: ReplyDetectionStatus;
  imapHost: string | null;
  usesSeparateLogin: boolean;
  lastCheckedAt: string | null;
  lastError: string | null;
  /** The account sends through a service with no inbox (SES, Brevo…). */
  sendingOnly: boolean;
}
