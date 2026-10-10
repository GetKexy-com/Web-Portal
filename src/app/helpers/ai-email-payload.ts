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

/**
 * The campaign's lead magnets as the AI email lambda's `lead_magnet` items, the same shape
 * KexyApi sends (`lead-magnet-payload.ts`). The lambda was written for PHP-era rows, where the
 * link is `lead_magnet_url`; KexyApi now returns `leadMagnetUrl`, so the AI got the title but
 * no link and wrote `<a href="#">`. Both keys are sent.
 */
export function aiLeadMagnets(leadMagnets: any[] | null | undefined): any[] {
  return (leadMagnets || []).map((m: any) => ({
    id: m?.id,
    title: m?.title,
    summary: m?.summary,
    lead_magnet_url: m?.leadMagnetUrl ?? m?.lead_magnet_url,
    leadMagnetUrl: m?.leadMagnetUrl ?? m?.lead_magnet_url,
    status: m?.status,
  }));
}
