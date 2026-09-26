import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CAMPAIGN_STATUS } from '../../models/DripCampaign';
import { constants } from '../../helpers/constants';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { NgClass, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

/** One of the two scrape passes, as rendered in the step list. */
type StepState = 'pending' | 'running' | 'done';

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

  private dripCampaignProspectsSubscription: Subscription;

  constructor(
    private dripCampaignService: DripCampaignService,
    private _authService: AuthService,
  ) {
  }

  ngOnDestroy(): void {
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
        this.calculateProspectScrapeTime();
      });

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
    const isMapDone = mapScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED;

    this.__setScrapeProgress(status !== constants.INACTIVE && (!isWebDone || !isMapDone));

    this.webStep = this.__stepState(webScrapeStatus);
    this.mapStep = this.__stepState(mapScrapeStatus);

    const isRunning =
      webScrapeStatus === CAMPAIGN_STATUS.RUNNING || mapScrapeStatus === CAMPAIGN_STATUS.RUNNING;

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

  /** Rough ETA — the map pass runs ~2 prospects per scheduler tick. */
  get estimatedMinutes(): number {
    return Math.max(1, this.scrapeRemainProspects * 2);
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
        campaign.mapScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED;

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
