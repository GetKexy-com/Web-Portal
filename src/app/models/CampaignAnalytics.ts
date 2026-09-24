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

/**
 * Unique prospects emailed in a window, and how many of THOSE opened, clicked or
 * replied. Every open/click/reply rate is worked out from this, never from the event
 * counts in `ICampaignAnalyticsTotals`: one prospect opening five times is five opens
 * but one prospect who opened, so dividing events by sends went over 100%.
 * `opened <= prospects` always holds (the server only counts engagement from prospects
 * it also counted as emailed).
 */
export interface IUniqueReach {
  prospects: number;
  opened: number;
  clicked: number;
  replied: number;
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
  /** Unique prospects for this email — what the row's rates come from. */
  reach: IUniqueReach;
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
  /** Unique prospects for the whole scope — what the headline rates come from. */
  reach: IUniqueReach;
  /** The same, for the previous window. */
  previousReach: IUniqueReach;
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
