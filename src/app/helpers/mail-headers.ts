/** One header line of a sent email, unfolded. */
export interface IMailHeader {
  name: string;
  value: string;
}

/**
 * Splits a raw header block (as KexyApi kept it from the send) into name/value rows.
 * A line starting with a space or tab continues the header above it (RFC 5322 folding),
 * so a long `Content-Type` or `List-Unsubscribe` reads as one row. Values are shown as
 * sent: an encoded word (`=?UTF-8?Q?…?=`) stays encoded.
 */
export function parseMailHeaders(raw: string | null | undefined): IMailHeader[] {
  const rows: IMailHeader[] = [];
  for (const line of (raw ?? '').split(/\r?\n/)) {
    if (!line) continue;
    if (/^[ \t]/.test(line) && rows.length) {
      rows[rows.length - 1].value += ' ' + line.trim();
      continue;
    }
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    rows.push({ name: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() });
  }
  return rows;
}
