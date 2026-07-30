import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { routeConstants } from '../../helpers/routeConstants';
import { constants } from '../../helpers/constants';
import {
  DASHBOARD_RANGES,
  ENGAGEMENT_METRICS,
  EngagementMetricKey,
  HEAT_BUCKETS,
  HEAT_DAYS,
  IDashboardActivity,
  IDashboardCampaignRow,
  IDashboardCampaignTrendPoint,
  IDashboardEngagedContacts,
  IDashboardLinkCount,
  IDashboardStats,
  IDashboardTrendPoint,
} from '../../models/DashboardStats';

/** The four selectable metrics. Clicking a tile re-plots the main chart. */
type MetricKey = 'sent' | 'opens' | 'clicks' | 'replies';

interface IMetricTile {
  key: MetricKey;
  label: string;
  /** Absolute count for the window. */
  total: number;
  /** Rate vs sent, 0-100. Null for `sent` itself, which has no denominator. */
  rate: number | null;
  /**
   * Signed % change vs the preceding window of equal length, or NULL when there is
   * no baseline to divide by — either no prior window exists, or its value was 0.
   * Percent change from zero is undefined, and reporting it as `0` (which the page
   * renders as "no change") claims a flat trend that was never measured.
   */
  delta: number | null;
  /** Formatted headline (compact for counts, `NN%` for rates). */
  display: string;
}

interface IAxisTick {
  /** Position along the axis, 0-100. */
  pct: number;
  label: string;
}

/**
 * An auto-derived callout. These are COMPUTED from the data, never authored — the
 * point of an insight strip is that it reacts to what actually happened, so it keeps
 * working unchanged once the mock is swapped for the live endpoint.
 */
interface IInsight {
  tone: 'good' | 'warn' | 'info';
  icon: string;
  text: string;
}

/** One deliverability row: delivered / bounced / unsubscribed, with its share. */
interface IDeliveryRow {
  label: string;
  value: number;
  pct: number;
  tone: 'good' | 'warn' | 'neutral';
}

/** A heatmap cell, pre-scaled for rendering. */
interface IHeatCellView {
  dow: number;
  bucket: number;
  rate: number;
  sent: number;
  /** 0-1 position on the sequential ramp. */
  intensity: number;
  title: string;
}

/**
 * One row of the contact leaderboard: a contact's totals for the window and campaign
 * scope on screen, plus the bar length for whichever metric it is ranked by.
 */
interface IEngagedContactRow {
  contactId: number;
  name: string;
  email: string;
  opens: number;
  clicks: number;
  replies: number;
  /** Most recent day with any activity, ISO date. */
  lastActivity: string;
  /** Share of the leader's value for the ranked metric, 0-100. */
  barPct: number;
}

@Component({
  selector: 'app-brand-dashboard',
  imports: [CommonModule, BrandLayoutComponent],
  templateUrl: './brand-dashboard.component.html',
  styleUrl: './brand-dashboard.component.scss',
})
export class BrandDashboardComponent implements OnInit {
  readonly ranges = DASHBOARD_RANGES;
  readonly engagementMetrics = ENGAGEMENT_METRICS;
  readonly constants = constants;
  readonly brand = routeConstants.BRAND;

  /**
   * Parks the Engagement funnel, Top clicked links, Deliverability and Best send
   * windows panels — kept for later, off screen for now. Set to `true` to bring all
   * four back; nothing else needs changing.
   *
   * Their numbers are still COMPUTED while hidden, on purpose and cheaply: the
   * insight strip's "best send window" callout reads the heatmap, so skipping the
   * heat build would silently drop the one actionable line off the top of the page.
   */
  readonly showSecondaryPanels = false;

  isLoading = true;
  /** Set when the stats request fails, so the page can say so instead of looking empty. */
  loadError = '';
  stats: IDashboardStats;
  /** From the auth token's `supplier_id`. Every dashboard query is scoped to it. */
  companyId: number = null;
  userName = '';

  /**
   * The widest window the range switch offers, and therefore the ONE window fetched.
   * Derived from `ranges` rather than typed as 90, so adding a range can't leave the
   * fetch short of what the UI lets the user select.
   */
  readonly maxRangeDays = Math.max(...DASHBOARD_RANGES.map((r) => r.days));
  /**
   * Page heading. A FIELD, not a getter: it is settled once in `ngOnInit` and a
   * getter would rebuild the string on every change-detection pass.
   *
   * Falls back to a nameless "Welcome back" when the token carries no name — a
   * trailing comma with nothing after it is worse than a shorter greeting.
   */
  greeting = 'Welcome back';
  selectedDays = 30;
  selectedMetric: MetricKey = 'sent';
  lastUpdated: Date = null;

  /** The window being shown, and the equal-length window before it (comparison). */
  visibleTrend: IDashboardTrendPoint[] = [];
  previousTrend: IDashboardTrendPoint[] = [];

  tiles: IMetricTile[] = [];

