import { Component, Input, OnInit } from "@angular/core";
import { NgbModal, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingService } from "src/app/services/prospecting.service";
import Swal from "sweetalert2";
import { constants } from "src/app/helpers/constants";
import { AuthService } from "src/app/services/auth.service";
import { Subscription } from "rxjs";
import {CampaignLayoutBottmBtnsComponent} from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import {SaveContactsContentComponent} from '../save-contacts-content/save-contacts-content.component';
import {KexyScrollableTableComponent} from '../kexy-scrollable-table/kexy-scrollable-table.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'prospecting-select-contact',
  imports: [
    CampaignLayoutBottmBtnsComponent,
    KexyScrollableTableComponent,
    CommonModule,
  ],
  templateUrl: './prospecting-select-contact.component.html',
  styleUrl: './prospecting-select-contact.component.scss'
})
export class ProspectingSelectContactComponent {
  contactList = [];
  initialLoading = true;
  isLoading = false;
  page = 1;
  limit = 100;
  contactCount;
  totalPageNumber;
  selectedContacts = [];
  userData;
  LoadingContactsSubscription: Subscription;
  @Input() nextBtnClick;
  @Input() backBtnClick;

  constructor(
    private ngbOffcanvas: NgbOffcanvas,
    private prospectingService: ProspectingService,
    private _authService: AuthService,
  ) {
  }

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;
    await this.getSalesLeadContacts();

    this.LoadingContactsSubscription = this.prospectingService.loadingAllContacts.subscribe(status => {
      this.initialLoading = status;
    });
  }

  getSalesLeadContacts = async () => {
    this.isLoading = true;

    this.contactList = await this.prospectingService.getSalesLeadContacts(this.page, true);
    this.contactList = this.contactList.filter(i => i.receiver_details.email_status === constants.VERIFIED);
    this.setContactDataForTable();
    this.contactCount = this.prospectingService.totalSearchedContactCount;
    this.totalPageNumber = Math.ceil(this.contactCount / this.limit);

    this.isLoading = false;
  };

  setContactDataForTable = () => {
    let contactData = [];
    const isAnyContactSelected = this.selectedContacts.length;
    let isThisContactWasSelected;
    this.contactList.map((i) => {
      // Recheck previously selected contact.
      // Need to do this because this is called everytime table pagination works.
      // So after return an old page we should check selected contacts.
      if (isAnyContactSelected) {
        const index = this.selectedContacts.findIndex(c => c.id === i.receiver_details.id);
        isThisContactWasSelected = index > -1;
      }

      const contactObj = {
        select_all: "",
        id: `${i.receiver_details.id}`,
        name: `${i.receiver_details.first_name} ${i.receiver_details.last_name}`,
        linkedin_url: `${i.receiver_details.linkedin_url}`,
        job_title: `${i.receiver_details.jobTitle}`,
        company_name: `${i.receiver_details.companyName}`,
        city: `${i.receiver_details.city}`,
        state: `${i.receiver_details.state}`,
        email_status: `${i.receiver_details.email_status}`,
        is_selected: isThisContactWasSelected,
        data: i,
      };
      contactData.push(contactObj);
    });
    this.contactList = contactData;
  };

  checkboxClicked = (selectedRow, isSelectAll) => {
    if (isSelectAll) {
      if (this.contactList.some((i) => i.is_selected)) {
        this.contactList.map((i) => {
          i.is_selected = false;
          const index = this.selectedContacts.findIndex((j) => j.id === i.id);
          if (index > -1) {
            this.selectedContacts.splice(index, 1);
          }
        });
      } else {
        this.contactList.map((i) => {
          i.is_selected = true;
          const index = this.selectedContacts.findIndex((j) => j.id === i.id);
          if (index === -1) {
            this.selectedContacts.push(i);
          }
        });
      }
    } else {
      const rowIndex = this.contactList.findIndex((i) => i.id === selectedRow.id);
      this.contactList[rowIndex].is_selected = !this.contactList[rowIndex].is_selected;

      if (this.contactList[rowIndex].is_selected) {
        const index = this.selectedContacts.findIndex((j) => j.id === this.contactList[rowIndex].id);
        if (index === -1) {
          this.selectedContacts.push(this.contactList[rowIndex]);
        }
      } else {
        const index = this.selectedContacts.findIndex((j) => j.id === this.contactList[rowIndex].id);
        if (index > -1) {
          this.selectedContacts.splice(index, 1);
        }
      }
    }

    this.prospectingService.selectedContacts = this.selectedContacts;
  };

  leftArrowClick = () => {
    if (this.page === 1) return;
    this.page -= 1;
    this.getSalesLeadContacts();
  };

  rightArrowClick = () => {
    this.page += 1;
    this.getSalesLeadContacts();
  };

  navigateSpecificPage = async (page) => {
    if (page < 1) this.page = 1;
    if (page > this.totalPageNumber) this.page = this.totalPageNumber;
    this.page = page;
    this.getSalesLeadContacts();
  };

  __isConfirmed = async (credits) => {
    let isConfirm = await Swal.fire({
      title: "Ready to launch?",
      text: "We will charge " + credits + " credit(s) from your account to run launch the campaign.",
      icon: "success",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Launch!",
    });

    return !isConfirm.dismiss;
  };

  __creditsWarningPopup = async () => {
    let isConfirm = await Swal.fire({
      title: "Not enough credits!",
      text: "Please buy additional credits to successfully launch the campaign.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Buy Now",
    });

    return !isConfirm.dismiss;
  };

  saveContactsBtnClick = () => {
    this.ngbOffcanvas.open(SaveContactsContentComponent, {
      panelClass: "attributes-bg edit-rep-canvas",
      backdropClass: "edit-rep-canvas-backdrop",
      position: "end",
      scroll: false,
    });
  };
}
