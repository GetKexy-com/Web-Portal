import { Injectable } from '@angular/core';
import { constants } from '../helpers/constants';
import {
  IDashboardBucketSplit,
  IDashboardCampaignMeta,
  IDashboardCampaignTrendPoint,
  IDashboardContactEngagement,
  IDashboardLinkCount,
  IDashboardStats,
} from '../models/DashboardStats';

/**
 * Per-campaign generation parameters. Only the mock needs these — the real endpoint
 * returns the resulting rows — so they stay private to this service rather than
 * going in the model.
 */
interface ICampaignSpec extends IDashboardCampaignMeta {
  /** Sends on a weekday while the campaign is running. Weekends are damped. */
  weekdaySend: number;
  /** Fractions of `sent`, 0-1. */
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
  unsubRate: number;
  /** Days ago that sending stopped; 0 = still sending today. */
  stopDaysAgo: number;
  /** Weights over `LINK_KEYS`, in order. Need not sum to 1. */
  linkWeights: number[];
}

/**
 * A contact's 90-day engagement, and which campaigns it came from.
 *
 * The three totals are set EXPLICITLY rather than derived from one "engagement"
 * score, because the leaderboard's whole point is that ranking by opens, clicks and
 * replies gives different answers. If one contact led all three, the segmented
 * control would look decorative — so the profiles below deliberately disagree.
 */
