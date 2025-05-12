// import { Component, OnDestroy, OnInit } from "@angular/core";
// import { NgbActiveOffcanvas, NgbModal, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import { Subscription } from "rxjs";
// import { ProspectingService } from "../../services/prospecting.service";
// import { AuthService } from "../../services/auth.service";
// import { AddOrDeleteContactLabelComponent } from "../add-or-delete-contact-label/add-or-delete-contact-label.component";
// import Swal from "sweetalert2";
// import {
//   PurchaseAdditioanlCreditModalContentComponent
// } from "../purchase-additioanl-credit-modal-content/purchase-additioanl-credit-modal-content.component";
// import { DripCampaignService } from "../../services/drip-campaign.service";
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
// import {DecimalPipe} from '@angular/common';
// import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
//
// @Component({
//   selector: 'app-save-contacts-content',
//   imports: [
//     ErrorMessageCardComponent,
//     DecimalPipe,
//     KexySelectDropdownComponent
//   ],
//   templateUrl: './save-contacts-content.component.html',
//   styleUrl: './save-contacts-content.component.scss'
// })
// export class SaveContactsContentComponent {
//   labelOptions = [];
//   userData;
//   isLoading = false;
//   monthlyCredits;
//   additionalCredits;
//   subscription;
//   selectedContacts;
//   chargedCredits = 0;
//   contactLabelsSubscription: Subscription;
//
//   constructor(
//     private modal: NgbModal,
//     private prospectingService: ProspectingService,
//     private _authService: AuthService,
//     private ngbOffcanvas: NgbOffcanvas,
//     public activeCanvas: NgbActiveOffcanvas,
//   ) {}
//
//   ngOnInit() {
//     this.userData = this._authService.userTokenValue;
//     this.selectedContacts = this.prospectingService.selectedContacts;
//     console.log('selectedContacts', this.selectedContacts);
//
//     // getting credit info
//     this.userOrganisationApiCall();
//     this.getAndSetLabels();
//     this.setChargedCredits();
//   }
//
//   ngOnDestroy() {
//     if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
//   }
//
//   setChargedCredits = () => {
//     this.selectedContacts.forEach(contact => {
//       console.log(contact.data.receiver_details.saved);
//       if (!contact.data.receiver_details.saved) this.chargedCredits += 1;
//     });
//   }
//
//   getAndSetLabels = () => {
//     // Get Label
//     this.prospectingService.getLists({ supplier_id: this.userData.supplier_id });
//
//     // Set Label Subscription
//     this.contactLabelsSubscription = this.prospectingService.lists.subscribe((lists) => {
//       // Set label dropdown options
//       this.labelOptions = [];
//       lists.map(i => {
//         const labelObj = {
//           key: i.label,
//           value: i.label,
//           itemBgColor: i.bg_color,
//           itemTextColor: i.text_color,
//           id: i.id,
//           isSelected: false
//         }
//         this.labelOptions.push(labelObj)
//       });
//     });
//   }
//
//   handleMultiselectFunctionality = (options, selectedValue) => {
//     const i = options.indexOf(selectedValue);
//     if (i > -1) {
//       options[i].isSelected = !options[i].isSelected;
//     }
//   };
//
//   onLabelSelect = (selectedValue, index = null, rowIndex = null) => {
//     this.handleMultiselectFunctionality(this.labelOptions, selectedValue);
//
//     // After Submit validation purpose
//     if (this.submitted) {
//       this.isLabelSelected = this.labelOptions.some(label => label.isSelected);
//     }
//   };
//
//   handleEditContactLabel = (data, event: Event) => {
//     // Stop the event propagation to prevent the outer button click handler from being called
//     event.stopPropagation();
//
//     // Set selected item in service and open canvas
//     this.prospectingService.selectedLabelForEdit = data;
//     this.openContactLabelCanvas();
//   };
//
//   openContactLabelCanvas = () => {
//     this.ngbOffcanvas.open(AddOrDeleteContactLabelComponent, {
//       panelClass: "attributes-bg edit-rep-canvas",
//       backdropClass: "edit-rep-canvas-backdrop label-offcanvas-backdrop",
//       position: "end",
//       scroll: false,
//     });
//   };
//
//   __isDeleteConfirmed = async () => {
//     let isConfirm = await Swal.fire({
//       title: `Are you sure?`,
//       text: "You won't be able to revert this!",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#3085d6",
//       cancelButtonColor: "#d33",
//       confirmButtonText: "Yes, delete it!",
//     });
//
//     return !isConfirm.dismiss;
//   };
//
//   handleDeleteLabel = async (data, event: Event) => {
//     // Stop the event propagation to prevent the outer button click handler from being called
//     event.stopPropagation();
//
//     const confirmed = await this.__isDeleteConfirmed();
//     if (!confirmed) return;
//
//     const postData = {
//       supplier_id: this.userData.supplier_id,
//       label_id: data.id,
//     };
//
//     try {
//       await this.prospectingService.deleteLabel(postData);
//     } catch (e) {
//       await Swal.fire("Error", e.message);
//     }
//   };
//
//   userOrganisationApiCall = async () => {
//     this.subscription = await this._authService.getSubscriptionData(true);
//     if (!this.subscription) {
//       return;
//     }
//     this.monthlyCredits = this.subscription.subscription_credits[0].current_credits;
//     const additionalCreditInfo = this.subscription.subscription_additional_credits;
//     this.additionalCredits = additionalCreditInfo.total_credits - additionalCreditInfo.used_credits;
//   };
//
//   submitted = false;
//   isUserHaveNotEnoughCredits = false;
//   isLabelSelected = false;
//   saveContacts = async () => {
//     this.submitted = true;
//
//     //label validation
//     const labelIds = [];
//     this.labelOptions.forEach(label => {
//       if (label.isSelected) {
//         labelIds.push(label.id.toString());
//       }
//     });
//     if (!labelIds.length) return;
//     this.isLabelSelected = true;
//
//     // credits validation
//     const totalRemainigCredits = (this.monthlyCredits + this.additionalCredits) - this.selectedContacts.length;
//     if (totalRemainigCredits < 0) {
//       this.isUserHaveNotEnoughCredits = true;
//       return;
//     }
//     this.isUserHaveNotEnoughCredits = false;
//
//     this.isLoading = true;
//     const contactIds = [];
//     this.selectedContacts.forEach(contact => contactIds.push({id: contact.id}));
//     const postData = {
//       supplier_id: this.userData.supplier_id,
//       contacts: contactIds,
//       label_ids: labelIds
//     }
//
//     try {
//       await this.prospectingService.saveContactsFromApollo(postData);
//       this.isLoading = false;
//       await Swal.fire({
//         icon: "success",
//         title: "Thank you!",
//         html: `
//         <div style=" text-align: left; font-size: 20px; margin-top: 15px;">
//           <p>We are processing and verifying your leads with our AI validator.</p>
//           <p><span style="margin-right: 5px">📧</span> You'll get an email as soon as your list is ready.</p>
//           <p><span style="margin-right: 5px">👉</span> Check the 'Manage Contacts' tab to find your leads.</p>
//           <p><span style="margin-right: 5px">⏳</span> Heads up: Depending on the list size, this can take up to 24 hours.</p>
//         </div>
//       `,
//         showCloseButton: true,
//       });
//       this.activeCanvas.dismiss("Cross click");
//     } catch (e) {
//       this.isLoading = false;
//       await Swal.fire("Error", e.message);
//     }
//   }
//
//   buyMoreBtnClick = () => {
//     this.modal.open(PurchaseAdditioanlCreditModalContentComponent, { size: "lg" });
//   }
// }

