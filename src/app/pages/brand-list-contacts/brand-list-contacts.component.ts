import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { constants } from 'src/app/helpers/constants';
import { AuthService } from 'src/app/services/auth.service';
import { routeConstants } from 'src/app/helpers/routeConstants';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { PageUiService } from 'src/app/services/page-ui.service';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import {
  ProspectingCommonCardComponent,
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import { ContactListCardComponent } from '../../components/contact-list-card/contact-list-card.component';
import {
  UploadFileModalContentComponent,
} from '../../components/upload-file-modal-content/upload-file-modal-content.component';
import { ProspectingContactsComponent } from '../../components/prospecting-contacts/prospecting-contacts.component';
import { CommonModule } from '@angular/common';
import { Contact } from '../../models/Contact';

@Component({
  selector: 'app-brand-list-contacts',
  imports: [
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
    ContactListCardComponent,
    UploadFileModalContentComponent,
    CommonModule,
  ],
  templateUrl: './brand-list-contacts.component.html',
  styleUrl: './brand-list-contacts.component.scss',
})
export class BrandListContactsComponent implements OnInit, OnDestroy {
  contactLabelsSubscription: Subscription;
  listId;
  listObj;
  limit = 100;
  page = 1;
  isWaitingFlag: boolean = true;
  isLoading: boolean = false;
  userData;
  contactList = [];
  contactListSubscription: Subscription;
  totalContactsCount = 0;
  totalPage;
  selectedContacts: Contact[] = [];
  sortBy = '';
  sortType = '';
  selectAllContacts = false;

  constructor(
    private prospectingService: ProspectingService,
    private route: ActivatedRoute,
    public _router: Router,
    private ngbOffcanvas: NgbOffcanvas,
    private modal: NgbModal,
    private _authService: AuthService,
    private pageUiService: PageUiService,
  ) {
  }

  async ngOnInit() {
    document.title = 'List Contacts - KEXY Brand Portal';
    this.userData = this._authService.userTokenValue;

    // Set pagination limit from localstorage if found
    const limit = localStorage.getItem(constants.CONTACTS_TABLE_PAGINATION_LIMIT);
    if (limit) {
      this.limit = parseInt(limit);
    }

    this.route.queryParams.subscribe((params) => {
      if (params['listId']) {
        this.listId = params['listId'];
      }
      if (params['page']) {
        // Because pagination in API starts from 0 but we show from 1 in frontend, hence we subtract 1
        this.page = parseInt(params['page']);
      }
    });

    await this.getLists();
    await this.getContacts(true);
    this.setContactSubscription();
    this.isWaitingFlag = false;
  }

  ngOnDestroy() {
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
    if (this.contactListSubscription) this.contactListSubscription.unsubscribe();
    this.prospectingService.selectedAllContacts = false;
  }

  getLists = async () => {
    const cachedLabels = this.prospectingService.cachedLabels;
    if (!Object.keys(cachedLabels).length) {
      await this.prospectingService.getLists({});
    }

    this.contactLabelsSubscription = this.prospectingService.lists.subscribe(async (labels) => {
      if (this.listId) {
        const index = labels.findIndex(l => l.id.toString() === this.listId.toString());
        if (index > -1) {
          this.listObj = labels[index];
          this.listObj['user'] = this.userData;
        }
      }
    });
  }

  getContactApiPostData = () => {
    return {
      companyId: this.userData.supplier_id,
      dripCampaignId: '',
      listIds: [parseInt(this.listId)],
      contactName: '',
      companyName: '',
      jobTitle: '',
      emailStatus: '',
      marketingStatus: '',
      city: '',
      state: '',
      country: '',
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
      sortType: this.sortType,
    };
  };

  getContacts = async (overwrite = false) => {
    const postData = this.getContactApiPostData();
    await this.prospectingService.getContacts(postData, overwrite);
  };

  setContactSubscription = () => {
    this.contactListSubscription = this.prospectingService.contactRes.subscribe((data) => {
      this.contactList = this.prospectingService.setLabelsInContactsList(data.contacts);
      this.totalContactsCount = data.total;
      this.totalPage = Math.ceil(this.totalContactsCount / this.limit);

      // Resetting edit and contact button showing condition
      this.selectedContacts = [];
    });
  };

  receivedLimitNumber = async (limit) => {
    this.limit = parseInt(limit);
    localStorage.setItem(constants.CONTACTS_TABLE_PAGINATION_LIMIT, limit);
    this.page = 1;

    this.isWaitingFlag = true;
    this._router.navigate(
      [],
      {
        relativeTo: this.route,
        queryParams: { listId: this.listId, page: 1 },
      },
    ).then(async res => {
      console.log(res);
    });
    await this.getContacts(true);
    this.isWaitingFlag = false;
  };

  paginationRightArrowClick = async () => {
    if (this.page === this.totalPage) return; // Here added 1 with page because page starts with 0
    this.page = this.page + 1;
    await this.getPaginatedContacts();

    // Reset select all contact
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };

  paginationLeftArrowClick = async () => {
    if (this.page === 1) return; // Here added 1 with page because page starts with 0
    this.page = this.page - 1;
    await this.getPaginatedContacts();

    // Reset select all contact
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };

  getPaginatedContacts = async () => {
    this.isLoading = true;
    this._router.navigate(
      [],
      {
        relativeTo: this.route,
        queryParams: { listId: this.listId, page: this.page },
        queryParamsHandling: 'merge',
      },
    ).then(async res => {
      await this.getContacts(false);

      // if (res) {
      //   await this.getContacts(true);
      // }
      this.isLoading = false;
    });
  };

  handleSortByCreatedAt = async (column) => {
    if (column === constants.TITLE) {
      this.sortBy = constants.JOB_TITLE;

    } else if (column === constants.COMPANY_NAME) {
      this.sortBy = constants.COMPANY_NAME;

    } else {
      this.sortBy = constants.CREATED_AT;
    }

    this.page = 1;
    if (!this.sortType || this.sortType === constants.DESENDING.toLowerCase()) {
      this.sortType = constants.ASENDING.toLowerCase();
    } else {
      this.sortType = constants.DESENDING.toLowerCase();
    }

    await this.getPaginatedContacts();

    // Clear contact cache
    this.prospectingService.cachedContactPages = {};
  };

  navigateSpecificPage = async (page) => {
    if (page < 1) this.page = 1;
    if (page > this.totalPage) this.page = this.totalPage;
    this.page = page;
    await this.getPaginatedContacts();

    // Reset select all contact
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };

  handleContactSelect = (selectedRow, isSelectAll) => {
    if (isSelectAll) {
      if (this.contactList.some((i) => i.isSelected)) {
        this.contactList.map((i) => {
          i.isSelected = false;
          const index = this.selectedContacts.findIndex((j) => j.id === i.id);
          if (index > -1) {
            this.selectedContacts.splice(index, 1);
          }
        });
      } else {
        this.contactList.map((i) => {
          i.isSelected = true;
          const index = this.selectedContacts.findIndex((j) => j.id === i.id);
          if (index === -1) {
            this.selectedContacts.push(i);
          }
        });
      }
    } else {
      const rowIndex = this.contactList.findIndex((i) => i.id === selectedRow.id);
      this.contactList[rowIndex].isSelected = !this.contactList[rowIndex].isSelected;

      if (this.contactList[rowIndex].isSelected) {
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

    // Reset select all contact
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;

    // Save selected contact in service inorder to use it in contact add or edit sidebar.
    this.prospectingService.selectedContactsInContactsPage = this.selectedContacts;
  };

  backBtnClick = async () => {
    await this._router.navigate([routeConstants.BRAND.MANAGE_LIST]);
  };

  editContactClick = (data = null) => {
    if (data) {
      this.prospectingService.clickedContactInContactPage = [data];
    }
    this.prospectingService.listIdWhenEditContactFromListContactPage = this.listId;
    this.openContactSlider();
  };

  createContactClick = () => {
    this.prospectingService.selectedLabelIdInListContactPage = this.listId;
    this.prospectingService.isAddNewButtonClickedInContactPage = true;
    this.openContactSlider();
  };

  openContactSlider = () => {
    this.ngbOffcanvas.open(ProspectingContactsComponent, {
      panelClass: 'contact-slide-content edit-rep-canvas',
      backdropClass: 'edit-rep-canvas-backdrop',
      position: 'end',
      scroll: false,
    });
  };

  __isConfirmed = async (text = 'This action can not be undone.') => {
    let isConfirm = await Swal.fire({
      title: `Are you sure?`,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Delete!',
    });

    return !isConfirm.dismiss;
  };


  deleteContactsFromList = async () => {
    const confirmed = await this.__isConfirmed();
    if (!confirmed) return;
    console.log(this.selectedContacts);
    const contactIds = [];
    this.selectedContacts.forEach(c => {
      let labelIds = c.listIds;
      const index = labelIds.indexOf(this.listId);
      if (index > -1) {
        labelIds.splice(index, 1);
      }
      c.listIds = labelIds;
      contactIds.push({id: c.id});
    });
    const postData = {
      companyId: this.userData.supplier_id,
      contacts: contactIds,
      listId: this.listId,
    };
    if (this.selectAllContacts) {
      postData['selected_all_contacts'] = 'true';
      postData['selected_all_contacts_payload'] = this.getContactApiPostData();
      postData['contacts'] = [];
    }

    const swlLoading = this.pageUiService.showSweetAlertLoading();
    try {
      swlLoading.showLoading();
      await this.prospectingService.removeContactsFromList(postData);
      await this.prospectingService.getLists({ supplier_id: this.userData.supplier_id });
      await this.getContacts(true);
      swlLoading.close();
    } catch (e) {
      swlLoading.close();
      await Swal.fire('Error', e.message);
    }

  };

  modalReference;
  @ViewChild('uploadContacts', { static: true }) uploadContacts: ElementRef;
  importBtnClick = () => {
    this.modalReference = this.modal.open(this.uploadContacts, { size: 'md' });
  };

  closeModal = () => {
    this.modalReference.close();
  };

  zerobounceBypass = false;
  handleBypassZerobounce = (bypass) => {
    this.zerobounceBypass = bypass;
  };

  getImportedFileData = async (data) => {
    this.isLoading = true;
    // const contacts = [];
    //
    // data.map(contact => {
    //   contacts.push({
    //     id: '',
    //     first_name: contact['First Name'],
    //     last_name: contact['Last Name'],
    //     name: `${contact['First Name']} ${contact['Last Name']}`,
    //     linkedin_url: contact['Linkedin'],
    //     title: contact['Job Title'],
    //     email_status: null,
    //     photo_url: null,
    //     twitter_url: null,
    //     github_url: null,
    //     facebook_url: null,
    //     headline: contact['Job Title'],
    //     email: contact['Email'],
    //     organization_id: '',
    //     employment_history: [{}],
    //     state: contact['State'],
    //     city: contact['City'],
    //     country: contact['Country'],
    //     organization: {
    //       name: contact['Company Name'],
    //       website_url: null,
    //       blog_url: null,
    //       angellist_url: null,
    //       linkedin_url: contact['Linkedin'],
    //       twitter_url: null,
    //       facebook_url: null,
    //       logo_url: null,
    //       phone: contact['Phone Number'],
    //       industry: null,
    //       founded_year: null,
    //       estimated_num_employees: null,
    //       street_address: '',
    //       city: contact['City'],
    //       state: contact['State'],
    //       postal_code: '',
    //       country: contact['Country'],
    //     },
    //     is_likely_to_engage: true,
    //   });
    // });
    //
    // const payload = {
    //   supplier_id: this.userData.supplier_id,
    //   contacts: contacts,
    //   label_ids: [this.listId],
    // };
    // console.log('payload', payload);
    //
    // if (this.zerobounceBypass) {
    //   payload['bypass_zerobounce'] = 'true';
    // }


    const contacts = [];

    data.map((contact: any) => {
      const c: Contact = Contact.empty();
      c.email = contact['Email'].trim();
      c.state = contact['State'].trim();
      c.city = contact['City'].trim();
      c.country = contact['Country'].trim();
      c.details.firstName = contact['First Name'].trim();
      c.details.lastName = contact['Last Name'].trim();
      c.details.name = `${contact['First Name']} ${contact['Last Name']}`;
      c.details.linkedinUrl = contact['Linkedin'].trim();
      c.details.title = contact['Job Title'].trim();
      c.details.headline = contact['Job Title'].trim();
      c.details.organization.name = contact['Company Name'].trim();
      c.details.organization.phone = contact['Phone Number'].trim();
      c.details.organization.city = contact['City'].trim();
      c.details.organization.state = contact['State'].trim();
      c.details.organization.country = contact['Country'].trim();
      contacts.push(Contact.contactPostDto(c));
    });

    const payload = {
      companyId: this.userData.supplier_id,
      contacts: contacts,
      listIds: [this.listId],
    };

    if (this.zerobounceBypass) {
      payload['bypassZerobounce'] = true;
    }

    try {
      await this.prospectingService.addContacts(payload);
      await this.prospectingService.getLists({ supplier_id: this.userData.supplier_id });
      await this.getContacts(true);
      this.isLoading = false;
      this.closeModal();
    } catch (e) {
      this.isLoading = false;
      await Swal.fire('Error', e.error);
    }
  };

  toggleSelectAllContactSelection = () => {
    this.selectAllContacts = !this.selectAllContacts;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };
}