interface IContactSpec {
  id: number;
  name: string;
  email: string;
  campaignIds: number[];
  opens: number;
  clicks: number;
  replies: number;
  /** How far back this contact's activity reaches, in days. */
  spanDays: number;
}

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
 *
 * Everything flow-related is generated ONCE, per campaign per day, into
 * `stats.trend`. The page derives every panel from those rows, which is what lets
 * the campaign filter and the range switch scope the whole dashboard coherently —
 * see the "one fact table" note in the model.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  /** Longest window the UI offers, so one series can serve every range. */
  private readonly TREND_DAYS = 90;

  /** Click destinations, shared by every campaign with per-campaign weights. */
  private readonly LINK_KEYS = [
    'policyninja.co/pricing',
    'policyninja.co/book-a-call',
    'policyninja.co/case-studies',
    'policyninja.co/blog/claims-guide',
    'policyninja.co/about',
  ];

  /**
   * Share of a day's sends per time-of-day bucket, index-aligned with
   * `HEAT_BUCKETS`. Replies are distributed by the SQUARE of these weights, so the
   * reply RATE per bucket comes out proportional to the weight — late morning reads
   * as the strong window, which is the pattern real outreach data shows.
   */
  private readonly BUCKET_WEIGHTS = [1, 1.25, 1.05, 0.6];

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

    const specs = this.__campaignSpecs();

    return {
      totals: {
        contacts: 4812,
        lists: 27,
        dripCampaigns: 14,
        activeCampaigns: 5,
      },
      // Strip the generation parameters — the real endpoint returns identity only.
      campaigns: specs.map(({ id, title, status, numberOfEmails, createdAt }) => ({
        id,
        title,
        status,
        numberOfEmails,
        createdAt,
      })),
      trend: this.__buildTrend(specs),
      contactEngagement: this.__buildContactEngagement(),
      recentActivity: this.__buildActivity(),
    };
  }

  /**
   * Volumes are chosen so each campaign's 90-day total lands near its historical
   * figure, and the rates differ enough that segmenting to one campaign visibly
   * changes every panel. The DRAFT campaign generates no rows at all — a draft has
   * sent nothing, and the page shows it with zeros from the absence of rows rather
   * than from a stored zero.
   */
  private __campaignSpecs(): ICampaignSpec[] {
    return [
      {
        id: 41,
        title: 'Insurance renewals — Q3 follow-up',
        status: constants.ACTIVE,
        numberOfEmails: 5,
        createdAt: '2026-06-02T09:12:00.000Z',
        weekdaySend: 42,
        openRate: 0.52,
        clickRate: 0.14,
        replyRate: 0.06,
        bounceRate: 0.009,
        unsubRate: 0.005,
        stopDaysAgo: 0,
        linkWeights: [0.42, 0.24, 0.16, 0.11, 0.07],
      },
      {
        id: 38,
        title: 'Broker partnership outreach',
        status: constants.ACTIVE,
        numberOfEmails: 4,
        createdAt: '2026-05-21T14:03:00.000Z',
        weekdaySend: 24,
        openRate: 0.47,
        clickRate: 0.12,
        replyRate: 0.05,
        bounceRate: 0.012,
        unsubRate: 0.007,
        stopDaysAgo: 0,
        // A partnership pitch drives calls, not pricing pages.
        linkWeights: [0.14, 0.44, 0.22, 0.09, 0.11],
      },
      {
        id: 35,
        title: 'Commercial auto — cold sequence',
        status: constants.PAUSE,
        numberOfEmails: 6,
        createdAt: '2026-05-08T11:41:00.000Z',
        weekdaySend: 19,
        openRate: 0.39,
        clickRate: 0.09,
        replyRate: 0.03,
        // Cold traffic bounces harder and unsubscribes more.
        bounceRate: 0.024,
        unsubRate: 0.014,
        stopDaysAgo: 12,
        linkWeights: [0.31, 0.13, 0.18, 0.29, 0.09],
      },
      {
        id: 31,
        title: 'Lapsed policyholders win-back',
        status: constants.COMPLETE,
        numberOfEmails: 3,
        createdAt: '2026-04-17T08:25:00.000Z',
        weekdaySend: 16,
        openRate: 0.58,
        clickRate: 0.19,
        replyRate: 0.08,
        bounceRate: 0.007,
        unsubRate: 0.004,
        // Inside the default 30-day window on purpose: at 30+ this campaign read as
        // all-zero on the default view, which looks like missing data rather than a
        // finished campaign.
        stopDaysAgo: 18,
        linkWeights: [0.36, 0.19, 0.12, 0.24, 0.09],
      },
      {
        id: 27,
        title: 'Small business bundles',
        status: constants.DRAFT,
        numberOfEmails: 4,
        createdAt: '2026-04-02T16:57:00.000Z',
        weekdaySend: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        bounceRate: 0,
        unsubRate: 0,
        stopDaysAgo: 0,
        linkWeights: [1, 0, 0, 0, 0],
      },
    ];
  }

  /**
   * The fact table: one row per campaign per day it actually sent on.
   *
   * A campaign only sends between its creation date and `stopDaysAgo`, so a paused
   * campaign's line genuinely stops mid-chart and a completed one tapers out well
   * before today — which is what makes the segmentation feature worth using.
   */
  private __buildTrend(specs: ICampaignSpec[]): IDashboardCampaignTrendPoint[] {
    const rows: IDashboardCampaignTrendPoint[] = [];
    const today = new Date();

    for (const spec of specs) {
      if (!spec.weekdaySend) continue; // DRAFT — nothing was ever sent.

      // Seed per campaign so adding or reordering campaigns can't shift another
      // one's numbers.
      const rand = this.seeded(20260729 + spec.id * 7919);
      const createdMs = new Date(spec.createdAt).getTime();

      for (let daysAgo = this.TREND_DAYS - 1; daysAgo >= spec.stopDaysAgo; daysAgo--) {
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        if (d.getTime() < createdMs) continue; // Not live yet.

        const dow = d.getDay();
        const weekend = dow === 0 || dow === 6;
        const volume = spec.weekdaySend * (weekend ? 0.18 : 1) * (0.8 + rand() * 0.4);
        const sent = Math.round(volume);
        if (sent <= 0) continue;

        // Ordering is enforced, not hoped for: opens >= clicks >= replies. Noise on
        // the rates alone could otherwise invert them on an unlucky day.
        const opens = Math.min(sent, Math.round(sent * spec.openRate * (0.85 + rand() * 0.3)));
        const clicks = Math.min(opens, Math.round(sent * spec.clickRate * (0.8 + rand() * 0.4)));
        const replies = Math.min(clicks, Math.round(sent * spec.replyRate * (0.75 + rand() * 0.5)));

        // Breakdowns FIRST, then the totals from them — so a row can't contradict
        // its own splits.
        const buckets = this.__splitBuckets(sent, replies);
        const links = this.__splitLinks(clicks, spec.linkWeights);

        rows.push({
          campaignId: spec.id,
          date: d.toISOString().slice(0, 10),
          sent: buckets.reduce((a, b) => a + b.sent, 0),
          opens,
          clicks: links.reduce((a, l) => a + l.count, 0),
          replies: buckets.reduce((a, b) => a + b.replies, 0),
          unsubscribes: Math.round(sent * spec.unsubRate),
          bounces: Math.round(sent * spec.bounceRate),
          buckets,
          links,
        });
      }
    }
    return rows;
  }

  /** Spread a day's sends and replies across the four time-of-day buckets. */
  private __splitBuckets(sent: number, replies: number): IDashboardBucketSplit[] {
    // Replies weight by w^2 so the reply RATE per bucket ends up proportional to w.
    const replyWeights = this.BUCKET_WEIGHTS.map((w) => w * w);
    const sentSplit = this.__allocate(sent, this.BUCKET_WEIGHTS);
    const replySplit = this.__allocate(replies, replyWeights);

    return this.BUCKET_WEIGHTS.map((_, i) => ({
      // A bucket can't reply more than it sent, however the two splits rounded.
      sent: sentSplit[i],
      replies: Math.min(sentSplit[i], replySplit[i]),
    }));
  }

  /** Spread a day's clicks across destinations, dropping the ones that got none. */
  private __splitLinks(clicks: number, weights: number[]): IDashboardLinkCount[] {
    if (clicks <= 0) return [];
    return this.__allocate(clicks, weights)
      .map((count, i) => ({ key: this.LINK_KEYS[i], count }))
      .filter((l) => l.count > 0);
  }

  /**
   * Split a whole number across weights so the parts sum EXACTLY to the total —
   * largest-remainder, so rounding never loses or invents an event. Naive
   * `Math.round(total * w)` per part drifts, and every panel that sums a breakdown
   * would then disagree with the row's own total.
   */
  private __allocate(total: number, weights: number[]): number[] {
    const sumW = weights.reduce((a, w) => a + w, 0) || 1;
    const exact = weights.map((w) => (total * w) / sumW);
    const parts = exact.map((v) => Math.floor(v));

    let remainder = total - parts.reduce((a, v) => a + v, 0);
    // Hand the leftovers to the largest fractional parts, biggest first.
    const order = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);

    for (let k = 0; remainder > 0; k = (k + 1) % order.length) {
      parts[order[k].i]++;
      remainder--;
    }
    return parts;
  }

  /**
   * Per-contact engagement, spread over the days each contact was active.
   *
   * The specs' totals are for the full 90 days; each is distributed across a
   * recency-biased set of days inside `spanDays`, so a 7-day window still shows a
   * populated leaderboard rather than emptying out.
   */
  private __buildContactEngagement(): IDashboardContactEngagement[] {
    const specs: IContactSpec[] = [
      // Openers — read everything, click little, never reply.
      { id: 5101, name: 'Justin Well', email: 'justin.well@wellbrokers.com', campaignIds: [41, 38], opens: 41, clicks: 3, replies: 0, spanDays: 52 },
      { id: 5102, name: 'Colin Adams', email: 'c.adams@adamsrisk.ca', campaignIds: [41], opens: 34, clicks: 2, replies: 0, spanDays: 44 },
      { id: 5103, name: 'Jay Evans', email: 'jay@evansinsure.com', campaignIds: [38, 35], opens: 29, clicks: 5, replies: 1, spanDays: 61 },
      // Clickers — comparison shoppers working through the links.
      { id: 5104, name: 'Dave Coppins', email: 'dave@coppinsgroup.com', campaignIds: [35, 41], opens: 22, clicks: 27, replies: 1, spanDays: 48 },
      { id: 5105, name: 'Charles Allen', email: 'chuckultraone@gmail.com', campaignIds: [38], opens: 19, clicks: 23, replies: 2, spanDays: 39 },
      { id: 5106, name: 'Michel Caron', email: 'm.caron@brokerline.ca', campaignIds: [41, 31], opens: 26, clicks: 18, replies: 3, spanDays: 66 },
      // Repliers — the ones worth a call, and they barely register on opens.
      { id: 5107, name: 'Kimberly Hannah', email: 'kimberlynoble0616@gmail.com', campaignIds: [41], opens: 12, clicks: 7, replies: 9 , spanDays: 34 },
      { id: 5108, name: 'David Languedoc', email: 'dlanguedoc@maritimeins.ca', campaignIds: [31, 38], opens: 14, clicks: 6, replies: 7, spanDays: 58 },
      { id: 5109, name: 'Benjamin Rutz', email: 'b.rutz@rutzco.com', campaignIds: [38], opens: 9, clicks: 4, replies: 6, spanDays: 41 },
      // Mixed middle, so the ranking isn't three tidy blocks.
      { id: 5110, name: 'Sandra Whitfield', email: 's.whitfield@whitfieldco.com', campaignIds: [41, 35], opens: 24, clicks: 11, replies: 4, spanDays: 55 },
      { id: 5111, name: 'Owen Brannigan', email: 'owen@branniganbrokers.ie', campaignIds: [31], opens: 17, clicks: 13, replies: 2, spanDays: 47 },
      { id: 5112, name: 'Priya Raghavan', email: 'p.raghavan@raghavanrisk.com', campaignIds: [38, 41], opens: 21, clicks: 9, replies: 5, spanDays: 50 },
    ];

    const rows: IDashboardContactEngagement[] = [];
    const today = new Date();

    for (const spec of specs) {
      const rand = this.seeded(spec.id * 31337);

      // Pick the days this contact was active, biased toward recent ones (rand^2
      // clusters near 0 days ago).
      const eventDays = Array.from({ length: 8 }, () =>
        Math.floor(Math.pow(rand(), 2) * spec.spanDays),
      );
      const days = [...new Set(eventDays)].sort((a, b) => b - a);

      const weights = days.map(() => 0.4 + rand());
      const perDay = {
        opens: this.__allocate(spec.opens, weights),
        clicks: this.__allocate(spec.clicks, weights),
        replies: this.__allocate(spec.replies, weights),
      };

      days.forEach((daysAgo, i) => {
        const opens = perDay.opens[i];
        const clicks = perDay.clicks[i];
        const replies = perDay.replies[i];
        if (!opens && !clicks && !replies) return;

        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);

        rows.push({
          contactId: spec.id,
          // Round-robin across the contact's campaigns so segmenting to one
          // campaign genuinely thins the leaderboard.
          campaignId: spec.campaignIds[i % spec.campaignIds.length],
          name: spec.name,
          email: spec.email,
          date: d.toISOString().slice(0, 10),
          opens,
          clicks,
          replies,
        });
      });
    }
    return rows;
  }

  private __buildActivity() {
    return [
      {
        id: 9001,
        type: constants.REPLY,
        campaignId: 41,
        contactName: 'Kimberly Hannah',
        email: 'kimberlynoble0616@gmail.com',
        campaignTitle: 'Insurance renewals — Q3 follow-up',
        occurredAt: '2026-07-29T16:42:00.000Z',
      },
      {
        id: 9002,
        type: constants.CLICK,
        campaignId: 38,
        contactName: 'Charles Allen',
        email: 'chuckultraone@gmail.com',
        campaignTitle: 'Broker partnership outreach',
        occurredAt: '2026-07-29T15:18:00.000Z',
        clickedLink: 'policyninja.co/pricing',
      },
      {
        id: 9003,
        type: constants.OPEN,
        campaignId: 41,
        contactName: 'Michel Caron',
        email: 'm.caron@brokerline.ca',
        campaignTitle: 'Insurance renewals — Q3 follow-up',
        occurredAt: '2026-07-29T14:05:00.000Z',
      },
      {
        id: 9004,
        type: constants.CLICK,
        campaignId: 35,
        contactName: 'Dave Coppins',
        email: 'dave@coppinsgroup.com',
        campaignTitle: 'Commercial auto — cold sequence',
        occurredAt: '2026-07-29T11:47:00.000Z',
        clickedLink: 'policyninja.co/book-a-call',
      },
      {
        id: 9005,
        type: 'unsubscribe',
        campaignId: 38,
        contactName: 'Benjamin Rutz',
        email: 'b.rutz@rutzco.com',
        campaignTitle: 'Broker partnership outreach',
        occurredAt: '2026-07-29T09:30:00.000Z',
      },
      {
        id: 9006,
        type: constants.REPLY,
        campaignId: 31,
        contactName: 'David Languedoc',
        email: 'dlanguedoc@maritimeins.ca',
        campaignTitle: 'Lapsed policyholders win-back',
        occurredAt: '2026-07-28T17:12:00.000Z',
      },
    ];
  }
}