  // ── Chart geometry ──────────────────────────────────────────────────────
  // The plot uses a 0-100 x 0-100 viewBox so every coordinate IS a percentage,
  // which lets the HTML axis labels and the SVG share one coordinate space. Strokes
  // use vector-effect: non-scaling-stroke, so stretching the SVG doesn't fatten
  // them — that is what lets the plot be width-responsive while axis TEXT stays in
  // HTML and never distorts.
  currentLine = '';
  currentArea = '';
  previousLine = '';
  yTicks: IAxisTick[] = [];
  xTicks: IAxisTick[] = [];

  // ── Hover layer ─────────────────────────────────────────────────────────
  hoverIndex = -1;
  hoverX = 0;
  hoverY = 0;

  funnel: {
    label: string;
    value: number;
    /** Share of everything sent. */
    pct: number;
    /** Conversion from the PREVIOUS stage — the number that shows where drop-off is. */
    stepPct: number | null;
    step: string;
  }[] = [];

  // ── Campaign scope ──────────────────────────────────────────────────────
  // An EMPTY set means "all campaigns". That is the honest default: the page opens
  // showing everything, and there is no state where the user has deselected their way
  // into an empty dashboard by accident.
  selectedCampaignIds = new Set<number>();
  /** The selected campaigns, for the removable chips above the chart. */
  scopeChips: { id: number; title: string }[] = [];
  /** Sends inside the current scope — drives the "nothing here" states. */
  scopedSent = 0;

  // ── Window labels ───────────────────────────────────────────────────────
  // The toolbar names the ACTUAL dates rather than saying "last 7 days vs previous
  // 7", which left it to the reader to work out what was being compared with what.
  /** e.g. `Jul 24 – Jul 30`. Empty only when there is no data at all. */
  rangeLabel = '';
  /** e.g. `Jul 17 – Jul 23`, or null when the series doesn't reach back that far. */
  compareLabel: string | null = null;

  // ── Fact table, indexed ─────────────────────────────────────────────────
  // Built once on load. `dates` is the gap-free day axis the data spans; `rowsByDate`
  // buckets the campaign-day rows so a window is a slice, not a scan.
  private dates: string[] = [];
  private rowsByDate = new Map<string, IDashboardCampaignTrendPoint[]>();
  /** Campaign-day rows inside the current window AND campaign scope. */
  private visibleRows: IDashboardCampaignTrendPoint[] = [];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const user: any = this.authService.userTokenValue || {};
    // `firstName` is what the token actually carries — see `brand-layout`'s
    // `getUserName()` and `org-info`. `first_name` is tolerated because
    // `auth.service` writes that spelling on one path, but `supplier_name` is
    // deliberately NOT a fallback: that is the COMPANY name, and greeting someone by
    // their employer is worse than greeting them by nothing.
    this.userName = (user.firstName || user.first_name || '').trim();
    if (this.userName) this.greeting = `Welcome back, ${this.userName}`;
    this.companyId = user.supplier_id;

    if (!this.companyId) {
      // Every dashboard query is company-scoped, so without a company there is
      // nothing to ask for — say so rather than showing an empty dashboard that
      // looks like a company with no activity.
      this.loadError = 'No company is associated with this account.';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    try {
      // Fetch the LARGEST range once; the 7/30 day views are slices of it, so the
      // range switch stays a local operation.
      this.stats = await this.dashboardService.getStats(this.companyId, this.maxRangeDays);
      this.lastUpdated = new Date();
      this.__indexTrend();
      this.__recompute();
      // Not awaited: the leaderboard is one panel, and blocking the whole page on it
      // would delay the chart for no reason. It renders its own loading state.
      this.__loadEngagedContacts();
    } catch (error: any) {
      this.loadError = error?.message || 'Could not load dashboard data.';
    } finally {
      this.isLoading = false;
    }
  }

  selectRange = (days: number): void => {
    if (days === this.selectedDays) return;
    this.selectedDays = days;
    this.hoverIndex = -1;
    this.__recompute();
    // The leaderboard is ranked server-side, so unlike every other panel it cannot be
    // re-derived from data already on the client.
    this.__loadEngagedContacts();
  };

  selectMetric = (key: MetricKey): void => {
    if (key === this.selectedMetric) return;
    this.selectedMetric = key;
    this.hoverIndex = -1;
    this.__buildChart();
  };

  goTo = (path: string): void => {
    // Braces on purpose: the expression form would return router.navigate's
    // Promise<boolean>, which doesn't match the declared `void`.
    this.router.navigate([path]);
  };

  get activeTile(): IMetricTile {
    return this.tiles.find((t) => t.key === this.selectedMetric) || this.tiles[0];
  }

  // ── Campaign segmentation ───────────────────────────────────────────────

  /** True when no explicit selection is active, i.e. the whole account is in scope. */
  get isAllCampaigns(): boolean {
    return this.selectedCampaignIds.size === 0;
  }

