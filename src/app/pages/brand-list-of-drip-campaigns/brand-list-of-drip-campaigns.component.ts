// import { Component, OnDestroy, OnInit } from "@angular/core";
// import { constants } from "src/app/helpers/constants";
// import { DripCampaignService } from "src/app/services/drip-campaign.service";
// import { AuthService } from "src/app/services/auth.service";
// import { Subscription } from "rxjs";
// import { routeConstants } from "src/app/helpers/routeConstants";
// import { Router } from "@angular/router";
// import Swal from "sweetalert2";
// import { HttpService } from "src/app/services/http.service";
// import { ProspectingService } from "src/app/services/prospecting.service";
// import { PageUiService } from "src/app/services/page-ui.service";
// import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
// import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
// import {
//   ListOfDripCampaignTableComponent
// } from '../../components/list-of-drip-campaign-table/list-of-drip-campaign-table.component';
//
// @Component({
//   selector: 'brand-list-of-drip-campaigns',
//   imports: [
//     BrandLayoutComponent,
//     KexyButtonComponent,
//     ListOfDripCampaignTableComponent
//   ],
//   templateUrl: './brand-list-of-drip-campaigns.component.html',
//   styleUrl: './brand-list-of-drip-campaigns.component.scss'
// })
// export class BrandListOfDripCampaignsComponent {
//   isWaitingFlag: boolean = false;
//   initialLoads = true;
//   isLoading = false;
//   dripCampaignList = [];
//   page = 1;
//   limit = 25;
//   userData;
//   dripCampaignTitles;
//   totalPageCounts;
//   totalRecordsCount;
//   selectedDripCampaigns = [];
//   selectedAllDripCampaigns = false;
//   public dripCampaignTitlesSubscription: Subscription;
//
//   constructor(private _authService: AuthService, private router: Router, private dripCampaignService: DripCampaignService, private prospectingService: ProspectingService, private httpService: HttpService, private pageUiService: PageUiService) {
//   }
//
//   async ngOnInit() {
//     document.title = "List of Drip Campaign - KEXY Brand Portal";
//     this.isWaitingFlag = true;
//     this.userData = this._authService.userTokenValue;
//
//     let limit = localStorage.getItem(constants.BRAND_DRIP_CAMPAIGN_PAGE_LIMIT);
//     if (!limit) {
//       this.setPageLimit(this.limit);
//     } else {
//       this.setPageLimit(limit);
//     }
//
//     await this.getAndSetDripCampaignTitleSubscription();
//     await this.getListOfDripCampaigns();
//     await this.getLabels();
//
//     this.isWaitingFlag = false;
//     this.initialLoads = false;
//   }
//
//   ngOnDestroy(): void {
//     if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
//   }
//
//   getLabels = async () => {
//     // Get Label
//     await this.prospectingService.getLabels({ supplier_id: this.userData.supplier_id });
//   };
//
//   getListOfDripCampaigns = async () => {
//     const data = await this.dripCampaignService.getListOfDripCampaigns(this.limit, this.page, this.userData.supplier_id);
//     this.dripCampaignList = data["dripCampaigns"];
//     this.totalPageCounts = data["totalPageCounts"];
//     this.totalRecordsCount = data["totalRecordsCount"];
//   };
//
//   getAndSetDripCampaignTitleSubscription = async () => {
//     await this.dripCampaignService.getAllDripCampaignTitle({ supplier_id: this.userData.supplier_id });
//
//     this.dripCampaignTitlesSubscription = this.dripCampaignService.dripCampaignTitles.subscribe((dripCampaignTitles) => {
//       this.dripCampaignTitles = dripCampaignTitles;
//       this.dripCampaignTitles.map((i) => {
//         i.value = i.title.length > 100 ? i.title.slice(0, 100) + "..." : i.title;
//       });
//     });
//   };
//
//   setPageLimit(newLimit) {
//     localStorage.setItem(constants.BRAND_DRIP_CAMPAIGN_PAGE_LIMIT, newLimit.toString());
//     this.limit = parseInt(newLimit);
//   }
//
//   pauseOrResumeOrDeleteDripCampaign = async (forDelete = false) => {
//     const dripCampaign = this.selectedDripCampaigns[0];
//
//     const confirmText = forDelete ? "Yes, Delete!" : (dripCampaign.status === constants.ACTIVE ? "Yes, Pause!" : "Yes, Resume!");
//
//     const isConfirm = await Swal.fire({
//       title: "Are you sure?",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#3085d6",
//       cancelButtonColor: "#d33",
//       confirmButtonText: confirmText,
//     });
//
//     if (isConfirm.dismiss) {
//       return;
//     }
//
//     Swal.fire({
//       title: "",
//       text: "Please wait...",
//       showConfirmButton: false,
//       showCancelButton: false,
//       allowOutsideClick: false,
//       allowEscapeKey: false,
//     });
//     Swal.showLoading();
//
//     const payload = {
//       drip_campaign_id: dripCampaign.id,
//       supplier_id: this.userData.supplier_id,
//       allowed_credit_limit: dripCampaign.allowed_credit_limit,
//       drip_campaign_title_id: dripCampaign.drip_campaign_detail.drip_campaign_title_id,
//       number_of_emails: dripCampaign.drip_campaign_detail.number_of_emails,
//       email_tone: dripCampaign.drip_campaign_detail.email_tone,
//       email_length: dripCampaign.drip_campaign_detail.email_length || "",
//       website_url: dripCampaign.drip_campaign_detail.website_url,
//       calendly_link: dripCampaign.drip_campaign_detail.calendly_link,
//       campaign_id: dripCampaign.drip_campaign_detail.campaign_id,
//       supplier_side: dripCampaign.supplier_side,
//       status: dripCampaign.status === constants.ACTIVE ? constants.PAUSE : constants.ACTIVE,
//       establishment_search_type: dripCampaign.establishment_search_type,
//       establishment_search_value: dripCampaign.establishment_search_value,
//       target_audience: dripCampaign.target_audience,
//       email_about: dripCampaign.email_about,
//       audience_type: dripCampaign.audience_type,
//     };
//
//     if (forDelete) payload.status = constants.DELETED;
//
//     try {
//       await this.dripCampaignService.createOrUpdateDripCampaign(payload);
//       if (forDelete) {
//         await this.getListOfDripCampaigns();
//         this.selectedDripCampaigns = [];
//       } else {
//         dripCampaign.status = payload.status;
//       }
//       await this.httpService.post("user/setUsersActionLog", { actionType: "Paused a drip campaign" }).toPromise();
//       Swal.close();
//
//     } catch (e) {
//       Swal.close();
//       Swal.fire("Error", e.message);
//       console.log(e);
//     }
//   };
//
//   deleteDripCampaigns = async () => {
//     if (!this.selectedDripCampaigns.length) return;
//
//     const isConfirm = await Swal.fire({
//       title: "Are you sure?",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#3085d6",
//       cancelButtonColor: "#d33",
//       confirmButtonText: "Yes, Delete!",
//     });
//
//     if (isConfirm.dismiss) {
//       return;
//     }
//
//     const dripCampaignIds = this.selectedDripCampaigns.map(i => i.id.toString());
//     const postData = {
//       supplier_id: this.userData.supplier_id,
//       drip_campaign_ids: dripCampaignIds,
//     };
//     if (this.selectedAllDripCampaigns) {
//       postData["drip_campaign_ids"] = [];
//       postData["selected_all_drip_campaigns"] = "true";
//     }
//
//     const swal = this.pageUiService.showSweetAlertLoading();
//     swal.showLoading();
//
//     try {
//       await this.dripCampaignService.deleteDripCampaigns(postData);
//       await this.getListOfDripCampaigns();
//       this.selectedDripCampaigns = [];
//       this.selectedAllDripCampaigns = false;
//
//     } catch (e) {
//       Swal.fire("Error", e.message);
//
//     } finally {
//       swal.close();
//     }
//   };
//
//   redirectToEditPage = (duplicate = false) => {
//     const queryParams: any = {
//       id: this.selectedDripCampaigns[0].id,
//     };
//
//     // Only add 'action' param if duplicate is true
//     if (duplicate) {
//       queryParams.action = "duplicate";
//     }
//
//     this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN], {
//       queryParams,
//     });
//   };
//
//   setBtnLabelBasedOnCampaignStatus = () => {
//     const dripCampaign = this.selectedDripCampaigns[0];
//     if (!dripCampaign) return;
//     if (dripCampaign.status === constants.ACTIVE) return "Pause";
//     if (dripCampaign.status === constants.PAUSE) return "Resume";
//   };
//
//   setBtnIconBasedOnCampaignStatus = () => {
//     const dripCampaign = this.selectedDripCampaigns[0];
//     if (!dripCampaign) return;
//     if (dripCampaign.status === constants.ACTIVE) return "fa-pause-circle-o";
//     if (dripCampaign.status === constants.PAUSE) return "fa-play-circle-o";
//   };
//
//   receivedLimitNumber = async (limit) => {
//     // this.limit = parseInt(limit);
//     this.setPageLimit(limit);
//     this.page = 1;
//
//     this.isWaitingFlag = true;
//     await this.getListOfDripCampaigns();
//     this.isWaitingFlag = false;
//   };
//
//   paginationRightArrowClick = async () => {
//     if (this.page === this.totalPageCounts) return;
//
//     this.isLoading = true;
//     this.page += 1;
//     await this.getListOfDripCampaigns();
//     this.isLoading = false;
//   };
//
//   paginationLeftArrowClick = async () => {
//     if (this.page === 1) return;
//
//     this.isLoading = true;
//     this.page -= 1;
//     await this.getListOfDripCampaigns();
//     this.isLoading = false;
//   };
//
//
//   handleContactSelect = (selectedRow, isSelectAll) => {
//     if (isSelectAll) {
//       if (this.dripCampaignList.some((i) => i.is_selected)) {
//         this.dripCampaignList.map((i) => {
//           i.is_selected = false;
//           const index = this.selectedDripCampaigns.findIndex((j) => j.id === i.id);
//           if (index > -1) {
//             this.selectedDripCampaigns.splice(index, 1);
//           }
//         });
//       } else {
//         this.dripCampaignList.map((i) => {
//           i.is_selected = true;
//           const index = this.selectedDripCampaigns.findIndex((j) => j.id === i.id);
//           if (index === -1) {
//             this.selectedDripCampaigns.push(i);
//           }
//         });
//       }
//     } else {
//       const rowIndex = this.dripCampaignList.findIndex((i) => i.id === selectedRow.id);
//       this.dripCampaignList[rowIndex].is_selected = !this.dripCampaignList[rowIndex].is_selected;
//
//       if (this.dripCampaignList[rowIndex].is_selected) {
//         const index = this.selectedDripCampaigns.findIndex((j) => j.id === this.dripCampaignList[rowIndex].id);
//         if (index === -1) {
//           this.selectedDripCampaigns.push(this.dripCampaignList[rowIndex]);
//         }
//       } else {
//         const index = this.selectedDripCampaigns.findIndex((j) => j.id === this.dripCampaignList[rowIndex].id);
//         if (index > -1) {
//           this.selectedDripCampaigns.splice(index, 1);
//         }
//       }
//     }
//
//     // reset selectedAllDripCampaigns to default
//     this.selectedAllDripCampaigns = false;
//
//     // This code works like radio options
//     // const index = this.selectedDripCampaigns.findIndex((j) => j.id === selectedRow.id);
//     // this.selectedDripCampaigns = [];
//     // if (index === -1) {
//     //   this.selectedDripCampaigns.push(selectedRow);
//     // }
//   };
//
//   addContactBtnClick = () => {
//     this.router.navigate([routeConstants.BRAND.MANAGE_CONTACTS], { queryParams: { addToDripCampaignId: this.selectedDripCampaigns[0].id } });
//   };
//
//   toggleSelectAllSelection = () => {
//     this.selectedAllDripCampaigns = !this.selectedAllDripCampaigns;
//   };
//
//   protected readonly constants = constants;
// }

