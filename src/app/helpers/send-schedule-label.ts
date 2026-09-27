import { IEmailSendSchedule } from '../models/EmailSendProgress';

/**
 * The wording for when a prospect's next drip email goes out, from the `schedule` /
 * `nextSend` the API works out (KexyApi `send-schedule.ts`). Shared by the Insights
 * Prospects table, the Delay cards and the "contacts in action" list, so all three say
 * the same thing.
 *
 * Two countdowns, one after the other: until the prospect joins the send queue, then —
 * once the API reports them queued — until the email goes out. Neither restarts on its
 * own: when one runs out the label says what it is waiting for, and the next poll brings
 * the next stage.
 */
export interface IScheduleLabel {
  text: string;
  /** Shown under the text, in the viewer's own time zone. */
  at: string | null;
  title: string;
  /** `count`: a live countdown · `soon`: due, waiting on a queue/send run · `mute`: blocked. */
  tone: 'count' | 'soon' | 'mute';
}

/**
 * What to say about a prospect's next send at `now` (server-corrected ms). Never claims
 * more than the API said: without an estimate there is no countdown.
 */
export function scheduleLabel(sc: IEmailSendSchedule | null, now: number): IScheduleLabel {
  const mute = (text: string, title: string): IScheduleLabel => ({ text, at: null, title, tone: 'mute' });
  const soon = (text: string, title: string): IScheduleLabel => ({ text, at: null, title, tone: 'soon' });
  if (!sc) return mute('—', '');

  switch (sc.state) {
    case 'estimated':
      return estimatedLabel(sc, now);
    case 'queued':
      return queuedLabel(sc, now);
    case 'sending':
      return soon('Sending now', 'The email is being written and sent right now.');
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
    case 'held':
      return mute(
        'Not queued',
        'The last queue run passed over this prospect — usually because they are on the suppression list or appear twice in the campaign.',
      );
    case 'stuck':
      return mute(
        'Needs review',
        'Writing this email failed on every attempt, so it has been set aside for review and will not be sent automatically.',
      );
    case 'sending_paused':
      return mute('Sending paused', 'Sending is paused on our side and the KEXY team has been alerted. It picks up again once that is cleared.');
    default:
      return mute('—', '');
  }
}

/** Waiting on the delay and/or the send window: count down to joining the queue. */
function estimatedLabel(sc: IEmailSendSchedule, now: number): IScheduleLabel {
  const queueAt = parse(sc.queueAt);
  const earliest = parse(sc.earliestSendAt);
  const waitsForWindow =
    sc.dueAt && earliest !== null && Date.parse(sc.dueAt) < earliest - 60_000
      ? ' The delay has already run out; it is waiting for the send window to open.'
      : '';

  if (queueAt !== null) {
    if (now < queueAt) {
      return {
        text: `Queues in ${formatDuration(queueAt - now)}`,
        at: sc.queueAt as string,
        title: `Joins the send queue at this time, then goes out on the next send run.${waitsForWindow}`,
        tone: 'count',
      };
    }
    return {
      text: 'Joining queue…',
      at: null,
      title: 'The queue run is picking this prospect up now; the send countdown starts once they are in the queue.',
      tone: 'soon',
    };
  }

  // The queue run's schedule is not known (it has not ticked lately): only the moment
  // they become eligible is, and nothing is promised after it.
  if (earliest === null) return { text: '—', at: null, title: '', tone: 'mute' };
  if (now < earliest) {
    return {
      text: `Due in ${formatDuration(earliest - now)}`,
      at: sc.earliestSendAt,
      title: `Can join the send queue from this time.${waitsForWindow}`,
      tone: 'count',
    };
  }
  return {
    text: 'Waiting for queue run',
    at: null,
    title: 'Due now. The queue run has not run recently, so there is no time to count down to.',
    tone: 'soon',
  };
}

/** In the send queue: count down to the send run reaching them. */
function queuedLabel(sc: IEmailSendSchedule, now: number): IScheduleLabel {
  const sendAt = parse(sc.sendAt);
  if (sendAt === null) {
    return {
      text: 'Queued',
      at: null,
      title: 'In the send queue, waiting for the next send run. The send run has not run recently, so there is no time to count down to.',
      tone: 'soon',
    };
  }
  if (now < sendAt) {
    return {
      text: `Sends in ~${formatDuration(sendAt - now)}`,
      at: sc.sendAt as string,
      title:
        'In the send queue. Estimated from its place in line and how long each email is currently taking to write, so it can move a little either way.',
      tone: 'count',
    };
  }
  return {
    text: 'Sending shortly',
    at: null,
    title: 'In the send queue and about to go out — the emails ahead of it are taking a little longer than usual to write.',
    tone: 'soon',
  };
}

/**
 * The moment this schedule next changes stage, for ordering (the soonest on a Delay card)
 * and for knowing when to poll again. `sending` is 0 (it is already happening); blocked
 * states are null.
 */
export function scheduleEventAt(sc: IEmailSendSchedule | null): number | null {
  if (!sc) return null;
  switch (sc.state) {
    case 'sending':
      return 0;
    case 'queued':
      return parse(sc.sendAt) ?? 1;
    case 'estimated':
      return parse(sc.queueAt) ?? parse(sc.earliestSendAt);
    default:
      return null;
  }
}

/**
 * When to ask the API again for these schedules: just after the soonest one is due to
 * change stage, every `activeMs` while any is moving (queued, being sent, or past its
 * countdown and waiting on a run), otherwise `idleMs` — never sooner than `minMs`. `now`
 * is server-corrected.
 */
export function schedulePollDelay(
  schedules: (IEmailSendSchedule | null | undefined)[],
  now: number,
  { idleMs = 30_000, activeMs = 10_000, minMs = 3_000, settleMs = 1_500 } = {},
): number {
  let delay = idleMs;
  for (const sc of schedules) {
    const at = scheduleEventAt(sc ?? null);
    if (at === null) continue;
    const moving = sc.state !== 'estimated' || at <= now;
    delay = Math.min(delay, moving ? activeMs : at - now + settleMs);
  }
  return Math.max(delay, minMs);
}

function parse(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
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