  /**
   * Add or remove one campaign from the comparison. Removing the last one falls back
   * to "all campaigns" rather than to an empty dashboard.
   */
  toggleCampaign = (id: number): void => {
    if (this.selectedCampaignIds.has(id)) this.selectedCampaignIds.delete(id);
    else this.selectedCampaignIds.add(id);

    this.hoverIndex = -1;
    this.__recompute();
    this.__loadEngagedContacts();
  };

  clearCampaignScope = (): void => {
    if (this.isAllCampaigns) return;
    this.selectedCampaignIds.clear();
    this.hoverIndex = -1;
    this.__recompute();
    this.__loadEngagedContacts();
  };

  isCampaignSelected = (id: number): boolean => this.selectedCampaignIds.has(id);

  /** Gmail-style checkbox glyphs, matching the app's other selectable tables. */
  campaignCheckboxIcon = (id: number): string =>
    this.isCampaignSelected(id) ? 'fa-check-square-o' : 'fa-square-o';

  /** Reads out the scope in the toolbar, so no chart is ever unlabelled. */
  get scopeLabel(): string {
    const total = this.stats?.campaigns?.length || 0;
    return this.isAllCampaigns
      ? 'All campaigns'
      : `${this.selectedCampaignIds.size} of ${total} campaigns`;
  }

  // ── Contact leaderboard ─────────────────────────────────────────────────
  selectedEngagementMetric: EngagementMetricKey = 'clicks';
  engagedContacts: IEngagedContactRow[] = [];
  /** The last leaderboard response — holds all three rankings, so tabs are free. */
  engaged: IDashboardEngagedContacts = null;
  engagedLoading = false;
  engagedError = '';

  selectEngagementMetric = (key: EngagementMetricKey): void => {
    if (key === this.selectedEngagementMetric) return;
    this.selectedEngagementMetric = key;
    this.__buildEngagedContacts();
  };

  get engagementMetricLabel(): string {
    return (
      this.engagementMetrics.find((m) => m.key === this.selectedEngagementMetric)?.label || ''
    );
  }

  /**
   * Map the pointer to the nearest data index. Read off the WRAPPER's width rather
   * than SVG user units: the plot is non-uniformly scaled, so SVG coordinates and
   * screen pixels don't correspond.
   */
  onChartMove = (event: MouseEvent): void => {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    if (!rect.width || this.visibleTrend.length < 2) return;

    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const i = Math.round(ratio * (this.visibleTrend.length - 1));
    this.hoverIndex = i;
    this.hoverX = (i / (this.visibleTrend.length - 1)) * 100;
    this.hoverY = this.__valueToY(this.__metricValue(this.visibleTrend[i]));
  };

  clearHover = (): void => {
    this.hoverIndex = -1;
  };

  /** Compact counts (1.2K / 3.4M) the way every analytics console formats them. */
  compact = (n: number): string => {
    if (n === null || n === undefined) return '—';
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + 'M';
    if (abs >= 1_000) return (n / 1_000).toFixed(abs >= 10_000 ? 0 : 1) + 'K';
    return String(n);
  };

  statusClass = (status: string): string => {
    switch (status) {
      case constants.ACTIVE: return 'is-active';
      case constants.PAUSE: return 'is-paused';
      case constants.COMPLETE: return 'is-complete';
      default: return 'is-draft';
    }
  };

  activityIcon = (type: string): string => {
    switch (type) {
      case constants.REPLY: return 'fa-reply';
      case constants.CLICK: return 'fa-mouse-pointer';
      case constants.OPEN: return 'fa-envelope-open-o';
      default: return 'fa-ban';
    }
  };

  // ── Indexing ────────────────────────────────────────────────────────────

