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
 * Switch for sending the toggle to the AI email lambdas. On (2026-10-09): `supercharge` is the
 * campaign's saved toggle. Set false to send `supercharge: false` whatever was saved.
 * Keep in step with KexyApi `super-charged.ts`.
 */
export const SUPERCHARGE_TO_AI_ENABLED = true;

/** The `supercharge` flag for an AI email payload: the saved toggle, behind the off switch. */
export function superchargeForAi(settings: any[] | null | undefined): boolean {
  return SUPERCHARGE_TO_AI_ENABLED && isSuperChargedSetting(settings);
}

/** The activate dialog's "Super charged" toggle (`super_charged` setting). No row = off. */
export function isSuperChargedSetting(settings: any[] | null | undefined): boolean {
  return readDripSetting(settings, 'super_charged')[0]?.value === true;
}

/** The username of a personal profile URL (`linkedin.com/in/<username>`), or ''. */
export function linkedinUsername(url: string | null | undefined): string {
  const match = url?.match(/linkedin\.com\/in\/([^/?]+)/i);
  return match ? match[1] : '';
}
