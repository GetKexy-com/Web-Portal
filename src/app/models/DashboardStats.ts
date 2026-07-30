/**
 * Dashboard data contracts — the shapes `GET /dashboard/stats` and
 * `GET /dashboard/engaged-contacts` actually return (under the global `res.data`
 * wrapper). See `KexyApi/src/dashboard/` and its CLAUDE.md section for the SQL behind
 * each field.
 *
 * ── ONE FACT TABLE ──────────────────────────────────────────────────────────
 * `IDashboardStats.trend` is the single source of truth for every flow metric on the
 * page: one row per campaign per day, carrying its own time-of-day split and click
 * destinations. Everything else — headline tiles, the plot, the funnel,
 * deliverability, the send-window heatmap, the top-links table and the campaign
 * table's own figures — is AGGREGATED from those rows by the page.
 *
 * That is what makes campaign segmentation and the range switch trustworthy AND
 * cheap: both are a filter over one array the page already holds, so no panel can
 * quietly ignore the current scope, and clicking a filter costs no request. Do NOT
 * add a pre-aggregated total for something derivable from these rows; a second copy
 * is a second answer.
 *
 * The contact leaderboard is the deliberate exception — see
 * `IDashboardEngagedContacts`.
 */

/**
 * Stock counters — how much audience exists RIGHT NOW. Deliberately excludes every
 * flow metric (sent / opens / clicks / replies): those are summed from `trend` for the
 * selected window and campaign scope, so a stored copy here could only contradict them.
 */
export interface IDashboardTotals {
  contacts: number;
  lists: number;
  /** Every non-deleted campaign, not just the ones in the table. */
  dripCampaigns: number;
  activeCampaigns: number;
}

/** Sends and replies for one time-of-day bucket, for the send-window heatmap. */
export interface IDashboardBucketSplit {
  sent: number;
  /**
   * Replies keyed to the day/bucket the replied-to email was SENT, not when the reply
   * arrived — the cell's denominator is sends, so its numerator has to match or "best
   * time to send" would really mean "best time to receive". This is why a day's
   * `replies` and the sum of its `buckets[].replies` can legitimately differ.
   */
  replies: number;
}

/** Clicks for one destination. */
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
}

/**
 * One campaign on one day — the fact-table row described above. Days with no sends
 * are simply absent, so the page fills the axis from `meta.from`/`meta.to`.
 *
 * `sent` is the sum of `buckets[].sent`. `clicks` is NOT the sum of `links[].count`:
 * link rows are capped to the window's top destinations server-side and exclude
 * clicks with no recorded URL, so `links` is a breakdown that may total LESS than
 * `clicks`. Use `clicks` for the count and `links` only for the breakdown.
 */
export interface IDashboardCampaignTrendPoint extends IDashboardTrendPoint {
  campaignId: number;
  /** Length `meta.bucketCount`, index-aligned with `HEAT_BUCKETS`. */
  buckets: IDashboardBucketSplit[];
  /** Empty on days with no clicks. */
  links: IDashboardLinkCount[];
}

/**
 * A campaign's identity. Its FIGURES are summed from `trend`, never stored here.
 *
 * **Drafts are excluded.** The server omits `inactive` campaigns — that status is
 * assigned on creation and on "save as draft", so it means never-sent, and a
 * performance table full of unavoidable zeros isn't worth the rows (`pause` is the
 * was-running-now-stopped state, and those ARE listed). Their rows are absent from
 * `trend` too, so the table's Sent column still adds up to the headline tiles.
 *
 * `totals.dripCampaigns` deliberately still counts drafts — it agrees with the Manage
 * Campaigns page, which lists them — so that card can legitimately exceed
 * `campaigns.length`.
 */
export interface IDashboardCampaignMeta {
  id: number;
  title: string;
  /** `constants.ACTIVE` | `PAUSE` | `COMPLETE` | `'archive'` | `'published'`. */
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

/**
 * Unsubscribes for one day, COMPANY-WIDE.
 *
 * Not part of `trend` because the suppression-list table records who unsubscribed but
 * not which campaign prompted it — folding these into a campaign row would be an
 * invention. So this series follows the date range but ignores the campaign scope.
 */
export interface IDashboardUnsubscribePoint {
  date: string;
  count: number;
}

/** A single engagement event — same vocabulary as an insight row. */
export interface IDashboardActivity {
  id: number;
  /** `constants.OPEN` | `CLICK` | `REPLY`. */
  type: string;
  campaignId: number;
  contactName: string;
  email: string;
  campaignTitle: string;
  /** ISO timestamp. */
  occurredAt: string;
  /** Present on click events only. */
  clickedLink?: string;
}

/** What the server actually measured, so the page never renders an unmeasured zero. */
export interface IDashboardMeta {
  days: number;
  /** Window bounds as ISO dates, from the DB's own clock. Inclusive both ends. */
  from: string;
  to: string;
  bucketCount: number;
  topLinkKeys: number;
  /**
   * FALSE today: nothing in the backend records a delivery failure (there is an SES
   * SNS DTO but no route consuming it). The page must hide bounce figures rather than
   * show 0%, which reads as perfect deliverability instead of "not measured".
   */
  bouncesTracked: boolean;
}

export interface IDashboardStats {
  totals: IDashboardTotals;
  campaigns: IDashboardCampaignMeta[];
  /** The fact table. Oldest → newest; days with no sends are absent. */
  trend: IDashboardCampaignTrendPoint[];
  unsubscribes: IDashboardUnsubscribePoint[];
  recentActivity: IDashboardActivity[];
  meta: IDashboardMeta;
}

/** One row of the contact leaderboard, already totalled for the requested window. */
export interface IDashboardEngagedContact {
  contactId: number;
  name: string;
  email: string;
  opens: number;
  clicks: number;
  replies: number;
  /** ISO timestamp of the contact's most recent event in the window. */
  lastActivity: string;
}

/**
 * `GET /dashboard/engaged-contacts`.
 *
 * Scoped SERVER-side, unlike `trend`, because a leaderboard is a top-N over the
 * contact dimension: the raw rows behind it are unbounded (tens of thousands per
 * company) while the answer is ten rows, so the ORDER BY / LIMIT belongs in SQL.
 *
 * All THREE rankings come back together, which is what keeps the metric tabs
 * instant — switching Opens/Clicks/Replies reads an already-fetched list. Only a
 * change of date range or campaign scope needs a new request.
 */
export interface IDashboardEngagedContacts {
  byOpens: IDashboardEngagedContact[];
  byClicks: IDashboardEngagedContact[];
  byReplies: IDashboardEngagedContact[];
  meta: {
    days: number;
    limit: number;
    campaignIds: number[] | null;
    from: string;
    to: string;
  };
}

/**
 * Time-of-day bucket labels, index-aligned with `IDashboardBucketSplit`.
 *
 * These MUST match the server's `BUCKET_CASE_SQL` split (`< 11`, `11-13`, `14-16`,
 * `>= 17`), which covers all 24 hours. An earlier 6-11/11-14/14-17/17-21 set silently
 * dropped overnight sends, so the heatmap's denominators disagreed with the `sent`
 * totals elsewhere on the page.
 */
export const HEAT_BUCKETS = ['≤11', '11–14', '14–17', '17+'] as const;
export const HEAT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Selectable trend windows, in days. The page fetches the LARGEST of these once and
 * slices the shorter ones locally, so switching range costs no request.
 */
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
