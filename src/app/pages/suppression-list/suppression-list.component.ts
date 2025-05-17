// import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
// import { AuthService } from "src/app/services/auth.service";
// import { NgbModal, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import { constants } from "src/app/helpers/constants";
// import Swal from "sweetalert2";
// import { lastValueFrom, Subscription } from "rxjs";
// import { DripCampaignService } from "src/app/services/drip-campaign.service";
// import { PageUiService } from "src/app/services/page-ui.service";
// import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
// import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
// import {SuppressionListCardComponent} from '../../components/suppression-list-card/suppression-list-card.component';
// import {
//   UploadVendorsModalContentComponent
// } from '../../components/upload-vendors-modal-content/upload-vendors-modal-content.component';
// import {AddSuppressionComponent} from '../../components/add-suppression/add-suppression.component';
//
// @Component({
//   selector: 'app-suppression-list',
//   imports: [
//     BrandLayoutComponent,
//     KexyButtonComponent,
//     SuppressionListCardComponent,
//     UploadVendorsModalContentComponent
//   ],
//   templateUrl: './suppression-list.component.html',
//   styleUrl: './suppression-list.component.scss'
// })
// export class SuppressionListComponent {
//   modalReference;
//   userData;
//   supplierId;
//   suppressionList = [];
//   isWaitingFlag: boolean = true;
//   isLoading: boolean = false;
//   selectAllContacts = false;
//   selectedContacts = [];
//   page = 1;
//   limit = 100;
//   totalPage;
//   totalContactsCount = 0;
//   suppressionListSubscription: Subscription;
//
//   constructor(
//     private _authService: AuthService,
//     private dripCampaignServioce: DripCampaignService,
//     private pageUiService: PageUiService,
//     private ngbOffcanvas: NgbOffcanvas,
//     private modal: NgbModal,
//   ) {
//   }
//
//   async ngOnInit() {
//     document.title = "Suppression List - KEXY Brand Portal";
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//
//     // Set pagination limit from localstorage if found
//     const limit = localStorage.getItem(constants.SUPPRESSION_TABLE_PAGINATION_LIMIT);
//     if (limit) {
//       this.limit = parseInt(limit);
//     }
//
//     // get suppression list
//     await this.getSuppressionList();
//
//     this.isWaitingFlag = false;
//   }
//
//   ngOnDestroy() {
//     if (this.suppressionListSubscription) this.suppressionListSubscription.unsubscribe();
//   }
//
//   getSuppressionListApiPostData = () => {
//     return {
//       supplier_id: this.supplierId,
//       page: this.page,
//       limit: this.limit,
//       get_total_count: true,
//     };
//   };
//
//   getSuppressionList = async () => {
//     const postData = this.getSuppressionListApiPostData();
//     await this.dripCampaignServioce.getSuppressionList(postData);
//     this.suppressionListSubscription = this.dripCampaignServioce.dripCampaignSuppressionList.subscribe((data) => {
//       console.log("data", data);
//       this.suppressionList = data["suppression_list"];
//       this.totalContactsCount = data["total"];
//       this.totalPage = Math.ceil(this.totalContactsCount / this.limit);
//     });
//   };
//
//   importBtnClick = (content) => {
//     this.dripCampaignServioce.suppressionListApiPostData = this.getSuppressionListApiPostData();
//     this.modalReference = this.modal.open(content, { size: "md" });
//   };
//
//   closeModal = () => {
//     this.modalReference.close();
//   };
//
//   addNewRepClick = () => {
//     this.dripCampaignServioce.suppressionListApiPostData = this.getSuppressionListApiPostData();
//     this.ngbOffcanvas.open(AddSuppressionComponent, {
//       panelClass: "email-content edit-rep-canvas",
//       backdropClass: "edit-rep-canvas-backdrop",
//       position: "end",
//       scroll: false,
//     });
//   };
//
//   handleContactSelect = (selectedRow, isSelectAll) => {
//     if (isSelectAll) {
//       if (this.suppressionList.some((i) => i.is_selected)) {
//         this.suppressionList.map((i) => {
//           i.is_selected = false;
//           const index = this.selectedContacts.findIndex((j) => j.id === i.id);
//           if (index > -1) {
//             this.selectedContacts.splice(index, 1);
//           }
//         });
//       } else {
//         this.suppressionList.map((i) => {
//           i.is_selected = true;
//           const index = this.selectedContacts.findIndex((j) => j.id === i.id);
//           if (index === -1) {
//             this.selectedContacts.push(i);
//           }
//         });
//       }
//     } else {
//       const rowIndex = this.suppressionList.findIndex((i) => i.id === selectedRow.id);
//       this.suppressionList[rowIndex].is_selected = !this.suppressionList[rowIndex].is_selected;
//
//       if (this.suppressionList[rowIndex].is_selected) {
//         const index = this.selectedContacts.findIndex((j) => j.id === this.suppressionList[rowIndex].id);
//         if (index === -1) {
//           this.selectedContacts.push(this.suppressionList[rowIndex]);
//         }
//       } else {
//         const index = this.selectedContacts.findIndex((j) => j.id === this.suppressionList[rowIndex].id);
//         if (index > -1) {
//           this.selectedContacts.splice(index, 1);
//         }
//       }
//     }
//
//     // reset selectedAllDripCampaigns to default
//     this.selectAllContacts = false;
//   };
//
//   receivedLimitNumber = async (limit) => {
//     this.limit = parseInt(limit);
//     localStorage.setItem(constants.SUPPRESSION_TABLE_PAGINATION_LIMIT, limit);
//     this.page = 1;
//
//     this.isWaitingFlag = true;
//     await this.getSuppressionList();
//     this.isWaitingFlag = false;
//
//     // Reset select all contacts
//     this.selectAllContacts = false;
//   };
//
//   paginationRightArrowClick = async () => {
//     if (this.page === this.totalPage) return;
//
//     this.page += 1;
//     await this.getSuppressionList();
//
//     // Reset select all contacts
//     this.selectAllContacts = false;
//   };
//
//   paginationLeftArrowClick = async () => {
//     if (this.page === 1) return; // Here added 1 with page because page starts with 0
//
//     this.page -= 1;
//     await this.getSuppressionList();
//
//     // Reset select all contacts
//     this.selectAllContacts = false;
//   };
//
//   toggleSelectAllContactSelection = () => {
//     this.selectAllContacts = !this.selectAllContacts;
//   };
//
//   deleteClick = async () => {
//     console.log(this.selectedContacts);
//
//     let isConfirm = await Swal.fire({
//       title: "Are you sure?",
//       text: "You won't be able to revert this!",
//       showCancelButton: true,
//       confirmButtonColor: "#3085d6",
//       cancelButtonColor: "#b8b6b6",
//       confirmButtonText: "Yes",
//     });
//
//     if (isConfirm.dismiss) {
//       return;
//     }
//
//     const selectedContactIds = this.selectedContacts.map(i => i.id);
//     const payLoad = {
//       supplier_id: this.supplierId,
//       suppression_user_ids: selectedContactIds,
//     };
//     if (this.selectAllContacts) payLoad["selected_all_suppression_user"] = "true";
//
//     const swal = this.pageUiService.showSweetAlertLoading();
//     swal.showLoading();
//
//     try {
//       await this.dripCampaignServioce.deleteSuppressionUser(payLoad);
//       await this.getSuppressionList();
//       this.selectedContacts = [];
//     } catch (e) {
//       Swal.fire("Error", e.message);
//     } finally {
//       swal.close();
//       this.selectAllContacts = false;
//     }
//   };
// }

