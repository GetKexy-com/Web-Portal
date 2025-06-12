import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { ProspectingContactsComponent } from 'src/app/components/prospecting-contacts/prospecting-contacts.component';
import { ProspectingService } from 'src/app/services/prospecting.service';
import Swal from 'sweetalert2';
import { ExportToCsv } from 'src/app/helpers/CSVHelper';
import { constants } from 'src/app/helpers/constants';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { ContactListCardComponent } from '../../components/contact-list-card/contact-list-card.component';
import { UploadFileModalContentComponent } from '../../components/upload-file-modal-content/upload-file-modal-content.component';
import { SearchContactModalContentComponent } from '../../components/search-contact-modal-content/search-contact-modal-content.component';
import { AddContactsToDripCampaignComponent } from '../../components/add-contacts-to-drip-campaign/add-contacts-to-drip-campaign.component';
import { CommonModule } from '@angular/common';
import { Contact } from '../../models/Contact';

@Component({
  selector: 'brand-contacts',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    ContactListCardComponent,
    UploadFileModalContentComponent,
    SearchContactModalContentComponent,
    CommonModule,
  ],
  templateUrl: './brand-contacts.component.html',
  styleUrl: './brand-contacts.component.scss',
})
export class BrandContactsComponent implements OnInit, OnDestroy {
  modalReference;
  searchModalReference;
  userData;
  supplierId;
  contactList: Contact[] = [];
  totalContactsCount = 0;
  isWaitingFlag: boolean = true;
  isLoading: boolean = false;
  selectedContacts: Contact[] = [];
  page = 1;
  limit = 100;
  totalPage;
  allContacts;
  contactListSubscription: Subscription;
  contactLabelsSubscription: Subscription;
  searchLabelIds = [];
  searchLabels = [];
  labelOptions = [];
  searchContactName = '';
  searchContactEmail = '';
  searchContactCompanyName = '';
  searchContactCountry = '';
  searchContactCity = '';
  searchContactState = '';
  searchContactMarketingStatus = '';
  searchContactEmailStatus = '';
  addToDripCampaignId;
  addToDrip;
  contactId;
  sortType = '';
  sortBy = '';
  activeFilterCount = 0;
  selectAllContacts = false;
  contactIds;

  constructor(
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private ngbOffcanvas: NgbOffcanvas,
    private modal: NgbModal,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    // override the route reuse strategy
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
  }

  async ngOnInit() {
    document.title = 'Contacts - KEXY Brand Portal';
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    this.getQueryParams();

    // Set pagination limit from localstorage if found
    const limit = localStorage.getItem(constants.CONTACTS_TABLE_PAGINATION_LIMIT);
    if (limit) {
      this.limit = parseInt(limit);
    }

    await this.getLabels();
    if (this.addToDrip && this.contactId) {
      await this.getAContact();
    } else {
      await this.getContacts(true);
    }
    this.setContactSubscription();

    // set pagination data in service
    this.prospectingService.brandContactCurrentPage = this.page;
    this.prospectingService.brandContactContactLimit = this.limit;
    this.isWaitingFlag = false;
  }

  ngOnDestroy() {
    if (this.contactListSubscription) this.contactListSubscription.unsubscribe();
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
    this.prospectingService.selectedAllContacts = false;
  }

  getQueryParams = () => {
    this.route.queryParams.subscribe(async (params) => {
      if (params['addToDripCampaignId']) {
        this.addToDripCampaignId = params['addToDripCampaignId'];
      }
      if (params['addToDrip'] && params['contactId']) {
        this.addToDrip = true;
        this.contactId = params['contactId'];
      }
      if (params['ids']) {
        this.contactIds = params['ids'];
        console.log('contactIds', this.contactIds);
      }
    });
  };

  getContactsApiPostData = () => {
    return {
      companyId: this.supplierId,
      dripCampaignId: '',
      listIds: this.searchLabelIds[0] || '',
      contactName: this.searchContactName,
      companyName: this.searchContactCompanyName,
      jobTitle: '',
      emailStatus: this.searchContactEmailStatus,
      marketingStatus: this.searchContactMarketingStatus,
      city: this.searchContactCity,
      state: this.searchContactState,
      country: this.searchContactCountry,
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
      sortType: this.sortType,
    };
  };

  getContacts = async (overwrite = false) => {
    const postData = this.getContactsApiPostData();
    if (this.contactIds) {
      postData['ids'] = this.contactIds;
    }
    await this.prospectingService.getContacts(postData, overwrite);
  };

