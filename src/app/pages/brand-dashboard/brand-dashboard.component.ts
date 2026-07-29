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

/** One bar in the SVG chart, pre-computed (see `__buildChart`). */
interface IChartBar {
  x: number;
  y: number;
  height: number;
  width: number;
  label: string;
  value: number;
}

/** A stage of the sent → opened → clicked → replied funnel. */
interface IFunnelStage {
  label: string;
  value: number;
  /** Share of `emailsSent`, 0-100, for the meter width. */
  pct: number;
  /** Sequential step of ONE hue — a funnel is magnitude, not identity. */
  color: string;
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
  selectedDays: number = 30;

  /** The trend sliced to the selected range. */
  visibleTrend: IDashboardTrendPoint[] = [];

  // ── Derived view state ──────────────────────────────────────────────────
  // Everything below is a FIELD recomputed by `__recompute()`, never a template
  // getter: getters here would re-run on every change-detection pass, and the SVG
  // maths is not free.
  sentInRange = 0;
  openRate = 0;
  clickRate = 0;
  replyRate = 0;
  /** Signed % change vs the preceding window of equal length. */
  sentDelta = 0;
  openRateDelta = 0;
  clickRateDelta = 0;
  replyRateDelta = 0;

  chartBars: IChartBar[] = [];
  chartPeakLabel = '';
  readonly chartW = 720;
  readonly chartH = 180;

  funnel: IFunnelStage[] = [];
  sparkPaths: { sent: string; opens: string; clicks: string; replies: string } = {
    sent: '',
    opens: '',
    clicks: '',
    replies: '',
  };

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
      this.__recompute();
    } finally {
      this.isLoading = false;
    }
  }

  selectRange = (days: number): void => {
    if (days === this.selectedDays) return;
    this.selectedDays = days;
    this.__recompute();
  };

  goTo = (path: string): void => {
    this.router.navigate([path]);
  };

  /** Status → the reserved status palette. Never colour alone: the badge is labelled. */
  statusClass = (status: string): string => {
    switch (status) {
      case constants.ACTIVE:
        return 'is-active';
      case constants.PAUSE:
        return 'is-paused';
      case constants.COMPLETE:
        return 'is-complete';
      default:
        return 'is-draft';
    }
  };

  activityIcon = (type: string): string => {
    switch (type) {
      case constants.REPLY:
        return 'fa-reply';
      case constants.CLICK:
        return 'fa-mouse-pointer';
      case constants.OPEN:
        return 'fa-envelope-open-o';
      default:
        return 'fa-ban';
    }
  };

  activityClass = (type: string): string => {
    switch (type) {
      case constants.REPLY:
        return 'act-reply';
      case constants.CLICK:
        return 'act-click';
      case constants.OPEN:
        return 'act-open';
      default:
        return 'act-unsub';
    }
  };

  // ── Recompute ───────────────────────────────────────────────────────────
  private __recompute(): void {
    if (!this.stats) return;

    const all = this.stats.trend;
    const n = Math.min(this.selectedDays, all.length);
    this.visibleTrend = all.slice(-n);
    // The window immediately before this one, same length, for the deltas.
    const previous = all.slice(Math.max(0, all.length - n * 2), all.length - n);

    const sum = (rows: IDashboardTrendPoint[], k: keyof IDashboardTrendPoint) =>
      rows.reduce((acc, p) => acc + (p[k] as number), 0);

    this.sentInRange = sum(this.visibleTrend, 'sent');
    const opens = sum(this.visibleTrend, 'opens');
    const clicks = sum(this.visibleTrend, 'clicks');
    const replies = sum(this.visibleTrend, 'replies');

    this.openRate = this.__pct(opens, this.sentInRange);
    this.clickRate = this.__pct(clicks, this.sentInRange);
    this.replyRate = this.__pct(replies, this.sentInRange);

    const prevSent = sum(previous, 'sent');
    this.sentDelta = this.__delta(this.sentInRange, prevSent);
    this.openRateDelta = this.__delta(
      this.openRate,
      this.__pct(sum(previous, 'opens'), prevSent),
    );
    this.clickRateDelta = this.__delta(
      this.clickRate,
      this.__pct(sum(previous, 'clicks'), prevSent),
    );
    this.replyRateDelta = this.__delta(
      this.replyRate,
      this.__pct(sum(previous, 'replies'), prevSent),
    );

    this.__buildChart();
    this.__buildFunnel(opens, clicks, replies);
    this.__buildSparks();
  }

  private __pct(part: number, whole: number): number {
    if (!whole) return 0;
    return Math.round((part / whole) * 100);
  }

  /** Percentage change, rounded. 0 when there is no previous window to compare. */
  private __delta(current: number, previous: number): number {
    if (!previous) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Bars for "emails sent per day". ONE series on ONE axis, so it needs no legend
   * (the card title names it) and no categorical palette.
   */
  private __buildChart(): void {
    const rows = this.visibleTrend;
    if (!rows.length) {
      this.chartBars = [];
      return;
    }

    const peak = Math.max(...rows.map((r) => r.sent), 1);
    const gap = rows.length > 45 ? 1 : rows.length > 20 ? 2 : 6;
    const width = Math.max((this.chartW - gap * (rows.length - 1)) / rows.length, 1);

    this.chartBars = rows.map((r, i) => {
      // Floor the height at 2px so a zero/near-zero day is still a visible mark
      // rather than a gap that reads as missing data.
      const h = Math.max(Math.round((r.sent / peak) * this.chartH), 2);
      return {
        x: Math.round(i * (width + gap) * 100) / 100,
        y: this.chartH - h,
        height: h,
        width: Math.round(width * 100) / 100,
        label: r.date,
        value: r.sent,
      };
    });

    const peakRow = rows.reduce((a, b) => (b.sent > a.sent ? b : a), rows[0]);
    this.chartPeakLabel = `${peak} on ${peakRow.date}`;
  }

  /**
   * Funnel = magnitude, so it is ONE hue in light→dark steps, never a rainbow.
   * Percentages are all relative to `sent`, which is what makes the bars comparable.
   */
  private __buildFunnel(opens: number, clicks: number, replies: number): void {
    const sent = this.sentInRange;
    this.funnel = [
      { label: 'Sent', value: sent, pct: 100, color: '#bfdcff' },
      { label: 'Opened', value: opens, pct: this.__pct(opens, sent), color: '#7db8f7' },
      { label: 'Clicked', value: clicks, pct: this.__pct(clicks, sent), color: '#3b93ef' },
      { label: 'Replied', value: replies, pct: this.__pct(replies, sent), color: '#095dd1' },
    ];
  }

  /** 40×14 sparkline polylines for the KPI tiles (de-emphasised, no axes). */
  private __buildSparks(): void {
    const keys: (keyof IDashboardTrendPoint)[] = ['sent', 'opens', 'clicks', 'replies'];
    const out: any = {};
    const rows = this.visibleTrend.slice(-24);

    keys.forEach((k) => {
      const vals = rows.map((r) => r[k] as number);
      const max = Math.max(...vals, 1);
      const stepX = vals.length > 1 ? 40 / (vals.length - 1) : 0;
      out[k] = vals
        .map((v, i) => `${(i * stepX).toFixed(1)},${(14 - (v / max) * 12).toFixed(1)}`)
        .join(' ');
    });

    this.sparkPaths = out;
  }
}
