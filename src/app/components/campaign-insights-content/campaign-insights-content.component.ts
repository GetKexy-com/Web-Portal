import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';

import { CsvHelper } from '../../helpers/CSVHelper';
import {
  CAMPAIGN_INSIGHT_RANGES,
  ICampaignAnalytics,
  ICampaignAnalyticsContact,
  ICampaignAnalyticsEmailRow,
  ICampaignAnalyticsTrendPoint,
} from '../../models/CampaignAnalytics';
import { DashboardService } from '../../services/dashboard.service';
import { InsightsStatisticsCardComponent } from '../insights-statistics-card/insights-statistics-card.component';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';

type EngagementMetric = 'opens' | 'clicks' | 'replies';

/** One point on the plotted series, already reduced to chart coordinates. */
interface IChartPoint {
  x: number;
  y: number;
  date: string;
  value: number;
}

/**
 * "Insights" for a drip campaign, at either of TWO scopes: the whole campaign (the
 * button beside Settings) or ONE email in the sequence (the Insights button on an
 * email row). Set `emailId` for the latter.
 *
 * ── Why one component and not two ───────────────────────────────────────────
 * There used to be a separate `email-insights-content`, and it was broken: it read
 * the insights table through the TypeORM repository, which `SELECT`s every declared
 * column including `email_notification_sent` — a column the live table does not have
 * — so `GET drip-campaigns/:id/insights` returned 400 on every call. It also
 * re-derived rates, rankings and link counts in the browser from raw rows.
 *
 * Rather than repair that, the per-email view moved onto this component's endpoint,
 * which does the aggregation in scoped SQL and is immune to the drift. The two scopes
 * ask the same questions of the same data, so they are one report with a filter, and
 * `perEmail` (the only campaign-only panel) simply comes back empty when scoped.
 *
 * ── Everything here is derived, nothing is stored twice ─────────────────────
 * The API returns raw counts only. Rates, deltas, funnel steps and chart geometry are
 * all computed in `__recompute` and held in FIELDS, not getters: a getter would
 * recompute on every change-detection pass, and the chart's hover layer runs CD on
 * every mouse move.
 */
@Component({
  selector: 'campaign-insights-content',
  imports: [CommonModule, InsightsStatisticsCardComponent, KexyButtonComponent],
  templateUrl: './campaign-insights-content.component.html',
  styleUrl: './campaign-insights-content.component.scss',
})
export class CampaignInsightsContentComponent implements OnInit {
  /** Set on the component instance by the opener, before the drawer renders. */
  campaignId: number;
  /** Shown in the header until the API confirms the real title. */
  campaignTitle = '';
  /**
   * Set to scope the whole drawer to ONE email. Left undefined for the campaign view.
   * Everything that differs between the two keys off this.
   */
  emailId?: number;
  /** Seeds the summary so it names the email on the first frame, before the fetch. */
  emailSequence?: number;
  emailSubject = '';

  get isEmailScope(): boolean {
    return !!this.emailId;
  }

  readonly ranges = CAMPAIGN_INSIGHT_RANGES;
  readonly engagementMetrics: { key: EngagementMetric; label: string }[] = [
    { key: 'opens', label: 'Opens' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'replies', label: 'Replies' },
  ];

  selectedDays = 30;
  selectedMetric: EngagementMetric = 'opens';
  engagementMetric: EngagementMetric = 'clicks';

  isLoading = true;
  loadError = '';
  data: ICampaignAnalytics = null;

  // ── Derived ─────────────────────────────────────────────────────────────
  openRate = 0;
  clickRate = 0;
  replyRate = 0;
  /** Signed % change vs the preceding window, or NULL when there was no baseline. */
  sentDelta: number | null = null;
  funnel: { label: string; value: number; pct: number; stepPct: number | null; step: string }[] = [];
  perEmail: (ICampaignAnalyticsEmailRow & {
    openRate: number;
    clickRate: number;
    replyRate: number;
  })[] = [];
  linkPeak = 0;

