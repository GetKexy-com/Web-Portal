import { IEmailSendSchedule } from '../models/EmailSendProgress';
import { scheduleLabel as label } from './send-schedule-label';

/** The next-send wording shared by Insights, the Delay cards and the contacts list. */
describe('scheduleLabel', () => {
  const earliest = Date.parse('2026-09-28T16:00:00Z');
  const estimated: IEmailSendSchedule = {
    state: 'estimated',
    dueAt: '2026-09-28T16:00:00Z',
    earliestSendAt: '2026-09-28T16:00:00Z',
    latestSendAt: '2026-09-28T16:07:00Z',
    earlierEmailSequence: null,
  };

  it('counts down to the earliest send time', () => {
    const l = label(estimated, earliest - (2 * 3600 + 5 * 60) * 1000);
    expect(l.text).toBe('in 2h 05m');
    expect(l.at).toBe(estimated.earliestSendAt);
    expect(l.tone).toBe('count');
  });

  it('shows minutes and seconds inside the last hour, days further out', () => {
    expect(label(estimated, earliest - 125_000).text).toBe('in 2m 05s');
    expect(label(estimated, earliest - (3 * 86400 + 4 * 3600) * 1000).text).toBe('in 3d 4h');
  });

  it('says "Sending soon" between the earliest and latest send times', () => {
    const l = label(estimated, earliest + 60_000);
    expect(l.text).toBe('Sending soon');
    expect(l.tone).toBe('soon');
  });

  it('says it is due once past the latest send time', () => {
    expect(label(estimated, earliest + 8 * 60_000).text).toBe('Due — any moment');
  });

  it('says what it waits for when there is no estimate', () => {
    const blocked = { ...estimated, earliestSendAt: null, latestSendAt: null, dueAt: null };
    expect(label({ ...blocked, state: 'earlier_email', earlierEmailSequence: 2 }, 0).text).toBe('After Email #2');
    expect(label({ ...blocked, state: 'research' }, 0).text).toBe('After research');
    expect(label({ ...blocked, state: 'no_window' }, 0).text).toBe('Window closed');
    expect(label({ ...blocked, state: 'unknown' }, 0).text).toBe('—');
    expect(label(null, 0).text).toBe('—');
  });
});
