import { IEmailSendSchedule } from '../models/EmailSendProgress';
import { insightsHoldExplanation } from './insights-hold';

describe('insightsHoldExplanation', () => {
  const base: IEmailSendSchedule = {
    state: 'insights_blocked',
    dueAt: null,
    earliestSendAt: null,
    latestSendAt: null,
    queueAt: null,
    sendAt: null,
    earlierEmailSequence: null,
  };

  it('blocked after two days: names the days, and says only Retry now moves it', () => {
    const e = insightsHoldExplanation(
      {
        ...base,
        insightsHold: {
          // Out of order on purpose: the popup sorts them. Midday UTC stays on that date anywhere.
          failedAt: [
            '2026-10-18T12:00:00Z',
            '2026-10-17T12:00:00Z',
            '2026-10-17T12:05:00Z',
            '2026-10-18T12:05:00Z',
            '2026-10-17T12:10:00Z',
            '2026-10-18T12:10:00Z',
          ],
          lastFailedAt: '2026-10-18T16:52:00Z',
          retriedAt: null,
          retriedBy: null,
        },
      },
      'Tre Baker',
      2,
    );
    expect(e.title).toBe('On hold');
    expect(e.paragraphs).toEqual([
      "Email #2 for Tre Baker couldn't be prepared: it failed 3 times on Oct 17 and 3 times on Oct 18.",
      "It won't retry on its own. The KEXY team has been alerted.",
    ]);
    expect(e.lastAttempt).toContain('Last attempt: Oct 18');
  });

  it('blocked after a manual retry: says who retried and how often it failed since', () => {
    const e = insightsHoldExplanation(
      {
        ...base,
        insightsHold: {
          failedAt: ['2026-10-19T12:00:00Z', '2026-10-19T12:05:00Z', '2026-10-19T12:10:00Z'],
          lastFailedAt: null,
          retriedAt: '2026-10-19T11:00:00Z',
          retriedBy: 'Scott Graham',
          lastFailureCause: 'prospect_data',
        },
      },
      'Tre Baker',
      2,
    );
    expect(e.paragraphs[0]).toMatch(/it failed 3 times after the retry by Scott Graham on Oct 19, /);
    // A plain cause, never the error text.
    expect(e.paragraphs[0]).toMatch(/\. Something in this prospect's data couldn't be processed\.$/);
    expect(e.lastAttempt).toBeNull();
  });

  it('waiting for tomorrow: says when it is tried again', () => {
    const e = insightsHoldExplanation(
      {
        ...base,
        state: 'insights_daily_limit',
        insightsHold: {
          failedAt: ['2026-10-19T12:00:00Z', '2026-10-19T12:05:00Z', '2026-10-19T12:10:00Z'],
          lastFailedAt: null,
          retriedAt: null,
          retriedBy: null,
          lastFailureCause: 'service',
        },
      },
      'Tre Baker',
      2,
    );
    expect(e.title).toBe('Waiting until tomorrow');
    expect(e.paragraphs[0]).toContain('Our service had a temporary problem.');
    expect(e.paragraphs[0]).toContain('it failed 3 times on Oct 19.');
    expect(e.paragraphs[1]).toBe(
      "It retries tomorrow, within the campaign's sending hours. The KEXY team has been alerted.",
    );
  });

  it('never shows error text, and copes with an API that sends no detail', () => {
    const e = insightsHoldExplanation(base, 'tre@example.com', null);
    expect(e.paragraphs[0]).toBe(
      "The next email for tre@example.com couldn't be prepared: it failed on two different days.",
    );
  });
});
