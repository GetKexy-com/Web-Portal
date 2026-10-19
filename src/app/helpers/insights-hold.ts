import { IEmailSendSchedule } from '../models/EmailSendProgress';

/**
 * The "On hold" / "Retries tomorrow" popup in Insights → Prospects: why picking this
 * prospect's opening (the Insights API) is held, in plain words — never the error itself —
 * built from the `insightsHold` detail the API puts on the schedule. Plain text; the caller
 * escapes it.
 */
export interface IInsightsHoldExplanation {
  title: string;
  paragraphs: string[];
  /** "Last attempt: …", shown smaller. Null when the API gave no time. */
  lastAttempt: string | null;
}

export function insightsHoldExplanation(
  sc: IEmailSendSchedule,
  who: string,
  emailSequence: number | null,
): IInsightsHoldExplanation {
  const detail = sc.insightsHold ?? null;
  const blocked = sc.state === 'insights_blocked';
  const email = emailSequence ? `Email #${emailSequence}` : 'The next email';
  const days = failuresByDay(detail?.failedAt ?? []);
  const total = days.reduce((n, d) => n + d.failures, 0);

  let what: string;
  if (detail?.retriedAt) {
    const by = detail.retriedBy ? ` by ${detail.retriedBy}` : '';
    what = `failed ${times(total)} after the retry${by} on ${formatTime(detail.retriedAt)}`;
  } else if (days.length) {
    what = `failed ${joinAnd(days.map((d) => `${times(d.failures)} on ${d.label}`))}`;
  } else {
    what = blocked ? 'failed on two different days' : 'failed 3 times today';
  }

  const cause =
    detail?.lastFailureCause === 'prospect_data'
      ? " Something in this prospect's data couldn't be processed."
      : detail?.lastFailureCause === 'service'
        ? ' Our service had a temporary problem.'
        : '';
  const paragraphs = [
    `${email} for ${who} couldn't be prepared: it ${what}.${cause}`,
    blocked
      ? "It won't retry on its own. The KEXY team has been alerted."
      : 'It retries after midnight. The KEXY team has been alerted.',
  ];

  return {
    title: blocked ? 'On hold' : 'Waiting until tomorrow',
    paragraphs,
    lastAttempt: detail?.lastFailedAt ? `Last attempt: ${formatTime(detail.lastFailedAt)}` : null,
  };
}

const times = (n: number): string => (n === 1 ? 'once' : `${n} times`);

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * Failures per day in the viewer's own zone, oldest first — the same zone as every other time
 * in the popup (the server counts its own days for the rule; mixing the two read as a mistake).
 */
function failuresByDay(failedAt: string[]): { label: string; failures: number }[] {
  const out: { key: string; label: string; failures: number; at: number }[] = [];
  for (const iso of failedAt) {
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) continue;
    const key = t.toDateString();
    const day = out.find((d) => d.key === key);
    if (day) day.failures++;
    else
      out.push({
        key,
        label: t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        failures: 1,
        at: t.getTime(),
      });
  }
  return out.sort((a, b) => a.at - b.at).map(({ label, failures }) => ({ label, failures }));
}

/** An instant in the viewer's own zone: "Oct 18, 9:52 PM". */
function formatTime(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  return t.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
