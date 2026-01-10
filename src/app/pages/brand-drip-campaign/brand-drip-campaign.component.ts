import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { AuthService } from "src/app/services/auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { environment } from "src/environments/environment";
import { constants } from "src/app/helpers/constants";
import { routeConstants } from "src/app/helpers/routeConstants";
import { DripCampaignService } from "src/app/services/drip-campaign.service";
import { SseService } from "src/app/services/sse.service";
import { dripCampaignInitialModalData } from "src/app/helpers/demoData";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { NewFeaturePageAccessService } from "src/app/services/new-feature-page-access.service";
import { CampaignService } from "src/app/services/campaign.service";
import {
  KexyTutorialModalContentComponent,
} from "src/app/components/kexy-tutorial-modal-content/kexy-tutorial-modal-content.component";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {ProgressCountComponent} from '../../components/progress-count/progress-count.component';
import {
  KexyProTipsModalContentComponent
} from '../../components/kexy-pro-tips-modal-content/kexy-pro-tips-modal-content.component';
import {DripCampaignContentComponent} from '../../components/drip-campaign-content/drip-campaign-content.component';
import {GenerateDripCampaignComponent} from '../../components/generate-drip-campaign/generate-drip-campaign.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'brand-drip-campaign',
  imports: [
    BrandLayoutComponent,
    ProgressCountComponent,
    KexyProTipsModalContentComponent,
    DripCampaignContentComponent,
    GenerateDripCampaignComponent,
    CommonModule
  ],
  templateUrl: './brand-drip-campaign.component.html',
  styleUrl: './brand-drip-campaign.component.scss'
})
export class BrandDripCampaignComponent implements OnInit, OnDestroy {
  public currentStep = 1;
  public steps = [
    {
      no: 1,
      title: "Drip Campaign Content",
    },
    {
      no: 2,
      title: "Generate Emails",
    },
  ];
  public userData;
  public dripCampaignId;
  public loadingSubscription: Subscription;
  public dripCampaignInitialModalSubscription: Subscription;
  public isWaitingFlag: boolean = false;
  public dripCampaignDuplicate: boolean = false;
  public features = dripCampaignInitialModalData;
  public routeConstants = routeConstants;

  constructor(
    private router: Router,
    private sseService: SseService,
    private dripCampaignService: DripCampaignService,
    private campaignService: CampaignService,
    private _newFeaturePageAccessService: NewFeaturePageAccessService,
    private _authService: AuthService,
    private modal: NgbModal,
    private route: ActivatedRoute,
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = this.resetDripCampaignData.bind(this);
  }

  @ViewChild("dripCampaignInitialModal", { static: true }) dripCampaignInitialModal: ElementRef;

  resetDripCampaignData = () => {
    this.dripCampaignService.removeDripCampaign();
    this.sseService.removeDripBulkEmailData();
  };

  async ngOnInit() {
    document.title = "Brand Drip Campaign - KEXY Brand Portal";
    this.userData = this._authService.userTokenValue;

    this.loadingSubscription = this.dripCampaignService.loading.subscribe((loading) => {
      this.isWaitingFlag = loading;
    });

    this.route.queryParams.subscribe((params) => {
      if (params["id"]) {
        this.currentStep = null;
        this.dripCampaignId = params["id"];
        this.getCampaign().then();
      }

      if (params["action"] && params["action"] === constants.DUPLICATE) {
        this.dripCampaignDuplicate = true;
      }
    });

    await this._newFeaturePageAccessService.getPageAccessDataForUser(this.userData.id);
    this.dripCampaignInitialModalSubscription = this._newFeaturePageAccessService.dripCampaignPage.subscribe((hidePopup) => {
      if (!hidePopup) {
        if (window.innerWidth < 992) {
          this.modal.open(KexyTutorialModalContentComponent, { size: "sm" });
        } else {
          this.modal.open(KexyTutorialModalContentComponent, { size: "lg" });
        }
      }
    });

    // this._authService.sendSlackNotification();
  }

  ngOnDestroy(): void {
    if (this.removeQueryParams(this.router.url) === "/" + routeConstants.BRAND.CREATE_DRIP_CAMPAIGN) return;
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
    if (this.dripCampaignInitialModalSubscription) this.dripCampaignInitialModalSubscription.unsubscribe();
    this.dripCampaignService.removeDripCampaign();
    this.campaignService.resetCampaignDataToDefault();
  }


  removeQueryParams(url: string): string {
    const parts = url.split("?");
    return parts[0];
  }

  getCampaign = async () => {
    if (!this.dripCampaignId) {
      return false;
    }
    const postData = {
      drip_campaign_id: this.dripCampaignId,
      supplier_id: this.userData.supplier_id,
    };
    const campaign = await this.dripCampaignService.getCampaign(postData);
    if (campaign && campaign["currentStep"] === constants.CAMPAIGN_CONTENT) {
      this.currentStep = 1;
    }
    if (campaign && campaign["currentStep"] === constants.GENERATE_EMAILS) {
      this.currentStep = 2;
    }
    if (campaign && this.dripCampaignDuplicate) {
      this.currentStep = 1;
    }
  };

  nextBtnClick = async (campaignId = "", overwrite = false) => {
    this.currentStep = ++this.currentStep;

    const cId = this.dripCampaignId && !overwrite ? this.dripCampaignId : campaignId;
    if (cId) {
      await this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN], { queryParams: { id: cId } });
    }
  };

  backBtnClick = () => {
    if (this.currentStep === 1) return;
    this.currentStep = --this.currentStep;
  };

  handleTutorialBtnClick = () => {
    window.open(environment.dripCampaignCreateTutorialUrl, "_blank");
  };
}
