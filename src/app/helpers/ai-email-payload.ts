/**
 * Fields the portal's AI email generation payloads share with KexyApi's send payload
 * (`drip-campaigns-send-queue.service.ts`). Keep the rules in step with
 * KexyApi `super-charged.ts` and `prospect-linkedin.ts`.
 */

/**
 * One `drip_campaign_settings` row's value as an array. KexyApi stores `settingsValue`
 * as a JSON string, and not every path through the app hands it over already parsed.
 */
export function readDripSetting(settings: any[] | null | undefined, settingsType: string): any[] {
  const setting = (settings || []).find((s: any) => s?.settingsType === settingsType);
  if (!setting) return [];

  let value = setting.settingsValue;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

/**
 * The activate dialog's "Super charged" toggle (`super_charged` setting). No row = off.
 * Shown on the campaign page and in the dialog only: the AI email payloads carry no
 * `supercharge` flag (the lambda ignores it since 2026-10-09). Super charged is applied on
 * the server, which re-scrapes LinkedIn before each email (KexyApi `super-charged.ts`).
 */
export function isSuperChargedSetting(settings: any[] | null | undefined): boolean {
  return readDripSetting(settings, 'super_charged')[0]?.value === true;
}

/** The username of a personal profile URL (`linkedin.com/in/<username>`), or ''. */
export function linkedinUsername(url: string | null | undefined): string {
  const match = url?.match(/linkedin\.com\/in\/([^/?]+)/i);
  return match ? match[1] : '';
}