import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { constants } from 'src/app/helpers/constants';
import { routeConstants } from 'src/app/helpers/routeConstants';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { PageUiService } from 'src/app/services/page-ui.service';
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
import {ListOfDripCampaignTableComponent} from '../../components/list-of-drip-campaign-table/list-of-drip-campaign-table.component';

@Component({
  selector: 'brand-list-of-drip-campaigns',
  standalone: true,
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    ListOfDripCampaignTableComponent,
    BrandLayoutComponent,
    KexyButtonComponent
  ],
  templateUrl: './brand-list-of-drip-campaigns.component.html',
  styleUrl: './brand-list-of-drip-campaigns.component.scss'
})
export class BrandListOfDripCampaignsComponent {
  // Services
  private authService = inject(AuthService);
  private router = inject(Router);
  private dripCampaignService = inject(DripCampaignService);
  private prospectingService = inject(ProspectingService);
  private httpService = inject(HttpService);
  private pageUiService = inject(PageUiService);
  private destroyRef = inject(DestroyRef);

  // State signals
  isWaitingFlag = signal(false);
  initialLoads = signal(true);
  isLoading = signal(false);
  dripCampaignList = signal<any[]>([]);
  page = signal(1);
  limit = signal(25);
  userData = signal<any>(null);
  dripCampaignTitles = signal<any[]>([]);
  totalPageCounts = signal(0);
  totalRecordsCount = signal(0);
  selectedDripCampaigns = signal<any[]>([]);
  selectedAllDripCampaigns = signal(false);