import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from 'src/app/services/auth.service';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import { PageUiService } from 'src/app/services/page-ui.service';
import { constants } from 'src/app/helpers/constants';
import Swal from 'sweetalert2';
import {AddSuppressionComponent} from '../../components/add-suppression/add-suppression.component';
import {
  UploadVendorsModalContentComponent
} from '../../components/upload-vendors-modal-content/upload-vendors-modal-content.component';
import {SuppressionListCardComponent} from '../../components/suppression-list-card/suppression-list-card.component';
import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';

@Component({
  selector: 'suppression-list',
  standalone: true,
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    SuppressionListCardComponent,
    UploadVendorsModalContentComponent,
    UploadVendorsModalContentComponent,
    SuppressionListCardComponent,
    KexyButtonComponent,
    BrandLayoutComponent
  ],
  templateUrl: './suppression-list.component.html',
  styleUrl: './suppression-list.component.scss'
})
export class SuppressionListComponent {
  // Services
  private authService = inject(AuthService);
  private dripCampaignService = inject(DripCampaignService);
  private pageUiService = inject(PageUiService);
  private ngbOffcanvas = inject(NgbOffcanvas);
  private modal = inject(NgbModal);
  private destroyRef = inject(DestroyRef);

  // State signals
  isWaitingFlag = signal(true);
  isLoading = signal(false);
  selectAllContacts = signal(false);
  selectedContacts = signal<any[]>([]);
  page = signal(1);
  limit = signal(100);
  totalPage = signal(0);
  totalContactsCount = signal(0);
  suppressionList = signal<any[]>([]);
  userData = signal<any>(null);
  supplierId = signal<string>('');