  // ── Chart ───────────────────────────────────────────────────────────────
  // A 0-100 x 0-100 viewBox, so every coordinate IS a percentage and the HTML axis
  // labels share one coordinate space with the SVG. Same approach as the dashboard.
  chartLine = '';
  chartArea = '';
  chartPoints: IChartPoint[] = [];
  yTicks: { pct: number; label: string }[] = [];
  xTicks: { pct: number; label: string }[] = [];
  hoverIndex = -1;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    this.__load();
  }

  get engagedContacts(): ICampaignAnalyticsContact[] {
    const lists = this.data?.engagedContacts;
    if (!lists) return [];
    if (this.engagementMetric === 'opens') return lists.byOpens;
    if (this.engagementMetric === 'clicks') return lists.byClicks;
    return lists.byReplies;
  }

  get hoverPoint(): IChartPoint | null {
    return this.hoverIndex >= 0 ? this.chartPoints[this.hoverIndex] : null;
  }

  selectRange = (days: number): void => {
    if (days === this.selectedDays) return;
    this.selectedDays = days;
    this.hoverIndex = -1;
    // Unlike the dashboard's range switch this DOES cost a request — the window is
    // applied in SQL, so a shorter range isn't a slice of something already loaded.
    this.__load();
  };

  selectMetric = (key: EngagementMetric): void => {
    if (key === this.selectedMetric) return;
    this.selectedMetric = key;
    this.hoverIndex = -1;
    this.__buildChart();
  };

  selectEngagementMetric = (key: EngagementMetric): void => {
    this.engagementMetric = key;
  };

  /** Nearest point to the cursor. The plot is evenly spaced, so this is arithmetic. */
  onChartMove = (event: MouseEvent): void => {
    if (!this.chartPoints.length) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!box.width) return;

    const ratio = (event.clientX - box.left) / box.width;
    const index = Math.round(ratio * (this.chartPoints.length - 1));
    this.hoverIndex = Math.min(Math.max(index, 0), this.chartPoints.length - 1);
  };

  clearHover = (): void => {
    this.hoverIndex = -1;
  };

  /** Nothing to export before the data lands, or when the scope has no rows. */
  get canExport(): boolean {
    return this.isEmailScope ? !!this.engagedContacts.length : !!this.perEmail.length;
  }

  /**
   * The export follows the SCOPE, because the useful sheet differs between the two.
   *
   * Campaign: the per-email league table — the figure no other export produces.
   * Email: the engaged contacts, which is what the old per-email drawer exported and
   * what people actually chase up. Exporting a one-row league table would be useless,
   * and exporting the contact list at campaign scope would just be a worse version of
   * the dashboard's contact export.
   */
  exportCSV = async (): Promise<void> => {
    if (!this.canExport) return;

    const name = this.__csvCell(this.campaignTitle || 'campaign').replace(/\s+/g, '-');

    if (this.isEmailScope) {
      const headers = 'Name,Email,Job Title,Company,Opens,Clicks,Replies,Last Activity';
      const rows = this.engagedContacts
        .map((c) =>
          [
            this.__csvCell(c.name),
            this.__csvCell(c.email),
            this.__csvCell(c.jobTitle),
            this.__csvCell(c.companyName),
            c.opens,
            c.clicks,
            c.replies,
            this.__csvCell(c.lastActivity),
          ].join(','),
        )
        .join('\n');
      await CsvHelper.download(
        `${name}-email-${this.emailSequence ?? this.emailId}-contacts.csv`,
        `${headers}\n${rows}`,
      );
      return;
    }

    const headers =
      'Email Number,Subject,Sent,Opens,Clicks,Replies,Open Rate %,Click Rate %,Reply Rate %';
    const rows = this.perEmail
      .map((e) =>
        [
          e.sequence,
          this.__csvCell(e.subject),
          e.sent,
          e.opens,
          e.clicks,
          e.replies,
          e.openRate,
          e.clickRate,
          e.replyRate,
        ].join(','),
      )
      .join('\n');

    await CsvHelper.download(`${name}-insights.csv`, `${headers}\n${rows}`);
  };

  private async __load(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      this.data = await this.dashboardService.getCampaignAnalytics(
        this.campaignId,
        this.selectedDays,
        10,
        this.emailId,
      );
      this.campaignTitle = this.data.campaign.title;
      if (this.data.email) {
        this.emailSequence = this.data.email.sequence;
        this.emailSubject = this.data.email.subject;
      }
      this.__recompute();
    } catch (error: any) {
      // An empty drawer and a failed request look identical, so say which it was
      // rather than leaving zeros to be read as real numbers.
      this.loadError = error?.message || 'Could not load insights for this campaign.';
    } finally {
      this.isLoading = false;
    }
  }

  private __recompute(): void {
    const t = this.data.totals;

    this.openRate = this.__pct(t.opens, t.sent);
    this.clickRate = this.__pct(t.clicks, t.sent);
    this.replyRate = this.__pct(t.replies, t.sent);
    this.sentDelta = this.__delta(t.sent, this.data.previous.sent);

    this.perEmail = this.data.perEmail.map((e) => ({
      ...e,
      openRate: this.__pct(e.opens, e.sent),
      clickRate: this.__pct(e.clicks, e.sent),
      replyRate: this.__pct(e.replies, e.sent),
    }));

    this.linkPeak = this.data.topLinks.reduce((max, l) => Math.max(max, l.count), 0);
    this.__buildFunnel();
    this.__buildChart();
  }

  private __buildFunnel(): void {
    const t = this.data.totals;
    const stages = [
      { label: 'Sent', value: t.sent, step: 'step-1' },
      { label: 'Opened', value: t.opens, step: 'step-2' },
      { label: 'Clicked', value: t.clicks, step: 'step-3' },
      { label: 'Replied', value: t.replies, step: 'step-4' },
    ];

    this.funnel = stages.map((s, i) => ({
      ...s,
      pct: this.__pct(s.value, t.sent),
      // Conversion from the stage ABOVE — where drop-off actually shows. Share of
      // sent alone hides that opens -> clicks is usually the weak link.
      stepPct: i === 0 ? null : this.__pct(s.value, stages[i - 1].value),
    }));
  }

  private __buildChart(): void {
    const series: ICampaignAnalyticsTrendPoint[] = this.data?.trend || [];
    this.chartPoints = [];
    this.chartLine = '';
    this.chartArea = '';
    this.yTicks = [];
    this.xTicks = [];
    if (!series.length) return;

    const values = series.map((p) => p[this.selectedMetric]);
    const peak = this.__niceMax(Math.max(...values, 0));

    // A single point has no span to divide by; pin it to the left edge rather than
    // dividing by zero.
    const span = series.length > 1 ? series.length - 1 : 1;

    this.chartPoints = series.map((p, i) => {
      const value = p[this.selectedMetric];
      return {
        x: (i / span) * 100,
        // SVG y grows downward, so a bigger value is a SMALLER y.
        y: 100 - (value / peak) * 100,
        date: p.date,
        value,
      };
    });

    this.chartLine = this.chartPoints.map((p) => `${p.x},${p.y}`).join(' ');
    this.chartArea = `0,100 ${this.chartLine} 100,100`;

    this.yTicks = [0, 0.5, 1].map((f) => ({
      pct: f * 100,
      label: this.__compact(Math.round(peak * f)),
    }));

    // Three labels only — first, middle, last. A tick per day is unreadable at this
    // width and a drawer is narrower than the dashboard the pattern came from.
    const marks = series.length > 2 ? [0, Math.floor(span / 2), span] : [0, span];
    this.xTicks = [...new Set(marks)].map((i) => ({
      pct: (i / span) * 100,
      label: this.__shortDate(series[i].date),
    }));
  }

  // ── Small helpers ───────────────────────────────────────────────────────

  /** Rounded to one decimal. Zero denominator yields 0, never NaN or Infinity. */
  private __pct(part: number, whole: number): number {
    if (!whole) return 0;
    return Math.round((part / whole) * 1000) / 10;
  }

  /**
   * Signed % change, or NULL when there is no baseline to divide by.
   *
   * Null is NOT the same statement as 0: "nothing to compare against" and "no change"
   * are different findings, and rounding the first into the second claims a flat
   * trend that was never measured.
   */
  private __delta(current: number, previous: number): number | null {
    if (!previous) return null;
    return Math.round(((current - previous) / previous) * 100);
  }

  private __niceMax(peak: number): number {
    if (peak <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(peak)));
    return Math.ceil(peak / magnitude) * magnitude;
  }

  private __compact(value: number): string {
    if (value >= 1000000) return `${Math.round(value / 100000) / 10}M`;
    if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
    return `${value}`;
  }

  private __shortDate(iso: string): string {
    // Parsed as LOCAL midnight, not UTC: `new Date('2026-07-31')` is UTC midnight and
    // renders as the 30th anywhere west of Greenwich.
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /** Commas and newlines would break the row; quotes would break the cell. */
  private __csvCell(value: string): string {
    return (value || '').replace(/[",\r\n]+/g, ' ').trim();
  }
}