  // Constants
  protected readonly constants = constants;

  async ngOnInit() {
    document.title = "List of Drip Campaign - KEXY Brand Portal";
    this.isWaitingFlag.set(true);
    this.userData.set(this.authService.userTokenValue);

    const limit = localStorage.getItem(constants.BRAND_DRIP_CAMPAIGN_PAGE_LIMIT);
    this.setPageLimit(limit ? parseInt(limit) : this.limit());

    await Promise.all([
      this.getAndSetDripCampaignTitleSubscription(),
      this.getListOfDripCampaigns(),
      this.getLabels()
    ]);

    this.isWaitingFlag.set(false);
    this.initialLoads.set(false);
  }

  async getLabels() {
    await this.prospectingService.getLabels({ supplier_id: this.userData().supplier_id });
  }

  async getListOfDripCampaigns() {
    const data = await this.dripCampaignService.getListOfDripCampaigns(
      this.limit(),
      this.page(),
      this.userData().supplier_id
    );

    this.dripCampaignList.set(data["dripCampaigns"]);
    this.totalPageCounts.set(data["totalPageCounts"]);
    this.totalRecordsCount.set(data["totalRecordsCount"]);
  }

  async getAndSetDripCampaignTitleSubscription() {
    await this.dripCampaignService.getAllDripCampaignTitle({
      supplier_id: this.userData().supplier_id
    });

    this.dripCampaignService.dripCampaignTitles
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(titles => {
        const processedTitles = titles.map(i => ({
          ...i,
          value: i.title.length > 100 ? `${i.title.slice(0, 100)}...` : i.title
        }));
        this.dripCampaignTitles.set(processedTitles);
      });
  }