import { Component, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { NgbActiveOffcanvas, NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { ProspectingService } from '../../services/prospecting.service';
import { AuthService } from '../../services/auth.service';
import { AddOrDeleteContactLabelComponent } from '../add-or-delete-contact-label/add-or-delete-contact-label.component';
import Swal from 'sweetalert2';
import { PurchaseAdditioanlCreditModalContentComponent } from '../purchase-additioanl-credit-modal-content/purchase-additioanl-credit-modal-content.component';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { DecimalPipe } from '@angular/common';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-save-contacts-content',
  standalone: true,
  imports: [
    ErrorMessageCardComponent,
    DecimalPipe,
    KexySelectDropdownComponent
  ],
  templateUrl: './save-contacts-content.component.html',
  styleUrl: './save-contacts-content.component.scss'
})
export class SaveContactsContentComponent implements OnInit {
  // Services
  private modal = inject(NgbModal);
  private prospectingService = inject(ProspectingService);
  private authService = inject(AuthService);
  private ngbOffcanvas = inject(NgbOffcanvas);
  public activeCanvas = inject(NgbActiveOffcanvas);
  private destroyRef = inject(DestroyRef);

  // State signals
  labelOptions = signal<any[]>([]);
  isLoading = signal(false);
  monthlyCredits = signal(0);
  additionalCredits = signal(0);
  chargedCredits = signal(0);
  submitted = signal(false);
  isUserHaveNotEnoughCredits = signal(false);
  isLabelSelected = signal(false);

  // Data
  selectedContacts: any[] = [];
  subscription: any;

  ngOnInit() {
    this.selectedContacts = this.prospectingService.selectedContacts;
    console.log('selectedContacts', this.selectedContacts);

    // Initialize data
    this.userOrganisationApiCall();
    this.getAndSetLabels();
    this.setChargedCredits();
  }

