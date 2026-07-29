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
  /** Signed % change vs the preceding window of equal length. */
  delta: number;
  /** Formatted headline (compact for counts, `NN%` for rates). */
  display: string;
}

interface IAxisTick {
  /** Position along the axis, 0-100. */
  pct: number;
  label: string;
}

@Component({
  selector: 'app-brand-dashboard',
  imports: [CommonModule, BrandLayoutComponent],
  templateUrl: './brand-dashboard.component.html',
  styleUrl: './brand-dashboard.component.scss',
})
export class BrandDashboardComponent implements OnInit {
  readonly ranges = DASHBOARD_RANGES;
  readonly constants = constants;
  readonly brand = routeConstants.BRAND;

  isLoading = true;
  stats: IDashboardStats;
  userName = '';
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

  funnel: { label: string; value: number; pct: number; step: string }[] = [];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const user: any = this.authService.userTokenValue || {};
    this.userName = (user.first_name || user.supplier_name || '').trim();

    this.isLoading = true;
    try {
      this.stats = await this.dashboardService.getStats();
      this.lastUpdated = new Date();
      this.__recompute();
    } finally {
      this.isLoading = false;
    }
  }

  selectRange = (days: number): void => {
    if (days === this.selectedDays) return;
    this.selectedDays = days;
    this.hoverIndex = -1;
    this.__recompute();
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

  // ── Recompute ───────────────────────────────────────────────────────────
  private __recompute(): void {
    if (!this.stats) return;

    const all = this.stats.trend;
    const n = Math.min(this.selectedDays, all.length);
    this.visibleTrend = all.slice(-n);
    this.previousTrend = all.slice(Math.max(0, all.length - n * 2), all.length - n);

    this.__buildTiles();
    this.__buildChart();
    this.__buildFunnel();
  }

  private __sum(rows: IDashboardTrendPoint[], k: MetricKey): number {
    return rows.reduce((acc, p) => acc + (p[k] as number), 0);
  }

  private __pct(part: number, whole: number): number {
    return whole ? Math.round((part / whole) * 100) : 0;
  }

  private __delta(current: number, previous: number): number {
    if (!previous) return 0;
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

    const stepX = 100 / (cur.length - 1);
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

  /** Funnel = magnitude → one hue, light to dark. Steps, never a rainbow. */
  private __buildFunnel(): void {
    const cur = this.visibleTrend;
    const sent = this.__sum(cur, 'sent');
    const opens = this.__sum(cur, 'opens');
    const clicks = this.__sum(cur, 'clicks');
    const replies = this.__sum(cur, 'replies');

    this.funnel = [
      { label: 'Sent', value: sent, pct: 100, step: 'step-1' },
      { label: 'Opened', value: opens, pct: this.__pct(opens, sent), step: 'step-2' },
      { label: 'Clicked', value: clicks, pct: this.__pct(clicks, sent), step: 'step-3' },
      { label: 'Replied', value: replies, pct: this.__pct(replies, sent), step: 'step-4' },
    ];
  }
}
