import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CAMPAIGN_STATUS } from '../../models/DripCampaign';
import { constants } from '../../helpers/constants';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { NgClass, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

/** One of the two scrape passes, as rendered in the step list. */
type StepState = 'pending' | 'running' | 'done';

/**
 * `scrapeEstimate` on `GET drip-campaigns/:id/prospects` (KexyApi `scrape-estimate.ts`):
 * the ETA and time-weighted progress, worked out server-side from what is left, measured
 * scrape speeds, newer campaigns that go first, and error stops. Absent (null) when the
 * API predates it or could not work it out — the card then falls back to its own count.
 */
interface ScrapeEstimate {
  state: 'done' | 'paused' | 'delayed' | 'running' | 'queued';
  etaSeconds: number | null;
  percent: number;
  aheadCampaigns: number;
  passes: { pass: 'web' | 'map' | 'sports' | 'linkedin'; total: number; remaining: number }[];
}

@Component({
  selector: 'app-scrape-progress-card',
  imports: [
    NgIf,
    NgClass,
  ],
  templateUrl: './scrape-progress-card.component.html',
  styleUrl: './scrape-progress-card.component.scss',
})
export class ScrapeProgressCardComponent implements OnInit, OnDestroy {
  @Input({ required: true })
  dripCampaignId!: number;

  /**
   * Whether this card is actually rendering anything.
   *
   * The card decides that from PER-PROSPECT data, which the parent does not
   * load — so without this report the parent cannot tell "research in progress"
   * from "card mounted but silent", and its own banners have to guess. See
   * `__setScrapeProgress`.
   */
  @Output()
  visibilityChange = new EventEmitter<boolean>();

  userData: any;
  dripCampaign;
  dripCampaignProspects: any = [];
  scrapeEstimate: ScrapeEstimate | null = null;

  /** When the ETA runs out, on the local clock — counted down between polls. */
  private etaEndsAt: number | null = null;
  /** Re-read every few seconds so the ETA counts down between the 30s polls. */
  now = Date.now();
  private clockInterval: any = null;

  private dripCampaignProspectsSubscription: Subscription;

  constructor(
    private dripCampaignService: DripCampaignService,
    private _authService: AuthService,
  ) {
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.stopAutoRefresh();
    this.stopMessageRotation();
    this.dripCampaignProspectsSubscription?.unsubscribe();
  }

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;

    // Subscribe ONCE. The previous version re-subscribed on every poll without
    // unsubscribing, so after N polls a single response was handled N times —
    // N change-detection passes, each re-running the rotation, which is part of
    // why the card flickered.
    this.dripCampaignProspectsSubscription =
      this.dripCampaignService.dripCampaignProspects.subscribe(data => {
        this.dripCampaignProspects = data?.['prospects'] ?? [];
        this.__setEstimate(data?.['scrapeEstimate'] ?? null);
        this.calculateProspectScrapeTime();
      });

    this.clockInterval = setInterval(() => (this.now = Date.now()), 10000);

    await this.__refreshDripCampaign();
    await this.getDripCampaignProspects();

    this.getScrapeStatusDetails();

    if (this.scrapeRemainProspects === 0) {
      this.__setScrapeProgress(false);
      return;
    }

    this.startAutoRefresh();
  }

  scrapeProgress: boolean = false;

  /**
   * Single writer for `scrapeProgress`, so every hide/show reaches the parent.
   * Only emits on a real change — this runs on every 30s poll.
   */
  private __setScrapeProgress(visible: boolean) {
    if (this.scrapeProgress === visible) return;
    this.scrapeProgress = visible;
    this.visibilityChange.emit(visible);
  }

  scrapeProgressDetails: any = {
    title: 'Scrape Queued',
    subTitle: 'Please wait! Scrape will start soon.',
    mapText: '',
    webText: 'Getting ready',
    icon: 'assets/icon/1f50e.png',
  };

  /** Drives the status pill. */
  phase: 'queued' | 'running' | 'done' = 'queued';

  WEB_SCRAPE_MESSAGES = [
    { icon: 'assets/icon/1f50e.png', message: 'Prospect Research' },
    { icon: 'assets/icon/1f4f0.png', message: 'Reviewing recent company developments' },
    { icon: 'assets/icon/1f4c8.png', message: 'Identifying growth and expansion signals' },
    { icon: 'assets/icon/1f4b0.png', message: 'Detecting funding, hiring, and investment activity' },
    { icon: 'assets/icon/1f30e.png', message: 'Gathering local market intelligence' },
    { icon: 'assets/icon/1f4f1.png', message: 'Monitoring social and professional activity' },
    { icon: 'assets/icon/26a1.png', message: 'Identifying engagement and buying signals' },
    { icon: 'assets/icon/1f578-fe0f.png', message: 'Mapping relationships and influence networks' },
    { icon: 'assets/icon/1f4ca.png', message: 'Evaluating industry trends impacting prospects' },
    { icon: 'assets/icon/1f3af.png', message: 'Discovering personalization opportunities' },
    { icon: 'assets/icon/270d-fe0f.png', message: 'Extracting relevant talking points' },
    { icon: 'assets/icon/1f525.png', message: 'Discovering outreach opportunities' },
    { icon: 'assets/icon/1f9e0.png', message: 'Organizing key prospect insights' },
    { icon: 'assets/icon/2728.png', message: 'Creating prospect profiles' },
  ];

  private messagePool: typeof this.WEB_SCRAPE_MESSAGES = [];
  private rotationInterval: any = null;

  getShuffled() {
    return [...this.WEB_SCRAPE_MESSAGES]
      .map(item => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item);
  }

  getNextMessage() {
    // Refill and reshuffle when pool is empty
    if (this.messagePool.length === 0) {
      this.messagePool = this.getShuffled();
    }
    return this.messagePool.pop();
  }

  startMessageRotation() {
    // Guard against stacking. `getScrapeStatusDetails()` runs on EVERY poll, and
    // without this each poll started another interval on top of the last — the
    // messages then changed several times a second instead of every 20s, which
    // read as the card flashing.
    if (this.rotationInterval) return;

    this.showNextMessage();

    // Keep rotating for as long as the work is outstanding — NOT only while the
    // campaign row reads RUNNING. That row is PENDING until the scheduler picks
    // the campaign up, which is exactly the stretch right after activation, and
    // stopping here left the card completely frozen.
    this.rotationInterval = setInterval(() => {
      if (this.phase === 'done') {
        this.stopMessageRotation();
        return;
      }
      this.showNextMessage();
    }, 20000);
  }

  stopMessageRotation() {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }
  }

  showNextMessage() {
    const { icon, message } = this.getNextMessage();
    this.scrapeProgressDetails.webText = message;
    this.scrapeProgressDetails.icon = icon;
  }

  getScrapeStatusDetails = () => {
    // A poll can fail transiently (the refresh swallows the error and retries on
    // the next tick), so never assume the campaign has loaded.
    if (!this.dripCampaign) return;

    const { webScrapeStatus, mapScrapeStatus, status } = this.dripCampaign;

    const isWebDone = webScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED;
    // Map also stands in for the passes with no step of their own (sports, LinkedIn): the
    // send gate waits for them, so the card must not say "complete" before they finish.
    const isMapDone = mapScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED && this.__areHiddenPassesDone();

    // Same rule as the poll below: only an ACTIVE campaign is being researched.
    this.__setScrapeProgress(status === constants.ACTIVE && (!isWebDone || !isMapDone));

    this.webStep = this.__stepState(webScrapeStatus);
    this.mapStep = this.__stepState(mapScrapeStatus);

    // LinkedIn has no step, but while it runs the card says "Researching", not "queued".
    const isRunning =
      webScrapeStatus === CAMPAIGN_STATUS.RUNNING ||
      mapScrapeStatus === CAMPAIGN_STATUS.RUNNING ||
      this.dripCampaign.linkedinScrapeStatus === CAMPAIGN_STATUS.RUNNING;

    if (isWebDone && isMapDone) {
      this.phase = 'done';
      this.scrapeProgressDetails.title = 'Research complete';
      this.scrapeProgressDetails.subTitle = 'Your prospect insights are ready.';
      this.stopMessageRotation();
      return;
    }

    if (isRunning) {
      this.phase = 'running';
      this.scrapeProgressDetails.title = 'Researching your prospects';
      this.scrapeProgressDetails.subTitle =
        'We’re gathering the insights that personalize each email.';
      this.startMessageRotation();
      return;
    }

    this.phase = 'queued';
    this.scrapeProgressDetails.title = 'Research queued';
    this.scrapeProgressDetails.subTitle = 'This starts automatically — you can leave this page.';
    // Queued is still "work pending", so the card must keep moving here too.
    this.startMessageRotation();
  };

  /**
   * The passes the send gate waits for that have no step on the card:
   * - sports, only while the API includes it (i.e. `SPORTS_SCRAPER_ENABLED`);
   * - LinkedIn, always (KexyApi `docs/linkedin-scraper-mapping.md`, decision 16: no step of
   *   its own). A campaign from an API without the column counts as done.
   */
  private __areHiddenPassesDone(campaign = this.dripCampaign): boolean {
    const sportsIncluded = this.scrapeEstimate?.passes?.some(p => p.pass === 'sports');
    const sportsDone = !sportsIncluded || campaign?.sportsScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED;
    const linkedin = campaign?.linkedinScrapeStatus;
    const linkedinDone = linkedin == null || linkedin === CAMPAIGN_STATUS.SUCCEEDED;
    return sportsDone && linkedinDone;
  }

  private __setEstimate(estimate: ScrapeEstimate | null) {
    const previous = this.scrapeEstimate;
    this.scrapeEstimate = estimate;
    this.now = Date.now();
    // Relative to the moment it arrived, so a skewed client clock does not matter.
    const next = estimate?.etaSeconds != null ? this.now + estimate.etaSeconds * 1000 : null;

    // Prospects settle a batch at a time, so between batches the server sends the SAME
    // ETA on every poll. Re-basing on it restarted the countdown every 30s — the time
    // went back UP instead of down. While the countdown is still running, only move it
    // EARLIER, unless there is really more work than before (prospects added, newer
    // campaigns queued ahead). Once it runs out, take whatever the server says.
    const counting = this.etaEndsAt != null && this.etaEndsAt > this.now;
    if (counting && next != null && next > this.etaEndsAt! && !this.__hasMoreWork(previous, estimate)) {
      return;
    }
    this.etaEndsAt = next;
  }

  /** More work than at the last poll: more prospects left, or more campaigns ahead. */
  private __hasMoreWork(before: ScrapeEstimate | null, after: ScrapeEstimate | null): boolean {
    if (!before || !after) return true;
    const left = (e: ScrapeEstimate) => Math.max(0, ...(e.passes ?? []).map(p => p.remaining));
    return left(after) > left(before) || after.aheadCampaigns > before.aheadCampaigns;
  }

  private __stepState(status: string): StepState {
    if (status === CAMPAIGN_STATUS.SUCCEEDED) return 'done';
    if (status === CAMPAIGN_STATUS.RUNNING) return 'running';
    return 'pending';
  }

  getDripCampaignProspects = async () => {
    const postData = {
      drip_campaign_id: this.dripCampaignId,
    };
    // The subscription set up in ngOnInit picks the response up. A failure here
    // is a transient poll error on a background refresh — the next tick retries,
    // so it must not raise a modal over the page.
    try {
      await this.dripCampaignService.getProspects(postData);
    } catch (e) {
      console.error('Could not refresh scrape progress', e);
    }
  };

  /**
   * @param silent passed through so a BACKGROUND poll does not trigger the
   *   page-level loading skeleton in `brand-drip-campaign`.
   */
  __refreshDripCampaign = async (silent = false) => {
    const postData = {
      drip_campaign_id: this.dripCampaignId,
      supplier_id: this.userData.supplier_id,
    };
    try {
      await this.dripCampaignService.getCampaign(postData, silent);
      this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    } catch (e) {
      console.error('Could not refresh campaign', e);
    }
  };

  private refreshInterval: any = null;

  totalProspects = 0;
  scrapeRemainProspects = 0;

  /** Completed passes out of the two (web + map) run per prospect. */
  completedPasses = 0;
  totalPasses = 0;
  percentComplete = 0;

  webStep: StepState = 'pending';
  mapStep: StepState = 'pending';

  calculateProspectScrapeTime() {
    const estimate = this.scrapeEstimate;
    if (estimate?.passes?.length) {
      // Server-side numbers: ACTIVE prospects only, every pass the send waits for, and a
      // percent weighted by how long each pass takes (a map prospect costs ~3× a web
      // one), so the bar moves at an even pace and agrees with the ETA.
      this.totalProspects = estimate.passes[0].total;
      this.scrapeRemainProspects = Math.max(...estimate.passes.map(p => p.remaining));
      this.percentComplete = estimate.percent;
      return;
    }

    // Fallback for an API without `scrapeEstimate`.
    this.totalProspects = this.dripCampaignProspects.length;

    const isRemaining = (s: string) =>
      s === CAMPAIGN_STATUS.PENDING || s === CAMPAIGN_STATUS.RUNNING;

    const webScrapeRemaining = this.dripCampaignProspects.filter(r => isRemaining(r.webScrapeStatus));
    const mapScrapeRemaining = this.dripCampaignProspects.filter(r => isRemaining(r.mapScrapeStatus));

    this.scrapeRemainProspects = Math.max(webScrapeRemaining.length, mapScrapeRemaining.length);

    // Two passes run per prospect, so completion is measured across both rather
    // than by the worst of the two — that makes the bar move steadily instead of
    // sitting still while the slower pass catches up.
    this.totalPasses = this.totalProspects * 2;
    this.completedPasses =
      this.totalPasses - (webScrapeRemaining.length + mapScrapeRemaining.length);
    this.percentComplete = this.totalPasses
      ? Math.min(100, Math.round((this.completedPasses / this.totalPasses) * 100))
      : 0;
  }

  /** The ETA line under the bar. */
  get etaText(): string {
    const estimate = this.scrapeEstimate;
    if (!estimate) {
      // Fallback for an API without `scrapeEstimate`: the old rough guess.
      return `About ${this.__duration(Math.max(1, this.scrapeRemainProspects * 2) * 60)} remaining`;
    }
    if (estimate.state === 'paused') return 'Research continues when the campaign is active';
    if (estimate.state === 'delayed') return 'Research is delayed — our team has been notified';
    if (this.etaEndsAt == null) return 'Estimating time remaining';

    const seconds = Math.max(0, Math.round((this.etaEndsAt - this.now) / 1000));
    // Past the estimate but not finished: say so instead of sitting at "0 minutes".
    if (seconds === 0) return 'Finishing up';
    const eta = `About ${this.__duration(seconds)} remaining`;
    if (estimate.aheadCampaigns > 0) {
      const n = estimate.aheadCampaigns;
      return `${eta} — starts after ${n} other campaign${n === 1 ? '' : 's'}`;
    }
    return eta;
  }

  /** "less than a minute", "12 minutes", "2 h 5 min", "3 days 4 h". */
  private __duration(seconds: number): string {
    const minutes = Math.ceil(seconds / 60);
    if (seconds < 60) return 'less than a minute';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const m = minutes % 60;
      return m ? `${hours} h ${m} min` : `${hours} h`;
    }
    const days = Math.floor(hours / 24);
    const h = hours % 24;
    return `${days} day${days === 1 ? '' : 's'}${h ? ` ${h} h` : ''}`;
  }

  /**
   * True while there is nothing measurable to show yet.
   *
   * A campaign sits at 0% for as long as it takes the scheduler to pick it up
   * (the campaign row stays PENDING until the first batch runs), which is the
   * state users see right after activating. A 0%-width determinate bar looks
   * broken, so the track shows a sweeping indeterminate bar until the first
   * pass completes.
   */
  get isIndeterminate(): boolean {
    return this.percentComplete === 0 && this.phase !== 'done';
  }

  startAutoRefresh() {
    if (this.refreshInterval) return; // prevent duplicate intervals

    this.refreshInterval = setInterval(async () => {
      // `silent` — a background poll must never blank the page.
      await this.__refreshDripCampaign(true);
      await this.getDripCampaignProspects();
      this.getScrapeStatusDetails();
      this.calculateProspectScrapeTime();

      const campaign = this.dripCampaign;
      // Keep polling rather than tearing the card down on a transient failure.
      if (!campaign) return;

      const isActive = campaign.status === constants.ACTIVE;
      const isScrapingDone =
        campaign.webScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED &&
        campaign.mapScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED &&
        this.__areHiddenPassesDone(campaign);

      // ❌ Stop if not active OR scraping finished
      if (!isActive || isScrapingDone || this.scrapeRemainProspects === 0) {
        this.stopAutoRefresh();
        this.stopMessageRotation();
        this.__setScrapeProgress(false);
      }
    }, 30000); // 30 sec
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  protected readonly CAMPAIGN_STATUS = CAMPAIGN_STATUS;
}