  setChargedCredits() {
    let credits = 0;
    this.selectedContacts.forEach(row => {
      console.log(row.data.receiver_details.saved);
      if (!row.data.receiver_details.saved) credits += 1;
    });
    this.chargedCredits.set(credits);
  }

  getAndSetLabels() {
    // Get Labels
    this.prospectingService.getLists({ supplier_id: this.authService.userTokenValue.supplier_id });

    // Subscribe to lists changes
    this.prospectingService.lists
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((labels) => {
        this.labelOptions.set(labels.map(i => ({
          key: i.label,
          value: i.label,
          itemBgColor: i.bg_color,
          itemTextColor: i.text_color,
          id: i.id,
          isSelected: false
        })));
      });
  }

  handleMultiselectFunctionality(options: any[], selectedValue: any) {
    const index = options.findIndex(opt => opt.value === selectedValue.value);
    if (index > -1) {
      options[index].isSelected = !options[index].isSelected;
    }
  }

  onLabelSelect = (selectedValue: any) => {
    this.labelOptions.update(options => {
      const newOptions = [...options];
      this.handleMultiselectFunctionality(newOptions, selectedValue);
      return newOptions;
    });

    // After Submit validation purpose
    if (this.submitted()) {
      this.isLabelSelected.set(this.labelOptions().some(label => label.isSelected));
    }
  };

  handleEditContactLabel = (data: any, event: Event) => {
    event.stopPropagation();
    this.prospectingService.selectedLabelForEdit = data;
    this.openContactLabelCanvas();
  };

  openContactLabelCanvas = () => {
    this.ngbOffcanvas.open(AddOrDeleteContactLabelComponent, {
      panelClass: "attributes-bg edit-rep-canvas",
      backdropClass: "edit-rep-canvas-backdrop label-offcanvas-backdrop",
      position: "end",
      scroll: false,
    });
  };

  private async __isDeleteConfirmed(): Promise<boolean> {
    const isConfirm = await Swal.fire({
      title: `Are you sure?`,
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    return !isConfirm.dismiss;
  }

  handleDeleteLabel = async (data: any, event: Event) => {
    event.stopPropagation();
    const confirmed = await this.__isDeleteConfirmed();
    if (!confirmed) return;

    const postData = {
      supplier_id: this.authService.userTokenValue.supplier_id,
      label_id: data.id,
    };

    try {
      await this.prospectingService.deleteLabel(postData);
    } catch (e: any) {
      await Swal.fire("Error", e.message);
    }
  };

  async userOrganisationApiCall() {
    this.subscription = await this.authService.getSubscriptionData(true);
    if (!this.subscription) return;

    this.monthlyCredits.set(this.subscription.subscription_credits[0].current_credits);
    const additionalCreditInfo = this.subscription.subscription_additional_credits;
    this.additionalCredits.set(additionalCreditInfo.total_credits - additionalCreditInfo.used_credits);
  }

  async saveContacts() {
    this.submitted.set(true);

    // Label validation
    const labelIds = this.labelOptions()
      .filter(label => label.isSelected)
      .map(label => label.id.toString());

    if (!labelIds.length) {
      this.isLabelSelected.set(false);
      return;
    }
    this.isLabelSelected.set(true);

    // Credits validation
    const totalRemainingCredits = (this.monthlyCredits() + this.additionalCredits()) - this.selectedContacts.length;
    if (totalRemainingCredits < 0) {
      this.isUserHaveNotEnoughCredits.set(true);
      return;
    }
    this.isUserHaveNotEnoughCredits.set(false);

    this.isLoading.set(true);
    const contactIds = this.selectedContacts.map(contact => ({ id: contact.id }));
    const postData = {
      supplier_id: this.authService.userTokenValue.supplier_id,
      contacts: contactIds,
      label_ids: labelIds
    };

    try {
      await this.prospectingService.saveContactsFromApollo(postData);
      this.isLoading.set(false);
      await Swal.fire({
        icon: "success",
        title: "Thank you!",
        html: `
        <div style=" text-align: left; font-size: 20px; margin-top: 15px;">
          <p>We are processing and verifying your leads with our AI validator.</p>
          <p><span style="margin-right: 5px">📧</span> You'll get an email as soon as your list is ready.</p>
          <p><span style="margin-right: 5px">👉</span> Check the 'Manage Contacts' tab to find your leads.</p>
          <p><span style="margin-right: 5px">⏳</span> Heads up: Depending on the list size, this can take up to 24 hours.</p>
        </div>
      `,
        showCloseButton: true,
      });
      this.activeCanvas.dismiss("Cross click");
    } catch (e: any) {
      this.isLoading.set(false);
      await Swal.fire("Error", e.message);
    }
  }

  buyMoreBtnClick = () => {
    this.modal.open(PurchaseAdditioanlCreditModalContentComponent, { size: "lg" });
  }
}