  getAContact = async () => {
    const postData = {
      supplier_id: this.supplierId,
      contact_id: this.contactId,
    };
    const contact = await this.prospectingService.getContact(postData);
    this.contactList = this.prospectingService.setLabelsInContactsList([contact]);
    this.totalPage = '1';
  };

  setContactSubscription = () => {
    this.contactListSubscription = this.prospectingService.contactRes.subscribe((data) => {
      if (data) {
        this.contactList = this.prospectingService.setLabelsInContactsList(data.contacts);
        this.totalContactsCount = data.total;
        this.totalPage = Math.ceil(this.totalContactsCount / this.limit);

        this.selectedContacts = [];
        this.isLoading = false;
        // this.cdr.detectChanges();  // 🔹 Force UI update
      }
    });
  };

  getLabels = async () => {
    // Get Label
    await this.prospectingService.getLists({ companyId: this.supplierId, page: 1, limit: 9999999 });

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.lists.subscribe((labels) => {
      // Set label dropdown options
      this.labelOptions = [];
      labels.map((i) => {
        const labelObj = {
          key: i.label,
          value: i.label,
          itemBgColor: i.bgColor,
          itemTextColor: i.textColor,
          id: i.id,
          isSelected: false,
        };
        this.labelOptions.push(labelObj);
      });
    });
  };

  exportBtnLoading = false;
  getAllContacts = async () => {
    this.exportBtnLoading = true;

    const postData = {
      companyId: this.supplierId,
      listIds: '',
      contactName: '',
      companyName: '',
      marketingStatus: '',
      emailStatus: '',
      jobTitle: '',
      city: '',
      state: '',
      country: '',
      page: 1,
      limit: 9999999,
      sortBy: '',
      sortType: '',
    };
    try {
      this.allContacts = await this.prospectingService.getAllContacts(postData, true);
      this.exportBtnLoading = false;
    } catch (e) {
      this.exportBtnLoading = false;
      Swal.fire('Error', e.message);
    }
  };

  paginationRightArrowClick = async () => {
    if (this.page === this.totalPage) return;

    this.page += 1;
    await this.getPaginatedContacts();

    // Reset select all contacts
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };

  paginationLeftArrowClick = async () => {
    if (this.page === 1) return; // Here added 1 with page because page starts with 0

    this.page -= 1;
    await this.getPaginatedContacts();

    // Reset select all contacts
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };

  getPaginatedContacts = async (overWrite = false) => {
    // this.isLoading = true;
    // await this.getContacts(overWrite);
    // this.isLoading = false;

    this.isLoading = true;
    this.cdr.detectChanges(); // 🔹 Ensure UI updates before fetching
    await this.getContacts(overWrite);
    // isLoading is setting false in setContactSubscription

    // set pagination data in service
    this.prospectingService.brandContactCurrentPage = this.page;
  };

  navigateSpecificPage = async (page) => {
    if (page < 1) this.page = 1;
    if (page > this.totalPage) this.page = this.totalPage;
    this.page = page;
    await this.getPaginatedContacts();

    // Reset select all contacts
    this.selectAllContacts = true;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
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
    await this.getPaginatedContacts(true);

    // Clear contact cache
    this.prospectingService.cachedContactPages = {};
  };

  importBtnClick = (content) => {
    this.modalReference = this.modal.open(content, { size: 'md' });
  };

  @ViewChild('searchContacts', { static: true }) searchContactsModal: ElementRef;
  handleSearchBtnClick = () => {
    this.searchModalReference = this.modal.open(this.searchContactsModal, { size: 'lg' });
  };

  closeModal = () => {
    this.modalReference.close();
  };
  closeSearchModal = () => {
    this.searchModalReference.close();
  };

  addContactClick = () => {
    // Set reference for add new button because we need to show blank form in slider...We can select contact and then we can try to create new contact that's why
    this.prospectingService.isAddNewButtonClickedInContactPage = true;

    // Open slider
    this.openContactSlider();
  };

  editContactClick = (data = null) => {
    console.log({ data });
    if (data) {
      this.prospectingService.clickedContactInContactPage = [data];
    }
    this.openContactSlider();
  };

  openContactSlider = () => {
    this.openSlider(ProspectingContactsComponent);
  };

  openSlider = (component, sliderClass = 'contact-slide-content') => {
    this.ngbOffcanvas.open(component, {
      panelClass: `${sliderClass} edit-rep-canvas`,
      backdropClass: 'edit-rep-canvas-backdrop',
      position: 'end',
      scroll: false,
    });
  };