  // Modal reference
  modalReference: any;

  constructor() {
    document.title = "Suppression List - KEXY Brand Portal";
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);

    // Set pagination limit from localstorage if found
    const limit = localStorage.getItem(constants.SUPPRESSION_TABLE_PAGINATION_LIMIT);
    if (limit) {
      this.limit.set(parseInt(limit));
    }

    // Get suppression list
    this.getSuppressionList();
  }

  getSuppressionListApiPostData = () => ({
    supplier_id: this.supplierId(),
    page: this.page(),
    limit: this.limit(),
    get_total_count: true,
  });

  getSuppressionList = async () => {
    const postData = this.getSuppressionListApiPostData();
    await this.dripCampaignService.getSuppressionList(postData);

    this.dripCampaignService.dripCampaignSuppressionList
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        console.log('data From suppression api', data);
        this.suppressionList.set(data["suppressionLists"]);
        this.totalContactsCount.set(data["total"]);
        this.totalPage.set(Math.ceil(data["total"] / this.limit()));
        this.isWaitingFlag.set(false);
      });
  };

  importBtnClick = (content: any) => {
    this.dripCampaignService.suppressionListApiPostData = this.getSuppressionListApiPostData();
    this.modalReference = this.modal.open(content, { size: "md" });
  };

  closeModal = () => {
    this.modalReference.close();
  };

  addNewRepClick = () => {
    this.dripCampaignService.suppressionListApiPostData = this.getSuppressionListApiPostData();
    this.ngbOffcanvas.open(AddSuppressionComponent, {
      panelClass: "email-content edit-rep-canvas",
      backdropClass: "edit-rep-canvas-backdrop",
      position: "end",
      scroll: false,
    });
  };

  handleContactSelect = (selectedRow: any, isSelectAll: boolean) => {
    if (isSelectAll) {
      const hasSelected = this.suppressionList().some(i => i.is_selected);

      const updatedList = this.suppressionList().map(i => ({
        ...i,
        is_selected: !hasSelected
      }));

      this.suppressionList.set(updatedList);

      this.selectedContacts.set(
        !hasSelected
          ? [...this.suppressionList()]
          : []
      );
    } else {
      const rowIndex = this.suppressionList().findIndex(i => i.id === selectedRow.id);
      if (rowIndex === -1) return;

      const updatedList = [...this.suppressionList()];
      updatedList[rowIndex] = {
        ...updatedList[rowIndex],
        is_selected: !updatedList[rowIndex].is_selected
      };

      this.suppressionList.set(updatedList);

      this.selectedContacts.update(selected =>
        updatedList[rowIndex].is_selected
          ? [...selected, updatedList[rowIndex]]
          : selected.filter(j => j.id !== updatedList[rowIndex].id)
      );
    }

    this.selectAllContacts.set(false);
  };

  receivedLimitNumber = async (limit: number) => {
    this.limit.set(limit);
    localStorage.setItem(constants.SUPPRESSION_TABLE_PAGINATION_LIMIT, limit.toString());
    this.page.set(1);

    this.isWaitingFlag.set(true);
    await this.getSuppressionList();
    this.isWaitingFlag.set(false);
    this.selectAllContacts.set(false);
  };

  paginationRightArrowClick = async () => {
    if (this.page() === this.totalPage()) return;

    this.page.update(p => p + 1);
    await this.getSuppressionList();
    this.selectAllContacts.set(false);
  };

  paginationLeftArrowClick = async () => {
    if (this.page() === 1) return;

    this.page.update(p => p - 1);
    await this.getSuppressionList();
    this.selectAllContacts.set(false);
  };

  toggleSelectAllContactSelection = () => {
    this.selectAllContacts.update(v => !v);
  };

  deleteClick = async () => {
    const isConfirm = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#b8b6b6",
      confirmButtonText: "Yes",
    });

    if (isConfirm.dismiss) return;

    const selectedContactIds = this.selectedContacts().map(i => i.id);
    const payLoad: any = {
      companyId: this.userData().supplier_id,
      ids: selectedContactIds,
    };

    if (this.selectAllContacts()) {
      payLoad['ids'] = [];
      payLoad['selectedAll'] = true;
    }

    const swal = this.pageUiService.showSweetAlertLoading();
    swal.showLoading();

    try {
      await this.dripCampaignService.deleteSuppressionUser(payLoad);
      await this.getSuppressionList();
      this.selectedContacts.set([]);
    } catch (e: any) {
      Swal.fire("Error", e.message);
    } finally {
      swal.close();
      this.selectAllContacts.set(false);
    }
  };
}

