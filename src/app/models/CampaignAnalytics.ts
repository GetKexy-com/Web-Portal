/**
 * `GET dashboard/campaigns/:campaignId` — everything the campaign Insights drawer
 * draws, for one drip campaign.
 *
 * Unlike `DashboardStats`, this is scoped SERVER-side: the drawer has no filters to
 * make free, so there is no reason to ship the whole company's fact table and slice
 * it in the browser. What arrives is what is drawn.
 */

export interface ICampaignAnalyticsIdentity {
  id: number;
  title: string;
  status: string;
  numberOfEmails: number;
  createdAt: string;
}

/** Raw counts for a window. Rates are derived in the component, never sent. */
export interface ICampaignAnalyticsTotals {
  sent: number;
  opens: number;
  clicks: number;
  replies: number;
}

export interface ICampaignAnalyticsTrendPoint {
  /** `YYYY-MM-DD`. The series is gap-free — the server materialises empty days. */
  date: string;
  sent: number;
  opens: number;
  clicks: number;
  replies: number;
}

/**
 * One row per email in the sequence, INCLUDING emails that have never been sent —
 * "step 4 has gone to nobody" is a finding, not a row to hide.
 */
export interface ICampaignAnalyticsEmailRow {
  emailId: number;
  sequence: number;
  subject: string;
  sent: number;
  opens: number;
  clicks: number;
  replies: number;
}

export interface ICampaignAnalyticsLink {
  key: string;
  count: number;
}

export interface ICampaignAnalyticsContact {
  contactId: number;
  name: string;
  email: string;
  /** Carried for the export, which is a follow-up sheet, not just a ranking. */
  companyName: string;
  jobTitle: string;
  opens: number;
  clicks: number;
  replies: number;
  lastActivity: string;
}

export interface ICampaignAnalytics {
  campaign: ICampaignAnalyticsIdentity;
  /**
   * The single email every figure is scoped to, or null for the whole campaign.
   *
   * One payload serves both the campaign drawer and the per-email one — the same
   * report at two scopes rather than two reports.
   */
  email: ICampaignAnalyticsEmailRow | null;
  totals: ICampaignAnalyticsTotals;
  /**
   * The equal-length window immediately before this one. Raw counts, not a percentage:
   * percent change from a zero baseline is undefined, and collapsing that into a
   * number would lose the difference between "no change" and "nothing to compare to".
   */
  previous: ICampaignAnalyticsTotals;
  trend: ICampaignAnalyticsTrendPoint[];
  /** Empty when scoped to one email — there is no comparison left to make. */
  perEmail: ICampaignAnalyticsEmailRow[];
  topLinks: ICampaignAnalyticsLink[];
  /** All three rankings together, so switching tab costs no request. */
  engagedContacts: {
    byOpens: ICampaignAnalyticsContact[];
    byClicks: ICampaignAnalyticsContact[];
    byReplies: ICampaignAnalyticsContact[];
  };
  meta: {
    days: number;
    limit: number;
    emailId: number | null;
    from: string;
    to: string;
    /** False everywhere today — nothing consumes the bounce webhook. */
    bouncesTracked: boolean;
  };
}

/** Window options in the drawer's header. */
export const CAMPAIGN_INSIGHT_RANGES: { label: string; days: number }[] = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];
