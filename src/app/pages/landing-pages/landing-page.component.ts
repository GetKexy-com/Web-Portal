import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import Swal from 'sweetalert2';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { constants } from 'src/app/helpers/constants';
import { LANDING_PAGE, routeConstants } from 'src/app/helpers/routeConstants';
import { CampaignService } from 'src/app/services/campaign.service';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { Subscription } from 'rxjs';
import { PageUiService } from 'src/app/services/page-ui.service';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import {
  ListOfLandingPageTableComponent,
} from '../../components/list-of-landing-page-table/list-of-landing-page-table.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing-pages',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    ListOfLandingPageTableComponent,
    CommonModule,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
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
    document.title = 'Landing Pages - KEXY';
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
        page: 1,
        limit: 1000,
      }),
    ]);
    await this.getListOfLandingPage();
    console.log('landingpagelist', this.landingPageList);

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
    // const tempDealList = [];
    try {
      const data = await this.campaignService.getListOfCampaigns(postData); // getListOfCampaigns
      this.totalPageCounts = data['totalPageCounts'];
      this.totalRecordsCount = data['totalRecords'];
      this.landingPageList = data['promotions'];

    } catch (e) {
      await Swal.fire('Error', e.message, 'error');
    }
  };

  setPageLimit(newLimit) {
    localStorage.setItem(constants.BRAND_CAMPAIGN_PAGE_LIMIT, newLimit.toString());
    this.limit = parseInt(newLimit);
  }

  deleteLandingPages = async () => {
    if (!this.selectedLandingPages.length) return;

    const isConfirm = await Swal.fire({
      title: 'Are you sure?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Delete!',
    });

    if (isConfirm.dismiss) {
      return;
    }

    const landingPageIds = this.selectedLandingPages.map(i => i.id);
    const postData = {
      ids: landingPageIds,
    };
    if (this.selectedAllLandingPages) {
      postData['ids'] = [];
      postData['selectedAll'] = true;
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
      Swal.fire('Error', e.message);

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
      queryParams.action = 'duplicate';
    }

    this.router.navigate([routeConstants.BRAND.LANDING_PAGES], {
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
    console.log(this.selectedLandingPages);
    const url = environment.siteUrl + '/landing-page?id=' + this.selectedLandingPages[0].campaign.token;
    await navigator.clipboard.writeText(url);

    this.isUrlCopied = true;
    setTimeout(() => {
      this.isUrlCopied = false;
    }, 5000);
  };

  protected readonly constants = constants;
}
