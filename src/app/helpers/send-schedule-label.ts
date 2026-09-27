import { IEmailSendSchedule } from '../models/EmailSendProgress';

/**
 * The wording for when a prospect's next drip email goes out, from the `schedule` /
 * `nextSend` the API works out (KexyApi `send-schedule.ts`). Shared by the Insights
 * Prospects table, the Delay cards and the "contacts in action" list, so all three say
 * the same thing.
 */
export interface IScheduleLabel {
  text: string;
  /** Shown under the text, in the viewer's own time zone. */
  at: string | null;
  title: string;
  /** `count`: a live countdown · `soon`: due, waiting on a send run · `mute`: blocked. */
  tone: 'count' | 'soon' | 'mute';
}

/**
 * What to say about a prospect's next send at `now` (server-corrected ms). Never claims
 * more than the API said: without an estimate there is no countdown.
 */
export function scheduleLabel(sc: IEmailSendSchedule | null, now: number): IScheduleLabel {
  const mute = (text: string, title: string): IScheduleLabel => ({ text, at: null, title, tone: 'mute' });
  if (!sc) return mute('—', '');

  switch (sc.state) {
    case 'earlier_email':
      return mute(
        `After Email #${sc.earlierEmailSequence}`,
        `This email's delay starts once Email #${sc.earlierEmailSequence} has been sent.`,
      );
    case 'research':
      return mute('After research', 'Sending starts once research has finished for this campaign.');
    case 'campaign_not_active':
      return mute('Not sending', 'The campaign is not active, so nothing is sent.');
    case 'prospect_not_active':
      return mute('Not sending', 'This prospect is paused or unsubscribed in this campaign.');
    case 'no_window':
      return mute('Window closed', 'The send window does not open in the next two weeks.');
    case 'estimated':
      break;
    default:
      return mute('—', '');
  }

  const earliest = Date.parse(sc.earliestSendAt as string);
  const latest = Date.parse(sc.latestSendAt as string);
  if (Number.isNaN(earliest)) return mute('—', '');

  const lagMin = Number.isNaN(latest) ? null : Math.round((latest - earliest) / 60_000);
  const within = lagMin ? ` It goes out on the next send run after that — usually within ${lagMin} minutes.` : '';
  const waitsForWindow =
    sc.dueAt && Date.parse(sc.dueAt) < earliest - 60_000
      ? ' The delay has already run out; it is waiting for the send window to open.'
      : '';

  if (now < earliest) {
    return {
      text: `in ${formatDuration(earliest - now)}`,
      at: sc.earliestSendAt,
      title: `Can be sent from this time.${waitsForWindow}${within}`,
      tone: 'count',
    };
  }
  if (Number.isNaN(latest) || now < latest) {
    return { text: 'Sending soon', at: null, title: `Due now — waiting for the next send run.${within}`, tone: 'soon' };
  }
  return {
    text: 'Due — any moment',
    at: null,
    title: 'Due now. The send run is taking longer than usual (it writes each email with AI), so this can lag.',
    tone: 'soon',
  };
}

/** "3d 4h" · "2h 05m" · "12m 09s" — two units, enough to see it move. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${pad(m)}m`;
  return `${m}m ${pad(sec)}s`;
}
