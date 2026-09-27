import { IEmailSendSchedule } from '../models/EmailSendProgress';
import { scheduleEventAt, scheduleLabel as label, schedulePollDelay } from './send-schedule-label';

/** The next-send wording shared by Insights, the Delay cards and the contacts list. */
describe('scheduleLabel', () => {
  const queueAt = Date.parse('2026-09-28T16:01:30Z');
  const base: IEmailSendSchedule = {
    state: 'estimated',
    dueAt: '2026-09-28T16:00:00Z',
    earliestSendAt: '2026-09-28T16:00:00Z',
    latestSendAt: '2026-09-28T16:07:00Z',
    queueAt: '2026-09-28T16:01:30Z',
    sendAt: null,
    earlierEmailSequence: null,
  };
  const queued: IEmailSendSchedule = { ...base, state: 'queued', queueAt: null, sendAt: '2026-09-28T16:05:00Z' };
  const sendAt = Date.parse(queued.sendAt as string);

  it('counts down to joining the send queue', () => {
    const l = label(base, queueAt - (2 * 3600 + 5 * 60) * 1000);
    expect(l.text).toBe('Queues in 2h 05m');
    expect(l.at).toBe(base.queueAt as string);
    expect(l.tone).toBe('count');
  });

  it('shows minutes and seconds inside the last hour, days further out', () => {
    expect(label(base, queueAt - 125_000).text).toBe('Queues in 2m 05s');
    expect(label(base, queueAt - (3 * 86400 + 4 * 3600) * 1000).text).toBe('Queues in 3d 4h');
  });

  it('waits for the queue run once that countdown runs out, without restarting it', () => {
    const l = label(base, queueAt + 20_000);
    expect(l.text).toBe('Joining queue…');
    expect(l.tone).toBe('soon');
  });

  it('then counts down to the send once queued', () => {
    const l = label(queued, sendAt - 220_000);
    expect(l.text).toBe('Sends in ~3m 40s');
    expect(l.at).toBe(queued.sendAt as string);
    expect(label(queued, sendAt + 5_000).text).toBe('Sending shortly');
    expect(label({ ...queued, state: 'sending', sendAt: null }, sendAt).text).toBe('Sending now');
  });

  it('promises no time when the queue or send run schedule is unknown', () => {
    const noQueueRun = { ...base, queueAt: null };
    const earliest = Date.parse(base.earliestSendAt as string);
    expect(label(noQueueRun, earliest - 60_000).text).toBe('Due in 1m 00s');
    expect(label(noQueueRun, earliest + 60_000).text).toBe('Waiting for queue run');
    expect(label({ ...queued, sendAt: null }, 0).text).toBe('Queued');
  });

  it('says what it waits for when there is no estimate', () => {
    const blocked = { ...base, earliestSendAt: null, latestSendAt: null, dueAt: null, queueAt: null };
    expect(label({ ...blocked, state: 'earlier_email', earlierEmailSequence: 2 }, 0).text).toBe('After Email #2');
    expect(label({ ...blocked, state: 'research' }, 0).text).toBe('After research');
    expect(label({ ...blocked, state: 'no_window' }, 0).text).toBe('Window closed');
    expect(label({ ...blocked, state: 'held' }, 0).text).toBe('Not queued');
    expect(label({ ...blocked, state: 'stuck' }, 0).text).toBe('Needs review');
    expect(label({ ...blocked, state: 'sending_paused' }, 0).text).toBe('Sending paused');
    expect(label({ ...blocked, state: 'unknown' }, 0).text).toBe('—');
    expect(label(null, 0).text).toBe('—');
  });
});

describe('scheduleEventAt', () => {
  it('orders sending before queued before waiting, and ignores blocked states', () => {
    const est: IEmailSendSchedule = {
      state: 'estimated',
      dueAt: null,
      earliestSendAt: '2026-09-28T16:00:00Z',
      latestSendAt: null,
      queueAt: '2026-09-28T16:01:30Z',
      sendAt: null,
      earlierEmailSequence: null,
    };
    expect(scheduleEventAt({ ...est, state: 'sending' })).toBe(0);
    expect(scheduleEventAt({ ...est, state: 'queued', sendAt: '2026-09-28T16:05:00Z' })).toBe(
      Date.parse('2026-09-28T16:05:00Z'),
    );
    expect(scheduleEventAt(est)).toBe(Date.parse('2026-09-28T16:01:30Z'));
    expect(scheduleEventAt({ ...est, queueAt: null })).toBe(Date.parse('2026-09-28T16:00:00Z'));
    expect(scheduleEventAt({ ...est, state: 'held' })).toBeNull();
  });
});

describe('schedulePollDelay', () => {
  const now = Date.parse('2026-09-28T16:00:00Z');
  const waiting = (ms: number): IEmailSendSchedule => ({
    state: 'estimated',
    dueAt: null,
    earliestSendAt: null,
    latestSendAt: null,
    queueAt: new Date(now + ms).toISOString(),
    sendAt: null,
    earlierEmailSequence: null,
  });

  it('looks just after the soonest stage change, else every 30s', () => {
    expect(schedulePollDelay([waiting(12_000), waiting(60_000)], now)).toBe(13_500);
    expect(schedulePollDelay([waiting(3_600_000)], now)).toBe(30_000);
    expect(schedulePollDelay([null, { ...waiting(0), state: 'held', queueAt: null }], now)).toBe(30_000);
  });

  it('looks every 10s while anything is queued, sending or overdue, never under 3s', () => {
    expect(schedulePollDelay([{ ...waiting(0), state: 'queued', queueAt: null, sendAt: null }], now)).toBe(10_000);
    expect(schedulePollDelay([waiting(-5_000)], now)).toBe(10_000);
    expect(schedulePollDelay([waiting(500)], now)).toBe(3_000);
  });
});