  resetSearchData = async () => {
    this.searchContactName = '';
    this.searchContactCompanyName = '';
    this.searchContactEmail = '';
    this.searchContactCountry = '';
    this.searchContactState = '';
    this.searchContactCity = '';
    this.searchContactMarketingStatus = '';
    this.searchContactEmailStatus = '';
    this.searchLabels = [];
    this.searchLabelIds = [];
    this.activeFilterCount = 0;
    this.prospectingService.searchContactFilterData = null;
    this.prospectingService.searchContactActiveFilterCount = 0;

    this.isWaitingFlag = true;
    await this.getContacts(true);
    this.isWaitingFlag = false;
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
        const index = this.selectedContacts.findIndex(
          (j) => j.id === this.contactList[rowIndex].id,
        );
        if (index === -1) {
          this.selectedContacts.push(this.contactList[rowIndex]);
        }
      } else {
        const index = this.selectedContacts.findIndex(
          (j) => j.id === this.contactList[rowIndex].id,
        );
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

  setActiveFilterCount = (searchData) => {
    this.activeFilterCount = 0;
    if (searchData.labels && searchData.labels.length > 0) this.activeFilterCount++;
    if (searchData.name) this.activeFilterCount++;
    if (searchData.email) this.activeFilterCount++;
    if (searchData.companyName) this.activeFilterCount++;
    if (searchData.country) this.activeFilterCount++;
    if (searchData.city) this.activeFilterCount++;
    if (searchData.state) this.activeFilterCount++;
    if (searchData.emailStatus) this.activeFilterCount++;
    if (searchData.marketingStatus) this.activeFilterCount++;
  };

  searchContactClickHandle = async (searchData) => {
    this.searchLabelIds = [];
    // this.searchContactName = "";
    if (searchData.labels) {
      this.searchLabels = searchData.labels;
      searchData.labels.forEach((l) => {
        this.searchLabelIds.push(l.id);
      });
    } else {
      searchData.labels = [];
    }
    this.searchContactName = searchData.name || '';
    this.searchContactCompanyName = searchData.companyName || '';
    this.searchContactEmail = searchData.email || '';
    this.searchContactCity = searchData.city || '';
    this.searchContactState = searchData.state || '';
    this.searchContactCountry = searchData.country || '';
    this.searchContactMarketingStatus = searchData.marketingStatus || '';
    this.searchContactEmailStatus = searchData.emailStatus || '';

    this.setActiveFilterCount(searchData);
    this.prospectingService.searchContactFilterData = searchData;
    this.prospectingService.searchContactActiveFilterCount = this.activeFilterCount;

    // reset page variable
    this.page = 1;

    // reset selectAllContacts
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;

    await this.getContacts(true);
    this.closeSearchModal();
  };

  selectedLabel;
  getSelectedLabels = (data) => {
    this.selectedLabel = data;
  };

  getImportedFileData = async (data) => {
    this.isLoading = true;
    const contacts = [];

    data.map((contact: any) => {
      const c: Contact = Contact.empty();
      c.email = contact['Email'];
      c.state = contact['State'];
      c.city = contact['City'];
      c.country = contact['Country'];
      c.details.firstName = contact['First Name'];
      c.details.lastName = contact['Last Name'];
      c.details.name = `${contact['First Name']} ${contact['Last Name']}`;
      c.details.linkedinUrl = contact['Linkedin'];
      c.details.title = contact['Job Title'];
      c.details.headline = contact['Job Title'];
      c.details.organization.name = contact['Company Name'];
      c.details.organization.phone = contact['Phone Number'];
      c.details.organization.city = contact['City'];
      c.details.organization.state = contact['State'];
      c.details.organization.country = contact['Country'];
      contacts.push(Contact.contactPostDto(c));
    });

    const labelId = this.selectedLabel?.id?.toString();
    const payload = {
      companyId: this.supplierId,
      contacts: contacts,
      listIds: labelId ? [labelId] : [],
    };

    if (this.zerobounceBypass) {
      payload['bypassZerobounce'] = true;
    }

    try {
      await this.prospectingService.addContacts(payload);

      if (labelId) {
        // TODO - Later
        // const notifyApiPostData = {
        //   companyId: this.userData.supplier_id,
        //   listId: labelId,
        // };
        // const notifyApiRes = await this.prospectingService.notifyAddContactsInDrip(notifyApiPostData);
        // if (notifyApiRes && notifyApiRes['drip_campaign_id']) {
        //   const dripCampaign = await this.dripCampaignService.getDripCampaignTitle({ drip_campaign_id: notifyApiRes['drip_campaign_id'] });
        //   let isConfirm = await Swal.fire({
        //     title: 'Are you sure?',
        //     text: `Selected "${this.selectedLabel['value']}" is connected to a drip campaign "${dripCampaign['title']}". Do you want to add these contacts to this drip campaign?`,
        //     icon: 'warning',
        //     showCancelButton: true,
        //     confirmButtonColor: '#3085d6',
        //     cancelButtonColor: '#d33',
        //     allowOutsideClick: false,
        //     allowEscapeKey: false,
        //     confirmButtonText: 'Yes, do it!',
        //     showLoaderOnConfirm: true,
        //   });
        //
        //   if (!isConfirm.dismiss) {
        //     const assignApiPostData = {
        //       companyId: this.userData.supplier_id,
        //       contacts,
        //       listIds: [labelId],
        //       notify: false,
        //       dripCampaignId: notifyApiRes['drip_campaign_id'],
        //     };
        //     await this.dripCampaignService.assignContactsAndLabelsInCampaign(assignApiPostData);
        //   }
        // }
      }

      await this.getContacts(true);
      this.isLoading = false;
      this.closeModal();
    } catch (e) {
      this.isLoading = false;
      await Swal.fire('Error', e.message);
    }
  };

  exportCSV = async () => {
    await this.getAllContacts();

    const headers = `First Name,Last Name,Linkedin,Email,Email Status,Job Title,Company Name,Phone Number,City,State,Country,Marketing Status,List`;
    let rows = '';
    this.allContacts.forEach((contact) => {
      // console.log('contact', contact);
      let labels = [];
      contact.kexy_contact_labels.forEach((label) => {
        labels.push(label.kexy_label.label);
      });

      let contactDetails = JSON.parse(contact.details);
      rows += `${contactDetails.first_name?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.last_name?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.linkedin_url?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.email?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.email_status?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.title?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.organization.name?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.organization.phone?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.city?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.state?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.country?.replace(/,/g, ' ')}, `;
      rows += `${contact.marketing_status?.replace(/,/g, ' ')}, `;
      rows += `${labels.length ? labels.join('/') : ''}\n`;
    });
    // console.log(rows);
    await ExportToCsv.download('Contacts.csv', headers + '\n' + rows);
    this.isWaitingFlag = false;
  };

  deleteContacts = async () => {
    let isConfirm = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: 'Yes, delete it!',
      showLoaderOnConfirm: true,
    });

