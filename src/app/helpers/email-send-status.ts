import { EmailSendStatus } from '../models/EmailSendProgress';

export type Tone = 'good' | 'live' | 'wait' | 'bad' | 'mute';

export interface IStatusMeta {
  label: string;
  tone: Tone;
  /** Spins while the sweep is actively working on the prospect. */
  busy: boolean;
}

/** One place that decides how each state is worded and coloured. */
export const STATUS_META: Record<EmailSendStatus, IStatusMeta> = {
  scheduled: { label: 'Scheduled', tone: 'mute', busy: false },
  queued: { label: 'Queued', tone: 'wait', busy: false },
  generating: { label: 'Generating', tone: 'live', busy: true },
  generated: { label: 'Generated', tone: 'live', busy: true },
  sending: { label: 'Sending', tone: 'live', busy: true },
  sent: { label: 'Sent', tone: 'good', busy: false },
  failed: { label: 'Failed', tone: 'bad', busy: false },
  skipped_after_failures: { label: 'Gave up', tone: 'bad', busy: false },
  declined_by_ai: { label: 'AI declined', tone: 'bad', busy: false },
  skipped: { label: 'Skipped', tone: 'mute', busy: false },
};
