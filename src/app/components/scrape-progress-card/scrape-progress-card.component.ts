import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CAMPAIGN_STATUS } from '../../models/DripCampaign';
import { constants } from '../../helpers/constants';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { NgIf } from '@angular/common';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-scrape-progress-card',
  imports: [
    NgIf,
  ],
  templateUrl: './scrape-progress-card.component.html',
  styleUrl: './scrape-progress-card.component.scss',
})
export class ScrapeProgressCardComponent implements OnInit, OnDestroy {
  @Input({ required: true })
  dripCampaignId!: number;

  userData: any;
  dripCampaign;
  dripCampaignProspects: any = [];

  dripCampaignProspectsSubscription: Subscription;

  constructor(
    private dripCampaignService: DripCampaignService,
    private _authService: AuthService,
  ) {
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.stopMessageRotation();
  }

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;

    await this.__refreshDripCampaign();

    this.getDripCampaignProspects().then(res => {
      this.getScrapeStatusDetails();
      this.calculateProspectScrapeTime();
      if (this.scrapeRemainProspects === 0) {
        this.scrapeProgress = false;
        console.log(this.scrapeProgress);
      }
      this.startAutoRefresh();
    });

  }

  scrapeProgress: boolean = false;
  scrapeProgressDetails: any = {
    title: '',
    subTitle: '',
    mapText: 'Loading',
    webText: 'Loading',
    icon: 'assets/icon/1f50e.png',
  };

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
    // Show first message immediately
    this.showNextMessage();

    this.rotationInterval = setInterval(() => {
      const isRunning =
        this.dripCampaign.webScrapeStatus === CAMPAIGN_STATUS.RUNNING ||
        this.dripCampaign.mapScrapeStatus === CAMPAIGN_STATUS.RUNNING;

      if (isRunning) {
        this.showNextMessage();
      } else {
        this.stopMessageRotation();
      }
    }, 20000); // 👈 every 5s, adjust as needed
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
    const { webScrapeStatus, mapScrapeStatus, status } = this.dripCampaign;

    const isWebDone = webScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED;
    const isMapDone = mapScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED;

    this.scrapeProgress = status !== constants.INACTIVE && (!isWebDone || !isMapDone);
    // console.log(this.scrapeProgress);
    const scrapeStatus = this.dripCampaign.webScrapeStatus === CAMPAIGN_STATUS.RUNNING ||
    this.dripCampaign.mapScrapeStatus === CAMPAIGN_STATUS.RUNNING
      ? CAMPAIGN_STATUS.RUNNING
      : this.dripCampaign.webScrapeStatus === CAMPAIGN_STATUS.PENDING ||
      this.dripCampaign.mapScrapeStatus === CAMPAIGN_STATUS.PENDING
        ? CAMPAIGN_STATUS.PENDING
        : null;

    switch (scrapeStatus) {
      case CAMPAIGN_STATUS.RUNNING:
        this.scrapeProgressDetails.title = 'Scraping Data';
        this.scrapeProgressDetails.subTitle = 'Please wait while we collect information';
        break;
      case CAMPAIGN_STATUS.PENDING:
        this.scrapeProgressDetails.title = 'Scrape Queued';
        this.scrapeProgressDetails.subTitle = 'Please wait! Scrape will start soon.';
        break;
    }
    this.startMessageRotation();
  };


  getDripCampaignProspects = async () => {
    const postData = {
      drip_campaign_id: this.dripCampaignId,
    };
    try {
      await this.dripCampaignService.getProspects(postData);
      this.dripCampaignProspectsSubscription = this.dripCampaignService.dripCampaignProspects.subscribe(data => {
        this.dripCampaignProspects = data['prospects'];
        console.log('prospects', this.dripCampaignProspects);
      });
      this.calculateProspectScrapeTime();
    } catch (e) {
      Swal.fire('Error', e.message).then();
    }
  };

  __refreshDripCampaign = async () => {
    const postData = {
      drip_campaign_id: this.dripCampaignId,
      supplier_id: this.userData.supplier_id,
    };
    await this.dripCampaignService.getCampaign(postData);
    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
  };

  private refreshInterval: any = null;

  totalProspects = 0;
  scrapeRemainProspects = 0;

  calculateProspectScrapeTime() {
    this.totalProspects = this.dripCampaignProspects.length;
    const webScrapeRemaining = this.dripCampaignProspects.filter(r => {
      return r.webScrapeStatus === CAMPAIGN_STATUS.PENDING || r.webScrapeStatus === CAMPAIGN_STATUS.RUNNING;
    });
    const mapScrapeRemaining = this.dripCampaignProspects.filter(r => {
      return r.mapScrapeStatus === CAMPAIGN_STATUS.PENDING || r.mapScrapeStatus === CAMPAIGN_STATUS.RUNNING;
    });
    this.scrapeRemainProspects = Math.max(webScrapeRemaining.length, mapScrapeRemaining.length);
  }

  startAutoRefresh() {
    if (this.refreshInterval) return; // prevent duplicate intervals
    console.log('startAutoRefresh');

    this.refreshInterval = setInterval(async () => {
      console.log('Start looping...');
      await this.__refreshDripCampaign();
      await this.getDripCampaignProspects();
      this.getScrapeStatusDetails();
      this.calculateProspectScrapeTime();
      this.scrapeProgress = true;
      const campaign = this.dripCampaign;

      const isActive = campaign.status === constants.ACTIVE;

      const isScrapingDone =
        campaign.webScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED &&
        campaign.mapScrapeStatus === CAMPAIGN_STATUS.SUCCEEDED;

      // ❌ Stop if not active OR scraping finished
      if (!isActive || isScrapingDone || this.scrapeRemainProspects === 0) {
        this.stopAutoRefresh();
        this.scrapeProgress = false;
      }

    }, 30000); // 30 sec
  }

  stopAutoRefresh() {
    console.log('stopAutoRefresh');
    if (this.refreshInterval) {
      console.log('stopAutoRefresh');
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  protected readonly CAMPAIGN_STATUS = CAMPAIGN_STATUS;
}
