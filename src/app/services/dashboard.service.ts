import { Injectable } from '@angular/core';
import { constants } from '../helpers/constants';
import {
  IDashboardHeatCell,
  IDashboardStats,
  IDashboardTrendPoint,
} from '../models/DashboardStats';

/**
 * Dashboard statistics.
 *
 * MOCK DATA FOR NOW — but it is generated into the exact shapes the real endpoints
 * return (see `models/DashboardStats.ts`), so going live means replacing the body of
 * `getStats()` with the HTTP call and deleting the generators. Nothing in the page
 * or template needs to change.
 *
 * The intended real implementation is roughly:
 *
 *   getStats = async (): Promise<IDashboardStats> => {
 *     const res = await lastValueFrom(this.httpService.get('dashboard/stats'));
 *     return res.data;
 *   };
 *
 * Until that endpoint exists, the numbers below are deterministic (a seeded PRNG,
 * not Math.random) so the dashboard does not reshuffle on every navigation — which
 * would make it impossible to tell a real data bug from mock noise.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  /** Longest window the UI offers, so one series can serve every range. */
  private readonly TREND_DAYS = 90;

  /**
   * Deterministic PRNG (mulberry32). Mock data must be STABLE: with Math.random the
   * numbers would change on every route change and a genuine regression would be
   * indistinguishable from noise.
   */
  private seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  async getStats(): Promise<IDashboardStats> {
    // Mimic a network round trip so the page's loading state is actually exercised.
    await new Promise((r) => setTimeout(r, 450));

    const trend = this.__buildTrend();
    const totals = this.__sumTrend(trend);

    return {
      totals,
      trend,
      campaigns: this.__buildCampaigns(),
      recentActivity: this.__buildActivity(),
      sendWindows: this.__buildSendWindows(),
      topLinks: [
        { key: 'policyninja.co/pricing', count: 148 },
        { key: 'policyninja.co/book-a-call', count: 96 },
        { key: 'policyninja.co/case-studies', count: 61 },
        { key: 'policyninja.co/blog/claims-guide', count: 34 },
        { key: 'policyninja.co/about', count: 19 },
      ],
    };
  }

  /** A believable series with a weekly rhythm (weekends dip) and a slow uptrend. */
  private __buildTrend(): IDashboardTrendPoint[] {
    const rand = this.seeded(20260729);
    const points: IDashboardTrendPoint[] = [];
    const today = new Date();

    for (let i = this.TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dow = d.getDay();
      const weekend = dow === 0 || dow === 6;

      const base = weekend ? 22 : 120;
      const drift = ((this.TREND_DAYS - i) / this.TREND_DAYS) * 40; // slow growth
      const sent = Math.round(base + drift + rand() * 45);

      // Funnel ratios stay plausible and ordered: opens > clicks > replies.
      const opens = Math.round(sent * (0.38 + rand() * 0.16));
      const clicks = Math.round(opens * (0.22 + rand() * 0.14));
      const replies = Math.round(clicks * (0.18 + rand() * 0.16));

      points.push({
        date: d.toISOString().slice(0, 10),
        sent,
        opens,
        clicks,
        replies,
      });
    }
    return points;
  }

  /** Totals are DERIVED from the series so the tiles and the chart always agree. */
  private __sumTrend(trend: IDashboardTrendPoint[]) {
    const sum = (k: keyof IDashboardTrendPoint) =>
      trend.reduce((acc, p) => acc + (p[k] as number), 0);

    const emailsSent = sum('sent');
    return {
      contacts: 4812,
      lists: 27,
      dripCampaigns: 14,
      activeCampaigns: 5,
      emailsSent,
      opens: sum('opens'),
      clicks: sum('clicks'),
      replies: sum('replies'),
      unsubscribes: Math.round(emailsSent * 0.006),
      bounces: Math.round(emailsSent * 0.011),
    };
  }

  private __buildCampaigns() {
    return [
      {
        id: 41,
        title: 'Insurance renewals — Q3 follow-up',
        status: constants.ACTIVE,
        numberOfEmails: 5,
        sent: 1840,
        openRate: 52,
        clickRate: 14,
        replyRate: 6,
        createdAt: '2026-06-02T09:12:00.000Z',
      },
      {
        id: 38,
        title: 'Broker partnership outreach',
        status: constants.ACTIVE,
        numberOfEmails: 4,
        sent: 1265,
        openRate: 47,
        clickRate: 12,
        replyRate: 5,
        createdAt: '2026-05-21T14:03:00.000Z',
      },
      {
        id: 35,
        title: 'Commercial auto — cold sequence',
        status: constants.PAUSE,
        numberOfEmails: 6,
        sent: 980,
        openRate: 39,
        clickRate: 9,
        replyRate: 3,
        createdAt: '2026-05-08T11:41:00.000Z',
      },
      {
        id: 31,
        title: 'Lapsed policyholders win-back',
        status: constants.COMPLETE,
        numberOfEmails: 3,
        sent: 742,
        openRate: 58,
        clickRate: 19,
        replyRate: 8,
        createdAt: '2026-04-17T08:25:00.000Z',
      },
      {
        id: 27,
        title: 'Small business bundles',
        status: constants.DRAFT,
        numberOfEmails: 4,
        sent: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        createdAt: '2026-04-02T16:57:00.000Z',
      },
    ];
  }

  /**
   * Reply rate by weekday × time-of-day. Shaped so business-hours midweek performs
   * best and weekends barely register — the pattern real outreach data shows, so the
   * heatmap is legible rather than noise.
   */
  private __buildSendWindows(): IDashboardHeatCell[] {
    const rand = this.seeded(880123);
    const cells: IDashboardHeatCell[] = [];

    for (let dow = 0; dow < 7; dow++) {
      const weekend = dow === 0 || dow === 6;
      for (let bucket = 0; bucket < 4; bucket++) {
        // Late morning and early afternoon are the strong windows.
        const bucketWeight = [1, 1.25, 1.05, 0.6][bucket];
        const dayWeight = weekend ? 0.18 : 1;
        const sent = Math.round((60 + rand() * 90) * dayWeight * bucketWeight);
        const replyRate = (weekend ? 0.012 : 0.035) * bucketWeight + rand() * 0.012;
        cells.push({ dow, bucket, sent, replies: Math.round(sent * replyRate) });
      }
    }
    return cells;
  }

  private __buildActivity() {
    return [
      {
        id: 9001,
        type: constants.REPLY,
        contactName: 'Kimberly Hannah',
        email: 'kimberlynoble0616@gmail.com',
        campaignTitle: 'Insurance renewals — Q3 follow-up',
        occurredAt: '2026-07-29T16:42:00.000Z',
      },
      {
        id: 9002,
        type: constants.CLICK,
        contactName: 'Charles Allen',
        email: 'chuckultraone@gmail.com',
        campaignTitle: 'Broker partnership outreach',
        occurredAt: '2026-07-29T15:18:00.000Z',
        clickedLink: 'policyninja.co/pricing',
      },
      {
        id: 9003,
        type: constants.OPEN,
        contactName: 'Michel Caron',
        email: 'm.caron@brokerline.ca',
        campaignTitle: 'Insurance renewals — Q3 follow-up',
        occurredAt: '2026-07-29T14:05:00.000Z',
      },
      {
        id: 9004,
        type: constants.CLICK,
        contactName: 'Dave Coppins',
        email: 'dave@coppinsgroup.com',
        campaignTitle: 'Commercial auto — cold sequence',
        occurredAt: '2026-07-29T11:47:00.000Z',
        clickedLink: 'policyninja.co/book-a-call',
      },
      {
        id: 9005,
        type: 'unsubscribe',
        contactName: 'Benjamin Rutz',
        email: 'b.rutz@rutzco.com',
        campaignTitle: 'Broker partnership outreach',
        occurredAt: '2026-07-29T09:30:00.000Z',
      },
      {
        id: 9006,
        type: constants.REPLY,
        contactName: 'David Languedoc',
        email: 'dlanguedoc@maritimeins.ca',
        campaignTitle: 'Lapsed policyholders win-back',
        occurredAt: '2026-07-28T17:12:00.000Z',
      },
    ];
  }
}