    if (isConfirm.dismiss) {
      return;
    }

    Swal.fire({
      title: '',
      text: 'Please wait...',
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    Swal.showLoading();

    const contactIds = [];
    this.selectedContacts.map((contact: Contact) =>
      contactIds.push({
        id: contact.id,
        email: contact.email,
        firstName: contact.details.firstName,
        lastName: contact.details.lastName,
        name: contact.contactName,
        title: contact.jobTitle,
      }),
    );
    const postData = {
      companyId: this.supplierId,
      contacts: contactIds,
    };
    if (this.selectAllContacts) {
      postData['selectedAllContacts'] = true;
      postData['selectedAllContactsPayload'] = this.getContactsApiPostData();
      postData['contacts'] = [];
    }
    try {
      await this.prospectingService.deleteContacts(postData);
      await this.getContacts(true);
      this.prospectingService.selectedContacts = [];
      Swal.close();
    } catch (e) {
      Swal.close();
      await Swal.fire('Error', e.message);
    }
  };

  receivedLimitNumber = async (limit) => {
    this.limit = parseInt(limit);
    localStorage.setItem(constants.CONTACTS_TABLE_PAGINATION_LIMIT, limit);
    this.page = 1;

    // set pagination data in service
    this.prospectingService.brandContactCurrentPage = this.page;
    this.prospectingService.brandContactContactLimit = this.limit;

    this.isWaitingFlag = true;
    await this.getContacts(true);
    this.isWaitingFlag = false;
  };

  zerobounceBypass = false;
  handleBypassZerobounce = (bypass) => {
    this.zerobounceBypass = bypass;
  };

  handleAddToDripCampaign = () => {
    this.openSlider(AddContactsToDripCampaignComponent, 'attributes-bg');
  };

  toggleSelectAllContactSelection = () => {
    this.selectAllContacts = !this.selectAllContacts;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };
}
