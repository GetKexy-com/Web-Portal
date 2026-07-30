/**
 * Dashboard data contracts.
 *
 * These mirror the shapes the real endpoints already return, so switching the
 * dashboard from mock data to live data is a change inside `DashboardService` only
 * — no component or template edits. Specifically:
 *
 * - `IDashboardActivity.type` uses the SAME vocabulary as an insight's
 *   `insightType` (`constants.CLICK` / `OPEN` / `REPLY`), and `clickedLink` is the
 *   same field, so activity rows can be built straight from `insights[]`.
 * - `IDashboardCampaignMeta` fields map onto `DripCampaign` /
 *   `IDripCampaignDetails` (`id`, `status`, `createdAt`, `details.title.title`,
 *   `details.numberOfEmails`).
 * - Rates are whole PERCENTAGES (0-100), matching what `email-insights-content`
 *   computes and feeds to `insights-statistics-card [insightRate]`.
 *
 * ── ONE FACT TABLE ──────────────────────────────────────────────────────────
 * `IDashboardStats.trend` is the single source of truth for every flow metric on
 * the page: one row per campaign per day, carrying its own time-of-day split and
 * click destinations. Everything else — headline tiles, the plot, the funnel,
 * deliverability, the send-window heatmap, the top-links table and the campaign
 * table's own figures — is AGGREGATED from those rows by the page.
 *
 * That is what makes campaign segmentation and the range switch trustworthy: both
 * are just a filter over this one array, so no panel can quietly ignore the
 * current scope or disagree with another panel. Do NOT add a pre-aggregated total
 * for something derivable from these rows; a second copy is a second answer.
 *
 * The real source is a group-by over `insights[]` on
 * (`dripCampaignId`, date of `messageSentAt`). A live endpoint may also accept
 * `days` + `campaignIds` and pre-scope server-side; in that case the page's
 * aggregation helpers still work unchanged on the smaller array.
 */

/**
 * Stock counters — how much audience exists RIGHT NOW. Deliberately excludes every
 * flow metric (sent / opens / clicks / replies / bounces / unsubscribes): those are
 * summed from `trend` for the selected window and campaign scope, so a stored copy
 * here could only ever contradict them.
 */
export interface IDashboardTotals {
  contacts: number;
  lists: number;
  /** Every campaign, not just the ones in the table. */
  dripCampaigns: number;
  activeCampaigns: number;
}

/** Sends and replies for one time-of-day bucket, for the send-window heatmap. */
export interface IDashboardBucketSplit {
  sent: number;
  replies: number;
}

/** Clicks for one destination — the shape `setTopClickedLinks` produces. */
export interface IDashboardLinkCount {
  key: string;
  count: number;
}

/** A day's aggregate for one metric set, after campaign rows have been summed. */
export interface IDashboardTrendPoint {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  sent: number;
  opens: number;
  clicks: number;
  replies: number;
  unsubscribes: number;
  bounces: number;
}

/**
 * One campaign on one day — the fact-table row described above.
 *
 * `sent` is the sum of `buckets[].sent`, `replies` the sum of `buckets[].replies`,
 * and `clicks` the sum of `links[].count`. Those three are denormalised for cheap
 * summing, NOT independent inputs: generate or map the breakdowns first and total
 * them, so a row cannot contradict itself.
 */
export interface IDashboardCampaignTrendPoint extends IDashboardTrendPoint {
  campaignId: number;
  /** Length 4, index-aligned with `HEAT_BUCKETS`. */
  buckets: IDashboardBucketSplit[];
  /** Empty on days with no clicks. */
  links: IDashboardLinkCount[];
}

/** A campaign's identity. Its FIGURES are summed from `trend`, never stored here. */
export interface IDashboardCampaignMeta {
  id: number;
  title: string;
  /** `constants.ACTIVE` | `PAUSE` | `COMPLETE` | `DRAFT`. */
  status: string;
  numberOfEmails: number;
  createdAt: string;
}

/**
 * A campaign table row: its identity plus the figures for the window currently on
 * screen. Built by the page, so the numbers beside a campaign always describe the
 * same period as the chart above them.
 */
export interface IDashboardCampaignRow extends IDashboardCampaignMeta {
  sent: number;
  /** Whole percentages, 0-100, of `sent`. */
  openRate: number;
  clickRate: number;
  replyRate: number;
  /** True when this campaign is part of the current scope. */
  selected: boolean;
}

/** A single engagement event — same vocabulary as an insight row. */
export interface IDashboardActivity {
  id: number;
  /** `constants.OPEN` | `CLICK` | `REPLY` | `'unsubscribe'`. */
  type: string;
  campaignId: number;
  contactName: string;
  email: string;
  campaignTitle: string;
  /** ISO timestamp. */
  occurredAt: string;
  /** Present on click events only, like an insight's `clickedLink`. */
  clickedLink?: string;
}

/**
 * One contact's engagement with one campaign on one day — the fact table behind the
 * "most engaged contacts" leaderboard. Carries `date` and `campaignId` for the same
 * reason `trend` does: the leaderboard has to answer for the window and the campaign
 * scope on screen, not for all time.
 *
 * Real source: the same `insights[]` rows grouped by (`contactId`, `dripCampaignId`,
 * date) instead of by campaign alone.
 */
export interface IDashboardContactEngagement {
  contactId: number;
  campaignId: number;
  name: string;
  email: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  opens: number;
  clicks: number;
  replies: number;
}

export interface IDashboardStats {
  totals: IDashboardTotals;
  campaigns: IDashboardCampaignMeta[];
  /** The fact table. Oldest → newest; days with no sends are simply absent. */
  trend: IDashboardCampaignTrendPoint[];
  contactEngagement: IDashboardContactEngagement[];
  recentActivity: IDashboardActivity[];
}

/** Time-of-day bucket labels, index-aligned with `IDashboardBucketSplit`. */
export const HEAT_BUCKETS = ['6–11', '11–14', '14–17', '17–21'] as const;
export const HEAT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Selectable trend windows, in days. */
export const DASHBOARD_RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
] as const;

/** How the contact leaderboard can be ranked. */
export const ENGAGEMENT_METRICS = [
  { key: 'opens', label: 'Opens' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'replies', label: 'Replies' },
] as const;

export type EngagementMetricKey = (typeof ENGAGEMENT_METRICS)[number]['key'];
