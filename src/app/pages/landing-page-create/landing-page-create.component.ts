import { CampaignService } from 'src/app/services/campaign.service';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { routeConstants } from 'src/app/helpers/routeConstants';
import { constants } from 'src/app/helpers/constants';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { promotionInitialModalData } from 'src/app/helpers/demoData';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { ProgressCountComponent } from '../../components/progress-count/progress-count.component';
import { KexyProTipsModalContentComponent } from '../../components/kexy-pro-tips-modal-content/kexy-pro-tips-modal-content.component';
import { LandingPageDetailsComponent } from '../../components/landing-page-details/landing-page-details.component';
import { LandingPageContactComponent } from '../../components/landing-page-contact/landing-page-contact.component';
import { LandingPagePreviewComponent } from '../../components/landing-page-preview/landing-page-preview.component';
import { CommonModule } from '@angular/common';
import { LandingPage } from '../../models/LandingPage';

@Component({
  selector: 'landing-page-create',
  imports: [
    BrandLayoutComponent,
    ProgressCountComponent,
    KexyProTipsModalContentComponent,
    LandingPageDetailsComponent,
    LandingPageContactComponent,
    LandingPagePreviewComponent,
    CommonModule,
  ],
  templateUrl: './landing-page-create.component.html',
  styleUrl: './landing-page-create.component.scss',
})
export class LandingPageCreateComponent implements OnInit, OnDestroy {
  public currentStep = 1;
  public steps = [
    {
      no: 1,
      title: `${constants.LANDING_PAGE} Details`,
    },
    {
      no: 2,
      title: 'Contact Info',
    },
    {
      no: 3,
      title: 'Preview & Send',
    },
  ];

  public subscription;
  public landingPage: LandingPage;
  public userData;
  public campaignId;
  public routeConstants = routeConstants;
  public campaignDuplicate = false;
  public isWaitingFlag: boolean = false;
  public loadingSubscription: Subscription;
  public promotionInitialModalSubscription: Subscription;

  constructor(
    private router: Router,
    private campaignService: CampaignService,
    private _authService: AuthService,
    private route: ActivatedRoute,
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = this.resetFormData.bind(this);
  }

  resetFormData = () => {
    this.campaignService.setSearchEstablishmentPageData({});
    this.campaignService.setCampaignDetailsPageData({});
    return false;
  };

  @ViewChild('promotionInitialModal', { static: true }) promotionInitialModal: ElementRef;

  async ngOnInit() {
    document.title = `${constants.LANDING_PAGE}s - KEXY`;
    this.userData = this._authService.userTokenValue;
    this.loadingSubscription = this.campaignService.loading.subscribe((loading) => {
      this.isWaitingFlag = loading;
    });

    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        this.currentStep = null;
        this.campaignId = params['id'];
        this.getCampaign().then();
      }
      if (params['action'] && params['action'] === constants.DUPLICATE) {
        this.campaignDuplicate = true;
        this.campaignService.setDuplicateCampaignPropertyValue(true);
      }
    });

    // this._authService.sendSlackNotification();
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
    if (this.promotionInitialModalSubscription)
      this.promotionInitialModalSubscription.unsubscribe();
    if (this.removeQueryParams(this.router.url) === '/' + routeConstants.BRAND.LANDING_PAGES)
      return;
    this.campaignService.resetCampaignDataToDefault();
  }

  removeQueryParams(url: string): string {
    const parts = url.split('?');
    return parts[0];
  }

  getCampaign = async () => {
    if (!this.campaignId) {
      return false;
    }
    const postData = {
      campaign_id: this.campaignId,
      supplier_id: this.userData.supplier_id,
    };
    this.landingPage = await this.campaignService.getCampaign(postData);
    this.campaignService.setLandingPage(this.landingPage);
    if (this.landingPage && this.landingPage.currentStep === constants.CAMPAIGN_CONTACT) {
      this.currentStep = 2;
    }
    if (this.landingPage && this.landingPage.currentStep === constants.CAMPAIGN_PREVIEW) {
      this.currentStep = 3;
    }

    if (this.landingPage && this.landingPage.currentStep === constants.CAMPAIGN_SUBMITTED) {
      this.currentStep = 1;
    }

    if (this.campaignDuplicate) {
      this.currentStep = 1;
    }
  };

  nextBtnClick = async (campaignId = '', overwrite = false) => {
    this.currentStep = ++this.currentStep;
    const cId = this.campaignId && !overwrite ? this.campaignId : campaignId;
    if (cId) {
      await this.router.navigate([routeConstants.BRAND.LANDING_PAGES], {
        queryParams: { id: cId },
      });
    }
  };

  backBtnClick = async (campaignId = '') => {
    console.log({ campaignId });
    console.log(this.campaignId);
    if (this.currentStep === 1) return;
    this.currentStep = --this.currentStep;
    const cId = this.campaignId ? this.campaignId : campaignId;
    if (cId) {
      await this.router.navigate([routeConstants.BRAND.LANDING_PAGES], {
        queryParams: { id: cId },
      });
    }
  };

  setWaitingFlagToTrue = () => {
    this.isWaitingFlag = true;
    console.log('from true', this.isWaitingFlag);
  };

  setWaitingFlagToFalse = () => {
    this.isWaitingFlag = false;
  };

  handleTutorialBtnClick = () => {
    window.open(environment.dripCampaignCreateTutorialUrl, '_blank');
  };

  protected readonly features = promotionInitialModalData;
  protected readonly constants = constants;
}
