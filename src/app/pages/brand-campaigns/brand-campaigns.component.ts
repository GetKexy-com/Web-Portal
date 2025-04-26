import { Component, OnDestroy, OnInit } from "@angular/core";
import { AuthService } from "src/app/services/auth.service";
import Swal from "sweetalert2";
import { environment } from "src/environments/environment";
import { Router } from "@angular/router";
import { constants } from "src/app/helpers/constants";
import { routeConstants } from "src/app/helpers/routeConstants";
import { CampaignService } from "src/app/services/campaign.service";
import { ProspectingService } from "src/app/services/prospecting.service";
import { Subscription } from "rxjs";
import { PageUiService } from "src/app/services/page-ui.service";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
import {
  ListOfLandingPageTableComponent
} from '../../components/list-of-landing-page-table/list-of-landing-page-table.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-brand-campaigns',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    ListOfLandingPageTableComponent,
    CommonModule
  ],
  templateUrl: './brand-campaigns.component.html',
  styleUrl: './brand-campaigns.component.scss'
})
export class BrandCampaignsComponent {
  isWaitingFlag: boolean = false;
  initialLoads = true;
  isLoading = false;
  landingPageList = [];
  page = 1;
  limit = 25;
  userData;
  dripCampaignTitles;
  totalPageCounts;
  totalRecordsCount;
  selectedLandingPages = [];
  campaignTitles;
  campaignDetails;
  products;
  selectedAllLandingPages = false;
  public dripCampaignTitlesSubscription: Subscription;

  constructor(
    private _authService: AuthService,
    private router: Router,
    private campaignService: CampaignService,
    private prospectingService: ProspectingService,
    private pageUiService: PageUiService,
  ) {
  }

  async ngOnInit() {
    document.title = "List of Landing Page - KEXY Brand Portal";
    this.isWaitingFlag = true;
    this.userData = this._authService.userTokenValue;

    let limit = localStorage.getItem(constants.BRAND_CAMPAIGN_PAGE_LIMIT);
    if (!limit) {
      this.setPageLimit(this.limit);
    } else {
      this.setPageLimit(limit);
    }

    [this.campaignTitles, this.campaignDetails, this.products] = await Promise.all([
      this.campaignService.getAllCampaignTitle(),
      this.campaignService.getAllCampaignInnerDetail({ supplier_id: this.userData.supplier_id }),
      this.prospectingService.getProducts({
        supplier_id: this.userData.supplier_id,
        page: 1,
        limit: 1000,
        get_total_count: "false",
      }),
    ]);
    await this.getListOfLandingPage();
    console.log("landingpagelist", this.landingPageList);

    this.isWaitingFlag = false;
    this.initialLoads = false;
  }

  ngOnDestroy(): void {
  }

  getCampaignTitle = (title_id) => {
    const index = this.campaignTitles && this.campaignTitles.findIndex(i => i.id.toString() === title_id.toString());
    if (index < 0) return;

    return this.campaignTitles[index].title;
  };

  getCampaignDetails = (details_id) => {
    const index = this.campaignDetails && this.campaignDetails.findIndex(i => i.id.toString() === details_id.toString());
    if (index < 0) return;

    return this.campaignDetails[index].inner_detail;
  };

  getCampaignProductName = (product_id) => {
    const index = this.products && this.products.findIndex(i => i.id.toString() === product_id.toString());
    if (index < 0) return;

    return this.products[index].name;
  };

  getListOfLandingPage = async () => {
    const postData = {
      page: this.page,
      supplier_id: this.userData.supplier_id,
      limit: this.limit,
      get_total_count: true,
    };
    const tempDealList = [];
    try {
      const data = await this.campaignService.getCampaigns(postData);
      this.totalPageCounts = Math.ceil(data["total"] / this.limit);
      this.totalRecordsCount = data["total"];

      data["campaigns"].forEach((campaign) => {
        const details = campaign.campaign_detail;
        let dealEndDateTime = new Date(details.end_date).getTime();

        let dealSingletem = {
          id: campaign.id,
          deal_title: details.campaign_title,
          campaign_title_text: this.getCampaignTitle(details.campaign_title),
          campaign_details_text: this.getCampaignDetails(details.campaign_details),
          product_name: this.getCampaignProductName(details.prospecting_product_id),
          deal_image: environment.imageUrl + details.campaign_image,
          deal_category: details.category_id,
          deal_price: details.price,
          type_of_campaign: details.campaign_type,
          end_at: dealEndDateTime,
          status: campaign.status,
          analytics: {
            impressions: "0",
            clicks: "0",
            ctr: "0%",
          },
          action: "",
          campaign,
        };

        tempDealList.push(dealSingletem);

      });

      tempDealList.sort(function(a, b) {
        const a1 = a.id,
          b1 = b.id;
        if (a1 == b1) return 0;
        return a1 < b1 ? 1 : -1;
      });

      this.landingPageList = tempDealList;

    } catch (e) {
      Swal.fire("Error", e.message, "error");
    }
  };