  setPageLimit(newLimit: number) {
    localStorage.setItem(constants.BRAND_DRIP_CAMPAIGN_PAGE_LIMIT, newLimit.toString());
    this.limit.set(newLimit);
  }

  async pauseOrResumeOrDeleteDripCampaign(forDelete = false) {
    const dripCampaign = this.selectedDripCampaigns()[0];
    if (!dripCampaign) return;

    const confirmText = forDelete
      ? "Yes, Delete!"
      : (dripCampaign.status === constants.ACTIVE ? "Yes, Pause!" : "Yes, Resume!");

    const isConfirm = await Swal.fire({
      title: "Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: confirmText,
    });

    if (isConfirm.dismiss) return;

    await Swal.fire({
      title: "",
      text: "Please wait...",
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    const payload = {
      drip_campaign_id: dripCampaign.id,
      supplier_id: this.userData().supplier_id,
      allowed_credit_limit: dripCampaign.allowed_credit_limit,
      drip_campaign_title_id: dripCampaign.drip_campaign_detail.drip_campaign_title_id,
      number_of_emails: dripCampaign.drip_campaign_detail.number_of_emails,
      email_tone: dripCampaign.drip_campaign_detail.email_tone,
      email_length: dripCampaign.drip_campaign_detail.email_length || "",
      website_url: dripCampaign.drip_campaign_detail.website_url,
      calendly_link: dripCampaign.drip_campaign_detail.calendly_link,
      campaign_id: dripCampaign.drip_campaign_detail.campaign_id,
      supplier_side: dripCampaign.supplier_side,
      status: forDelete
        ? constants.DELETED
        : (dripCampaign.status === constants.ACTIVE ? constants.PAUSE : constants.ACTIVE),
      establishment_search_type: dripCampaign.establishment_search_type,
      establishment_search_value: dripCampaign.establishment_search_value,
      target_audience: dripCampaign.target_audience,
      email_about: dripCampaign.email_about,
      audience_type: dripCampaign.audience_type,
    };

    try {
      await this.dripCampaignService.createOrUpdateDripCampaign(payload);

      if (forDelete) {
        await this.getListOfDripCampaigns();
        this.selectedDripCampaigns.set([]);
      } else {
        const updatedList = this.dripCampaignList().map(item =>
          item.id === dripCampaign.id ? { ...item, status: payload.status } : item
        );
        this.dripCampaignList.set(updatedList);
      }

      await this.httpService.post("user/setUsersActionLog", {
        actionType: "Paused a drip campaign"
      }).toPromise();
    } catch (e) {
      Swal.fire("Error", e.message);
      console.error(e);
    } finally {
      Swal.close();
    }
  }

  async deleteDripCampaigns() {
    if (!this.selectedDripCampaigns().length) return;

    const isConfirm = await Swal.fire({
      title: "Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Delete!",
    });

    if (isConfirm.dismiss) return;

    const swal = this.pageUiService.showSweetAlertLoading();
    swal.showLoading();

    const postData = {
      supplier_id: this.userData().supplier_id,
      drip_campaign_ids: this.selectedAllDripCampaigns()
        ? []
        : this.selectedDripCampaigns().map(i => i.id.toString()),
      selected_all_drip_campaigns: this.selectedAllDripCampaigns() ? "true" : undefined
    };

    try {
      await this.dripCampaignService.deleteDripCampaigns(postData);
      await this.getListOfDripCampaigns();
      this.selectedDripCampaigns.set([]);
      this.selectedAllDripCampaigns.set(false);
    } catch (e) {
      Swal.fire("Error", e.message);
    } finally {
      swal.close();
    }
  }

  redirectToEditPage(duplicate = false) {
    const queryParams: any = {
      id: this.selectedDripCampaigns()[0]?.id,
    };

    if (duplicate) {
      queryParams.action = "duplicate";
    }

    this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN], { queryParams });
  }