  /**
   * Bucket the fact table by date and build the day axis.
   *
   * The axis comes from the SERVER's `meta.from`/`meta.to`, not from the min and max
   * row dates. Two reasons: the response omits days with no activity, so deriving the
   * axis from the rows would silently shorten the window and make "last 7 days" mean
   * "the last 7 days that happened to have sends"; and the bounds were computed by the
   * DB's own clock, which is the only clock that agrees with how the rows were grouped.
   * Filling the gaps means a quiet day is a real zero on the chart rather than a
   * missing x position.
   */
  private __indexTrend(): void {
    this.rowsByDate.clear();
    this.dates = [];

    for (const row of this.stats?.trend || []) {
      const bucket = this.rowsByDate.get(row.date);
      if (bucket) bucket.push(row);
      else this.rowsByDate.set(row.date, [row]);
    }

    const meta = this.stats?.meta;
    if (!meta?.from || !meta?.to) return;

    const cursor = this.__dayStart(meta.from);
    const last = this.__dayStart(meta.to).getTime();

    // Guard against a malformed window rather than looping forever on it.
    while (cursor.getTime() <= last && this.dates.length <= 400) {
      this.dates.push(this.__isoDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // ── Contact leaderboard fetch ───────────────────────────────────────────
  /** In-flight token, so a slow response can't overwrite a newer one. */
  private engagedRequestId = 0;

  /**
   * Re-fetch the leaderboard for the current range and campaign scope.
   *
   * Called on load and whenever the range or scope changes — NOT when the metric tab
   * changes, because all three rankings arrive together. Responses are sequence-checked:
   * clicking through 7 → 30 → 90 quickly leaves three requests racing, and without the
   * token the slowest could land last and show the wrong window's leaderboard.
   */
  private async __loadEngagedContacts(): Promise<void> {
    if (!this.companyId) return;

    const requestId = ++this.engagedRequestId;
    this.engagedLoading = true;
    this.engagedError = '';

    try {
      const res = await this.dashboardService.getEngagedContacts(
        this.companyId,
        this.selectedDays,
        [...this.selectedCampaignIds],
      );
      if (requestId !== this.engagedRequestId) return; // superseded
      this.engaged = res;
      this.__buildEngagedContacts();
    } catch (error: any) {
      if (requestId !== this.engagedRequestId) return;
      this.engaged = null;
      this.engagedContacts = [];
      this.engagedError = error?.message || 'Could not load engaged contacts.';
    } finally {
      if (requestId === this.engagedRequestId) this.engagedLoading = false;
    }
  }

  /** Parse an ISO date as LOCAL midnight — bare `new Date('YYYY-MM-DD')` is UTC. */
  private __dayStart(iso: string): Date {
    return new Date(`${iso}T00:00:00`);
  }

  private __isoDate(d: Date): string {
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  // ── Recompute ───────────────────────────────────────────────────────────
  private __recompute(): void {
    if (!this.stats) return;

    const axis = this.dates;
    const n = Math.min(this.selectedDays, axis.length);
    const curDates = axis.slice(-n);
    const prevDates = axis.slice(Math.max(0, axis.length - n * 2), axis.length - n);

    this.visibleRows = this.__scopedRows(curDates);
    const prevRows = this.__scopedRows(prevDates);

    this.visibleTrend = this.__daily(curDates, this.visibleRows);
    this.previousTrend = this.__daily(prevDates, prevRows);
    this.scopedSent = this.__sum(this.visibleTrend, 'sent');

    this.rangeLabel = this.__spanLabel(curDates);
    // A shorter-than-requested prior window would make every delta compare unequal
    // periods, so a partial one counts as no baseline at all.
    this.compareLabel = prevDates.length === n ? this.__spanLabel(prevDates) : null;

    this.scopeChips = (this.stats.campaigns || [])
      .filter((c) => this.selectedCampaignIds.has(c.id))
      .map((c) => ({ id: c.id, title: c.title }));

    this.__buildTiles();
    this.__buildChart();
    this.__buildFunnel();
    this.__buildDelivery();
    this.__buildHeat();
    this.__buildTopLinks();
    this.__buildEngagedContacts();
    this.__buildActivity();
    // Insights read the tiles AND the heatmap, so it runs last.
    this.__buildInsights();
    this.__buildCampaignRows();
  }

  /** Rows for these dates that are inside the campaign scope. */
  private __scopedRows(dates: string[]): IDashboardCampaignTrendPoint[] {
    const all = this.isAllCampaigns;
    const out: IDashboardCampaignTrendPoint[] = [];

    for (const date of dates) {
      const rows = this.rowsByDate.get(date);
      if (!rows) continue;
      for (const row of rows) {
        if (all || this.selectedCampaignIds.has(row.campaignId)) out.push(row);
      }
    }
    return out;
  }

  /**
   * Collapse campaign-day rows into one point per day, aligned to `dates` so the
   * series has no holes and index N is always the Nth day of the window.
   */
  private __daily(
    dates: string[],
    rows: IDashboardCampaignTrendPoint[],
  ): IDashboardTrendPoint[] {
    const index = new Map<string, IDashboardTrendPoint>();
    const points = dates.map((date) => {
      const p: IDashboardTrendPoint = { date, sent: 0, opens: 0, clicks: 0, replies: 0 };
      index.set(date, p);
      return p;
    });

    for (const row of rows) {
      const p = index.get(row.date);
      if (!p) continue;
      p.sent += row.sent;
      p.opens += row.opens;
      p.clicks += row.clicks;
      p.replies += row.replies;
    }
    return points;
  }

  /**
   * Unsubscribes in the visible window. Company-wide by necessity — the suppression
   * list records who unsubscribed but not which campaign prompted it, so this figure
   * follows the date range and deliberately IGNORES the campaign scope.
   */
  private __scopedUnsubscribes(): number {
    const windowDates = new Set(this.visibleTrend.map((p) => p.date));
    return (this.stats?.unsubscribes || [])
      .filter((u) => windowDates.has(u.date))
      .reduce((acc, u) => acc + u.count, 0);
  }

  private __sum(rows: IDashboardTrendPoint[], k: keyof IDashboardTrendPoint): number {
    return rows.reduce((acc, p) => acc + (p[k] as number), 0);
  }

  private __pct(part: number, whole: number): number {
    return whole ? Math.round((part / whole) * 100) : 0;
  }

  /** `Jul 24 – Jul 30`, or a single date when the window is one day. */
  private __spanLabel(dates: string[]): string {
    if (!dates.length) return '';
    const from = this.__shortDate(dates[0]);
    const to = this.__shortDate(dates[dates.length - 1]);
    return from === to ? from : `${from} – ${to}`;
  }

  /**
   * Signed % change, or null when it isn't defined: no baseline window, or a baseline
   * of zero. Returning 0 for those cases would render as "no change" and assert a
   * flat trend the data never showed.
   */
  private __delta(current: number, previous: number): number | null {
    if (!this.compareLabel || !previous) return null;
    return Math.round(((current - previous) / previous) * 100);
  }

  private __buildTiles(): void {
    const cur = this.visibleTrend;
    const prev = this.previousTrend;
    const curSent = this.__sum(cur, 'sent');
    const prevSent = this.__sum(prev, 'sent');

    const spec: { key: MetricKey; label: string }[] = [
      { key: 'sent', label: 'Emails sent' },
      { key: 'opens', label: 'Open rate' },
      { key: 'clicks', label: 'Click rate' },
      { key: 'replies', label: 'Reply rate' },
    ];

    this.tiles = spec.map(({ key, label }) => {
      const total = this.__sum(cur, key);
      const prevTotal = this.__sum(prev, key);

      if (key === 'sent') {
        return {
          key,
          label,
          total,
          rate: null,
          delta: this.__delta(total, prevTotal),
          display: this.compact(total),
        };
      }

      const rate = this.__pct(total, curSent);
      return {
        key,
        label,
        total,
        rate,
        // Compare the RATE, not the raw count: a rate that held steady while volume
        // grew is not an improvement, and comparing counts would claim it was.
        delta: this.__delta(rate, this.__pct(prevTotal, prevSent)),
        display: `${rate}%`,
      };
    });
  }

  private __metricValue(p: IDashboardTrendPoint): number {
    return p[this.selectedMetric] as number;
  }

  /** Chart scale max, shared by the plot and the y-axis so they cannot disagree. */
  private chartMax = 1;

  private __valueToY(v: number): number {
    // SVG y grows downward; invert so 0 is the baseline.
    return 100 - (v / this.chartMax) * 100;
  }

  /**
   * One metric, two periods: the selected window as an area + line, and the
   * preceding window as a DASHED line. Same hue for both — it is the same measure,
   * so the periods are distinguished by line style, not by colour.
   */
  private __buildChart(): void {
    const cur = this.visibleTrend;
    if (cur.length < 2) {
      this.currentLine = this.currentArea = this.previousLine = '';
      this.yTicks = this.xTicks = [];
      return;
    }

    const curVals = cur.map((p) => this.__metricValue(p));
    // Align the comparison to the same x positions, so the two lines are readable
    // against each other even when the previous window is shorter (early data).
    const prevVals = this.previousTrend.map((p) => this.__metricValue(p));

    const peak = Math.max(...curVals, ...prevVals, 1);
    this.chartMax = this.__niceMax(peak);

    const pts = (vals: number[]) =>
      vals
        .map((v, i) => {
          const x = vals.length > 1 ? (i / (vals.length - 1)) * 100 : 0;
          return `${x.toFixed(2)},${this.__valueToY(v).toFixed(2)}`;
        })
        .join(' ');

    this.currentLine = pts(curVals);
    // Close the area down to the baseline at both ends.
    this.currentArea = `0,100 ${this.currentLine} 100,100`;
    this.previousLine = prevVals.length > 1 ? pts(prevVals) : '';

    // Y axis: 4 gridlines at nice round values — recessive, but present. A chart
    // with no scale is the main thing that makes a dashboard look unfinished.
    const steps = 4;
    this.yTicks = Array.from({ length: steps + 1 }, (_, i) => {
      const value = (this.chartMax / steps) * i;
      return { pct: (i / steps) * 100, label: this.compact(Math.round(value)) };
    });

    // X axis: ~5 sparse date ticks. Labelling every day is unreadable at 90 days.
    const wanted = Math.min(5, cur.length);
    const gap = (cur.length - 1) / (wanted - 1 || 1);
    this.xTicks = Array.from({ length: wanted }, (_, i) => {
      const idx = Math.round(i * gap);
      return { pct: (idx / (cur.length - 1)) * 100, label: this.__shortDate(cur[idx].date) };
    });
  }

  /** Round the axis top up to a 1/2/5 x 10^n step so tick labels read cleanly. */
  private __niceMax(peak: number): number {
    const pow = Math.pow(10, Math.floor(Math.log10(peak)));
    const scaled = peak / pow;
    const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return step * pow;
  }

  private __shortDate(iso: string): string {
    const [, m, d] = iso.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[Number(m) - 1]} ${Number(d)}`;
  }

  hoverPoint(): IDashboardTrendPoint {
    return this.visibleTrend[this.hoverIndex];
  }

  hoverPrevValue(): number | null {
    // The comparison point at the same offset in the previous window.
    const p = this.previousTrend[this.hoverIndex];
    return p ? (p[this.selectedMetric] as number) : null;
  }

  // ── Derived insight strip ───────────────────────────────────────────────
  insights: IInsight[] = [];

  /**
   * Turn the numbers into sentences. Only material changes are surfaced (>=8% swing,
   * or a deliverability threshold breach) so the strip stays worth reading rather
   * than restating every metric.
   */
  private __buildInsights(): void {
    const out: IInsight[] = [];

    // An empty scope has nothing to say about rates, and saying it anyway ("reply
    // rate 0%") would read as a regression rather than as an absence of data.
    if (!this.scopedSent) {
      this.insights = [
        {
          tone: 'info',
          icon: 'fa-info-circle',
          text: this.isAllCampaigns
            ? `Nothing was sent in the last ${this.selectedDays} days.`
            : `No sends in the last ${this.selectedDays} days for ${this.scopeLabel.toLowerCase()}. Clear the filter or widen the range.`,
        },
      ];
      return;
    }

    const reply = this.tiles.find((t) => t.key === 'replies');
    const open = this.tiles.find((t) => t.key === 'opens');
    const sent = this.tiles.find((t) => t.key === 'sent');

    // Every delta-based callout needs an explicit null check: without a baseline
    // there is no swing to report, and `Math.abs(null)` quietly evaluates to 0.
    if (reply && reply.delta !== null && Math.abs(reply.delta) >= 8) {
      out.push({
        tone: reply.delta > 0 ? 'good' : 'warn',
        icon: reply.delta > 0 ? 'fa-arrow-up' : 'fa-arrow-down',
        text: `Reply rate ${reply.delta > 0 ? 'up' : 'down'} ${Math.abs(reply.delta)}% to ${reply.rate}% versus the previous ${this.selectedDays} days.`,
      });
    }

    if (open && open.delta !== null && Math.abs(open.delta) >= 8) {
      out.push({
        tone: open.delta > 0 ? 'good' : 'warn',
        icon: 'fa-envelope-open-o',
        text: `Open rate ${open.delta > 0 ? 'improved' : 'slipped'} to ${open.rate}% (${open.delta > 0 ? '+' : ''}${open.delta}%).`,
      });
    }

    // Best send window, straight from the heatmap — the actionable one.
    const best = this.heatCells.reduce(
      (a, b) => (b.rate > (a?.rate ?? -1) ? b : a),
      null as IHeatCellView,
    );
    if (best && best.rate > 0) {
      out.push({
        tone: 'info',
        icon: 'fa-clock-o',
        text: `Best send window is ${HEAT_DAYS[best.dow]} ${HEAT_BUCKETS[best.bucket]}h at a ${best.rate}% reply rate.`,
      });
    }

    // The bounce-rate warning is GONE, not zeroed: the backend records no delivery
    // failures at all (`meta.bouncesTracked` is false — there is an SES SNS DTO but no
    // route consuming it), so "bounce rate is 0%" would be a claim the data cannot
    // support. It comes back on its own once bounce tracking exists.
    if (this.bouncesTracked) {
      const bounceRate = this.__pct(this.bounces, this.scopedSent);
      if (bounceRate >= 2) {
        out.push({
          tone: 'warn',
          icon: 'fa-exclamation-triangle',
          text: `Bounce rate is ${bounceRate}% — above the 2% threshold that puts sender reputation at risk.`,
        });
      }
    }

    if (!out.length && sent) {
      out.push({
        tone: 'info',
        icon: 'fa-check',
        // "No material change" is only sayable against a baseline. Without one, say
        // what IS known rather than implying the trend was checked and found flat.
        text: this.compareLabel
          ? `Steady period: ${this.compact(sent.total)} sent with no material change in engagement.`
          : `${this.compact(sent.total)} sent over ${this.rangeLabel}. No earlier period of the same length to compare against.`,
      });
    }

    this.insights = out.slice(0, 3);
  }

  // ── Deliverability ──────────────────────────────────────────────────────
  delivery: IDeliveryRow[] = [];
  /** Null when bounces aren't tracked — there is then no delivered figure to state. */
  deliveredPct: number | null = null;

  /**
   * True only when the backend actually measures delivery failures. Today it does not,
   * so the bounce row and the delivered percentage are OMITTED rather than shown as
   * zero: "0% bounced / 100% delivered" reads as perfect deliverability when the truth
   * is that nothing was measured. The unsubscribe row is real either way.
   */
  get bouncesTracked(): boolean {
    return !!this.stats?.meta?.bouncesTracked;
  }

  /** Placeholder until bounce tracking exists; see `bouncesTracked`. */
  private readonly bounces = 0;

  private __buildDelivery(): void {
    const sent = this.scopedSent;
    const unsubscribes = this.__scopedUnsubscribes();
    const rows: IDeliveryRow[] = [];

    if (this.bouncesTracked) {
      // `delivered` is derived, not stored: sent minus bounces, so it can never
      // contradict the other two numbers.
      const delivered = Math.max(sent - this.bounces, 0);
      this.deliveredPct = this.__pct(delivered, sent);
      rows.push(
        { label: 'Delivered', value: delivered, pct: this.deliveredPct, tone: 'good' },
        {
          label: 'Bounced',
          value: this.bounces,
          pct: this.__pct(this.bounces, sent),
          tone: 'warn',
        },
      );
    } else {
      this.deliveredPct = null;
      // What IS known: how many went out. Not labelled "delivered", because whether
      // they arrived is exactly the thing that isn't measured.
      rows.push({ label: 'Sent', value: sent, pct: sent ? 100 : 0, tone: 'good' });
    }

    rows.push({
      label: 'Unsubscribed',
      value: unsubscribes,
      pct: this.__pct(unsubscribes, sent),
      tone: 'neutral',
    });
    this.delivery = rows;
  }

  // ── Send-window heatmap ─────────────────────────────────────────────────
  readonly heatDays = HEAT_DAYS;
  readonly heatBuckets = HEAT_BUCKETS;
  heatCells: IHeatCellView[] = [];
  heatMaxRate = 0;

  /**
   * Reply rate per weekday × time bucket, accumulated from the same rows the chart
   * uses — so it follows the range and the campaign scope for free. Sequential
   * ONE-hue ramp: this is magnitude, so intensity carries the value and a legend
   * states the range.
   */
  private __buildHeat(): void {
    const grid = new Map<string, { sent: number; replies: number }>();

    for (const row of this.visibleRows) {
      const dow = this.__dayStart(row.date).getDay();
      row.buckets.forEach((b, bucket) => {
        if (!b.sent && !b.replies) return;
        const key = `${dow}-${bucket}`;
        const cell = grid.get(key);
        if (cell) {
          cell.sent += b.sent;
          cell.replies += b.replies;
        } else {
          grid.set(key, { sent: b.sent, replies: b.replies });
        }
      });
    }

    // Emit every combination, including the empty ones, so the grid always renders
    // as a full rectangle rather than losing cells.
    const cells: IHeatCellView[] = [];
    let max = 0;
    for (let dow = 0; dow < HEAT_DAYS.length; dow++) {
      for (let bucket = 0; bucket < HEAT_BUCKETS.length; bucket++) {
        const cell = grid.get(`${dow}-${bucket}`) || { sent: 0, replies: 0 };
        const rateExact = cell.sent ? (cell.replies / cell.sent) * 100 : 0;
        max = Math.max(max, rateExact);
        cells.push({
          dow,
          bucket,
          rate: Math.round(rateExact * 10) / 10,
          sent: cell.sent,
          intensity: rateExact, // rescaled below, once the max is known
          title: cell.sent
            ? `${HEAT_DAYS[dow]} ${HEAT_BUCKETS[bucket]}h — ${Math.round(rateExact * 10) / 10}% reply rate from ${cell.sent} sent`
            : `${HEAT_DAYS[dow]} ${HEAT_BUCKETS[bucket]}h — nothing sent`,
        });
      }
    }

    this.heatMaxRate = Math.max(max, 1);
    for (const c of cells) c.intensity = c.intensity / this.heatMaxRate;
    this.heatCells = cells;
  }

  cellAt = (dow: number, bucket: number): IHeatCellView =>
    this.heatCells.find((c) => c.dow === dow && c.bucket === bucket);

  /** Single-hue ramp. Alpha carries magnitude; the hue never changes. */
  heatColor = (intensity: number): string => {
    if (!intensity) return '#f6f8fb';
    return `rgba(9, 93, 209, ${(0.1 + intensity * 0.85).toFixed(3)})`;
  };

  // ── Top clicked links ───────────────────────────────────────────────────
  topLinks: IDashboardLinkCount[] = [];
  topLinkPeak = 0;

  /** Clicks per destination for the window and campaign scope on screen. */
  private __buildTopLinks(): void {
    const totals = new Map<string, number>();

    for (const row of this.visibleRows) {
      for (const link of row.links) {
        totals.set(link.key, (totals.get(link.key) || 0) + link.count);
      }
    }

    this.topLinks = [...totals.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    this.topLinkPeak = this.topLinks[0]?.count || 0;
  }

  // ── Activity feed ───────────────────────────────────────────────────────
  visibleActivity: IDashboardActivity[] = [];

  /**
   * Scoped by CAMPAIGN but deliberately not by the date range: this is an unbounded
   * "latest events" feed, and a feed that empties out when you narrow the range to 7
   * days reads as broken rather than as filtered.
   */
  private __buildActivity(): void {
    const all = this.isAllCampaigns;
    this.visibleActivity = (this.stats.recentActivity || []).filter(
      (a) => all || this.selectedCampaignIds.has(a.campaignId),
    );
  }

  // ── Most engaged contacts ───────────────────────────────────────────────

  /**
   * Read the ranking for the selected metric out of the fetched response.
   *
   * The server ranks and truncates — each of the three lists is its own
   * `ORDER BY … LIMIT`, so every metric's top-N is exactly right rather than being
   * re-sorted from one shared list (which would miss a contact who is 3rd by replies
   * but 200th by opens). Ranking by opens, clicks and replies deliberately gives
   * different people: a contact who opens everything and never replies is a different
   * kind of lead from one who replies twice and never opens again.
   *
   * All this does locally is pick the right list and scale the bar — which is why the
   * metric tabs cost no request.
   */
  private __buildEngagedContacts(): void {
    const metric = this.selectedEngagementMetric;
    const source =
      metric === 'opens'
        ? this.engaged?.byOpens
        : metric === 'clicks'
          ? this.engaged?.byClicks
          : this.engaged?.byReplies;

    const rows: IEngagedContactRow[] = (source || []).map((c) => ({
      contactId: c.contactId,
      name: c.name || c.email || 'Unknown contact',
      email: c.email,
      opens: c.opens,
      clicks: c.clicks,
      replies: c.replies,
      lastActivity: c.lastActivity,
      barPct: 0,
    }));

    // The list is already sorted by the ranked metric, so the leader is row 0.
    const peak = rows[0]?.[metric] || 0;
    for (const r of rows) r.barPct = peak ? Math.round((r[metric] / peak) * 100) : 0;
    this.engagedContacts = rows;
  }

  /** Emphasise whichever count column the list is currently ranked by. */
  isRankedBy = (key: EngagementMetricKey): boolean => this.selectedEngagementMetric === key;

  // ── Sortable campaign table ─────────────────────────────────────────────
  sortKey: keyof IDashboardCampaignRow = 'sent';
  sortDir: 'asc' | 'desc' = 'desc';
  campaignRows: IDashboardCampaignRow[] = [];

  sortBy = (key: keyof IDashboardCampaignRow): void => {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      this.sortKey = key;
      this.sortDir = 'desc';
    }
    this.__applySort();
  };

  /**
   * Each campaign's figures for the window on screen, summed from the same rows as
   * everything else — so the row you click to filter by always agrees with the tiles
   * you get after clicking it. A DRAFT campaign has no rows and correctly reads 0.
   *
   * These are NOT scoped by the campaign selection: the table is how you change that
   * selection, so hiding the unselected rows would make it a one-way door.
   */
  private __buildCampaignRows(): void {
    const byCampaign = new Map<number, { sent: number; opens: number; clicks: number; replies: number }>();

    for (const point of this.visibleTrend) {
      for (const row of this.rowsByDate.get(point.date) || []) {
        const acc = byCampaign.get(row.campaignId);
        if (acc) {
          acc.sent += row.sent;
          acc.opens += row.opens;
          acc.clicks += row.clicks;
          acc.replies += row.replies;
        } else {
          byCampaign.set(row.campaignId, {
            sent: row.sent,
            opens: row.opens,
            clicks: row.clicks,
            replies: row.replies,
          });
        }
      }
    }

    this.campaignRows = (this.stats.campaigns || []).map((meta) => {
      const t = byCampaign.get(meta.id);
      const sent = t?.sent || 0;
      return {
        ...meta,
        sent,
        openRate: this.__pct(t?.opens || 0, sent),
        clickRate: this.__pct(t?.clicks || 0, sent),
        replyRate: this.__pct(t?.replies || 0, sent),
        selected: this.selectedCampaignIds.has(meta.id),
      };
    });
    this.__applySort();
  }

  private __applySort(): void {
    const k = this.sortKey;
    const dir = this.sortDir === 'asc' ? 1 : -1;

    this.campaignRows = [...this.campaignRows].sort((a, b) => {
      const av = a[k];
      const bv = b[k];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  /** Funnel = magnitude → one hue, light to dark. Steps, never a rainbow. */
  private __buildFunnel(): void {
    const cur = this.visibleTrend;
    const sent = this.__sum(cur, 'sent');
    const opens = this.__sum(cur, 'opens');
    const clicks = this.__sum(cur, 'clicks');
    const replies = this.__sum(cur, 'replies');

    // `stepPct` is conversion from the stage above, which is where drop-off shows.
    // Share-of-sent alone hides that opens→clicks is the weak link.
    this.funnel = [
      { label: 'Sent', value: sent, pct: 100, stepPct: null, step: 'step-1' },
      {
        label: 'Opened',
        value: opens,
        pct: this.__pct(opens, sent),
        stepPct: this.__pct(opens, sent),
        step: 'step-2',
      },
      {
        label: 'Clicked',
        value: clicks,
        pct: this.__pct(clicks, sent),
        stepPct: this.__pct(clicks, opens),
        step: 'step-3',
      },
      {
        label: 'Replied',
        value: replies,
        pct: this.__pct(replies, sent),
        stepPct: this.__pct(replies, clicks),
        step: 'step-4',
      },
    ];
  }
}
