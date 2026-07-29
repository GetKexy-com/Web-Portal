/**
 * Dashboard data contracts.
 *
 * These mirror the shapes the real endpoints already return, so switching the
 * dashboard from mock data to live data is a change inside `DashboardService` only
 * — no component or template edits. Specifically:
 *
 * - `IDashboardTotals.emailsSent` is the `total` that `drip-campaigns/insights`
 *   returns alongside its `insights[]` array.
 * - `IDashboardActivity.type` uses the SAME vocabulary as an insight's
 *   `insightType` (`constants.CLICK` / `OPEN` / `REPLY`), and `clickedLink` is the
 *   same field, so activity rows can be built straight from `insights[]`.
 * - `IDashboardCampaignRow` fields map onto `DripCampaign` /
 *   `IDripCampaignDetails` (`id`, `status`, `createdAt`, `details.title.title`,
 *   `details.numberOfEmails`).
 * - Rates are whole PERCENTAGES (0-100), matching what `email-insights-content`
 *   computes and feeds to `insights-statistics-card [insightRate]`.
 */

/** Headline counters. Rates are derived, never stored, so they can't disagree. */
export interface IDashboardTotals {
  contacts: number;
  lists: number;
  dripCampaigns: number;
  activeCampaigns: number;
  /** `total` from the insights endpoint — messages actually sent. */
  emailsSent: number;
  opens: number;
  clicks: number;
  replies: number;
  unsubscribes: number;
  bounces: number;
}

/** One day in the trend series. `date` is an ISO date (YYYY-MM-DD). */
export interface IDashboardTrendPoint {
  date: string;
  sent: number;
  opens: number;
  clicks: number;
  replies: number;
}

/** A campaign summarised for the dashboard table. */
export interface IDashboardCampaignRow {
  id: number;
  title: string;
  /** `constants.ACTIVE` | `PAUSE` | `COMPLETE` | `DRAFT`. */
  status: string;
  numberOfEmails: number;
  sent: number;
  /** Whole percentages, 0-100. */
  openRate: number;
  clickRate: number;
  replyRate: number;
  createdAt: string;
}

/** A single engagement event — same vocabulary as an insight row. */
export interface IDashboardActivity {
  id: number;
  /** `constants.OPEN` | `CLICK` | `REPLY` | `'unsubscribe'`. */
  type: string;
  contactName: string;
  email: string;
  campaignTitle: string;
  /** ISO timestamp. */
  occurredAt: string;
  /** Present on click events only, like an insight's `clickedLink`. */
  clickedLink?: string;
}

/** Aggregated clicks per destination — the shape `setTopClickedLinks` produces. */
export interface IDashboardTopLink {
  key: string;
  count: number;
}

/**
 * Reply rate for one day-of-week × time-of-day bucket, for the send-window heatmap.
 * Real source: bucket `insights[]` by the weekday and hour of `messageSentAt`.
 */
export interface IDashboardHeatCell {
  /** 0 = Sunday … 6 = Saturday, matching JS `Date.getDay()`. */
  dow: number;
  /** 0 = 6-11h, 1 = 11-14h, 2 = 14-17h, 3 = 17-21h (local). */
  bucket: number;
  sent: number;
  replies: number;
}

export interface IDashboardStats {
  totals: IDashboardTotals;
  /** Oldest → newest. The page slices the tail for the selected range. */
  trend: IDashboardTrendPoint[];
  campaigns: IDashboardCampaignRow[];
  recentActivity: IDashboardActivity[];
  topLinks: IDashboardTopLink[];
  sendWindows: IDashboardHeatCell[];
}

/** Time-of-day bucket labels, index-aligned with `IDashboardHeatCell.bucket`. */
export const HEAT_BUCKETS = ['6–11', '11–14', '14–17', '17–21'] as const;
export const HEAT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Selectable trend windows, in days. */
export const DASHBOARD_RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
] as const;