  setBtnLabelBasedOnCampaignStatus() {
    const dripCampaign = this.selectedDripCampaigns()[0];
    if (!dripCampaign) return '';
    return dripCampaign.status === constants.ACTIVE ? "Pause" : "Resume";
  }

  setBtnIconBasedOnCampaignStatus() {
    const dripCampaign = this.selectedDripCampaigns()[0];
    if (!dripCampaign) return '';
    return dripCampaign.status === constants.ACTIVE ? "fa-pause-circle-o" : "fa-play-circle-o";
  }

  async receivedLimitNumber(limit: number) {
    this.setPageLimit(limit);
    this.page.set(1);
    this.isWaitingFlag.set(true);
    await this.getListOfDripCampaigns();
    this.isWaitingFlag.set(false);
  }

  async paginationRightArrowClick() {
    if (this.page() === this.totalPageCounts()) return;
    this.isLoading.set(true);
    this.page.update(p => p + 1);
    await this.getListOfDripCampaigns();
    this.isLoading.set(false);
  }

  async paginationLeftArrowClick() {
    if (this.page() === 1) return;
    this.isLoading.set(true);
    this.page.update(p => p - 1);
    await this.getListOfDripCampaigns();
    this.isLoading.set(false);
  }

  handleContactSelect(selectedRow: any, isSelectAll: boolean) {
    if (isSelectAll) {
      const hasSelected = this.dripCampaignList().some(i => i.is_selected);

      const updatedList = this.dripCampaignList().map(i => ({
        ...i,
        is_selected: !hasSelected
      }));

      this.dripCampaignList.set(updatedList);

      this.selectedDripCampaigns.set(
        !hasSelected
          ? [...this.dripCampaignList()]
          : []
      );
    } else {
      const rowIndex = this.dripCampaignList().findIndex(i => i.id === selectedRow.id);
      if (rowIndex === -1) return;

      const updatedList = [...this.dripCampaignList()];
      updatedList[rowIndex] = {
        ...updatedList[rowIndex],
        is_selected: !updatedList[rowIndex].is_selected
      };

      this.dripCampaignList.set(updatedList);

      this.selectedDripCampaigns.update(selected =>
        updatedList[rowIndex].is_selected
          ? [...selected, updatedList[rowIndex]]
          : selected.filter(j => j.id !== updatedList[rowIndex].id)
      );
    }

    this.selectedAllDripCampaigns.set(false);
  }

  addContactBtnClick() {
    this.router.navigate([routeConstants.BRAND.MANAGE_CONTACTS], {
      queryParams: { addToDripCampaignId: this.selectedDripCampaigns()[0]?.id }
    });
  }

  toggleSelectAllSelection() {
    this.selectedAllDripCampaigns.update(v => !v);
  }
}