  setPageLimit(newLimit) {
    localStorage.setItem(constants.BRAND_CAMPAIGN_PAGE_LIMIT, newLimit.toString());
    this.limit = parseInt(newLimit);
  }

  deleteLandingPages = async () => {
    if (!this.selectedLandingPages.length) return;

    const isConfirm = await Swal.fire({
      title: "Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Delete!",
    });

    if (isConfirm.dismiss) {
      return;
    }

    const landingPageIds = this.selectedLandingPages.map(i => i.id.toString());
    const postData = {
      supplier_id: this.userData.supplier_id,
      campaign_ids: landingPageIds,
    };
    if (this.selectedAllLandingPages) {
      postData["campaign_ids"] = [];
      postData["selected_all_landing_page"] = "true";
    }

    const swal = this.pageUiService.showSweetAlertLoading();
    swal.showLoading();

    try {
      // delete api here
      await this.campaignService.deleteCampaigns(postData);
      await this.getListOfLandingPage();
      this.selectedLandingPages = [];
      this.selectedAllLandingPages = false;

    } catch (e) {
      Swal.fire("Error", e.message);

    } finally {
      swal.close();
    }
  };

  redirectToEditPage = (duplicate = false) => {
    const queryParams: any = {
      id: this.selectedLandingPages[0].id,
    };

    // Only add 'action' param if duplicate is true
    if (duplicate) {
      queryParams.action = "duplicate";
    }

    this.router.navigate([routeConstants.BRAND.PROMOTIONS], {
      queryParams,
    });
  };

  receivedLimitNumber = async (limit) => {
    // this.limit = parseInt(limit);
    this.setPageLimit(limit);
    this.page = 1;

    this.isWaitingFlag = true;
    await this.getListOfLandingPage();
    this.isWaitingFlag = false;
  };

  paginationRightArrowClick = async () => {
    if (this.page === this.totalPageCounts) return;

    this.isLoading = true;
    this.page += 1;
    await this.getListOfLandingPage();
    this.isLoading = false;
  };

  paginationLeftArrowClick = async () => {
    if (this.page === 1) return;

    this.isLoading = true;
    this.page -= 1;
    await this.getListOfLandingPage();
    this.isLoading = false;
  };


  handleContactSelect = (selectedRow, isSelectAll) => {
    if (isSelectAll) {
      if (this.landingPageList.some((i) => i.is_selected)) {
        this.landingPageList.map((i) => {
          i.is_selected = false;
          const index = this.selectedLandingPages.findIndex((j) => j.id === i.id);
          if (index > -1) {
            this.selectedLandingPages.splice(index, 1);
          }
        });
      } else {
        this.landingPageList.map((i) => {
          i.is_selected = true;
          const index = this.selectedLandingPages.findIndex((j) => j.id === i.id);
          if (index === -1) {
            this.selectedLandingPages.push(i);
          }
        });
      }
    } else {
      const rowIndex = this.landingPageList.findIndex((i) => i.id === selectedRow.id);
      this.landingPageList[rowIndex].is_selected = !this.landingPageList[rowIndex].is_selected;

      if (this.landingPageList[rowIndex].is_selected) {
        const index = this.selectedLandingPages.findIndex((j) => j.id === this.landingPageList[rowIndex].id);
        if (index === -1) {
          this.selectedLandingPages.push(this.landingPageList[rowIndex]);
        }
      } else {
        const index = this.selectedLandingPages.findIndex((j) => j.id === this.landingPageList[rowIndex].id);
        if (index > -1) {
          this.selectedLandingPages.splice(index, 1);
        }
      }
    }

    // reset selectedAllDripCampaigns to default
    this.selectedAllLandingPages = false;
  };

  toggleSelectAllSelection = () => {
    this.selectedAllLandingPages = !this.selectedAllLandingPages;
  };

  isUrlCopied: boolean = false;
  copyUrl = async () => {
    const url = environment.siteUrl + "/promotion?id=" + this.selectedLandingPages[0].campaign.token;
    await navigator.clipboard.writeText(url);

    this.isUrlCopied = true;
    setTimeout(() => {
      this.isUrlCopied = false;
    }, 5000);
  };

  protected readonly constants = constants;
}
