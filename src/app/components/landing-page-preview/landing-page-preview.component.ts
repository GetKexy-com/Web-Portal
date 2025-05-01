import { Component, OnInit, Input } from "@angular/core";
import { constants } from "src/app/helpers/constants";
import { CampaignService } from "src/app/services/campaign.service";
import { PageUiService } from "../../services/page-ui.service";
import Swal from "sweetalert2";
import { routeConstants } from "../../helpers/routeConstants";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { environment } from "../../../environments/environment";
import { ProspectingService } from "../../services/prospecting.service";
import {CampaignLayoutBottmBtnsComponent} from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import {DesktopPreviewComponent} from '../desktop-preview/desktop-preview.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'landing-page-preview',
  imports: [
    CampaignLayoutBottmBtnsComponent,
    DesktopPreviewComponent,
    CommonModule,
  ],
  templateUrl: './landing-page-preview.component.html',
  styleUrl: './landing-page-preview.component.scss'
})
export class LandingPagePreviewComponent {
  @Input() closePreview;
  @Input() formData;
  @Input() setWaitingFlagToTrue;
  @Input() setWaitingFlagToFalse;
  @Input() nextBtnClick;
  @Input() backBtnClick;
  public readonly constants = constants;
  public showDesktopMode = true;
  public userData;
  public isWaiting: boolean = true;
  public campaignId;
  public pageData;
  public products;
  public campaignTitleText: string = "";
  public campaignDetailsText: string = "";
  public productText: string = "";
  public campaignTitles;
  public campaignInnerDetails;

  constructor(
    private campaignService: CampaignService,
    private prospectingService: ProspectingService,
    private router: Router,
    private route: ActivatedRoute,
    private pageUiService: PageUiService,
    private _authService: AuthService,
  ) {
  }

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;

    this.route.queryParams.subscribe((params) => {
      if (params["id"]) {
        this.campaignId = params["id"];
      }
    });
    // Get campaign api call for load preview data
    await this.getCampaign();
    this.pageData = this.campaignService.getPreviewPageData();

    // Set necessary data
    await this.getCampaignData();
    this.getCampaignTitleAndOtherData();

    this.isWaiting = false;
  }

  getCampaign = async () => {
    if (!this.campaignId) {
      return false;
    }
    const postData = {
      campaign_id: this.campaignId,
      supplier_id: this.userData.supplier_id,
    };
    await this.campaignService.getCampaign(postData);
  };

  async getCampaignData() {
    try {
      [this.campaignTitles, this.campaignInnerDetails, this.products] = await Promise.all([
        this.getAllCampaignTitles(),
        this.getAllCampaignInnerDetails(),
        this.getAllProducts(),
      ]);
    } catch (error) {
      console.error("Error fetching campaign data:", error);
    }
  }

  getAllCampaignTitles = async () => {
    // Get campaignTitles api call
    return this.campaignService.getAllCampaignTitle();
  };

  getAllCampaignInnerDetails = async () => {
    // Get campaignInnerDetails api call
    return this.campaignService.getAllCampaignInnerDetail({ supplier_id: this.userData.supplier_id });
  };

  getAllProducts = async () => {
    // Get all product api call
    return this.prospectingService.getProducts({
      supplier_id: this.userData.supplier_id,
      page: 1,
      limit: 1000,
      get_total_count: "false",
    });
  };

  getCampaignTitleAndOtherData = () => {
    const campaignDetails = this.pageData.detail;
    // Setting campaign title text
    // let index = this.campaignTitles.findIndex(i => i.id.toString() === campaignDetails.campaign_title.toString());
    this.campaignTitleText = campaignDetails.title?.title || "Landing page title is deleted";

    if (this.campaignInnerDetails.length > 0 && campaignDetails.innerDetail) {
      // Setting campaign details text
      // index = this.campaignInnerDetails.findIndex(i => i.id.toString() === campaignDetails.campaign_details.toString());
      this.campaignDetailsText = campaignDetails.innerDetail.innerDetail || "Landing page details is deleted";
    }

    // Setting product text
    // let index = this.products.findIndex(i => i.id.toString() === campaignDetails.prospecting_product_id.toString());
    this.productText = campaignDetails.prospectingProduct?.name || "Product is deleted";
  };

  // changePreviewMode = () => {
  //   this.showDesktopMode = !this.showDesktopMode;
  // };

  handleClickBackButton = () => {
    this.backBtnClick();
  };

  saveSaveBtnClick = () => {
    Swal.fire("Congrats!", `${constants.LANDING_PAGE} has been saved!`, "success").then(() => {
      this.router.navigate([routeConstants.BRAND.LIST_PROMOTION]);
    });
  };

  handleClickNextButton = async () => {
    // Api call
    this.setWaitingFlagToTrue();
    const postData = {
      campaign_id: this.campaignId,
    };
    let see = await this.campaignService.campaignActivate(postData);
    // When campaign is submitted, we no longer need campaign id in localstorage.
    // localStorage.removeItem(constants.TEMP_CAMPAIGN_ID);

    this.pageUiService.setProspectingSalesLeadCurrentStep(1);
    this.setWaitingFlagToFalse();
    Swal.fire("Congrats!", `${constants.LANDING_PAGE} has been submitted!`, "success").then(() => {
      // Remove data from service
      this.campaignService.resetCampaignDataToDefault();

      this.router.navigate([routeConstants.BRAND.LIST_PROMOTION]);
    });

    // this.nextBtnClick();
  };
}
