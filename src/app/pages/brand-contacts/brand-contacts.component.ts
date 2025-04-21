import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { Subscription } from "rxjs";
import { AuthService } from "src/app/services/auth.service";
import { NgbModal, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingContactsComponent } from "src/app/components/prospecting-contacts/prospecting-contacts.component";
import { ProspectingService } from "src/app/services/prospecting.service";
import Swal from "sweetalert2";
import { ExportToCsv } from "src/app/helpers/CSVHelper";
import { constants } from "src/app/helpers/constants";
import { DripCampaignService } from "src/app/services/drip-campaign.service";
import { ActivatedRoute, Router } from "@angular/router";
import { ChangeDetectorRef } from "@angular/core";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
import {ContactListCardComponent} from '../../components/contact-list-card/contact-list-card.component';
import {
  UploadFileModalContentComponent
} from '../../components/upload-file-modal-content/upload-file-modal-content.component';
import {
  SearchContactModalContentComponent
} from '../../components/search-contact-modal-content/search-contact-modal-content.component';
import {
  AddContactsToDripCampaignComponent
} from '../../components/add-contacts-to-drip-campaign/add-contacts-to-drip-campaign.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'brand-contacts',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    ContactListCardComponent,
    UploadFileModalContentComponent,
    SearchContactModalContentComponent,
    CommonModule
  ],
  templateUrl: './brand-contacts.component.html',
  styleUrl: './brand-contacts.component.scss'
})
export class BrandContactsComponent {
  modalReference;
  searchModalReference;
  userData;
  supplierId;
  contactList = [];
  totalContactsCount = 0;
  isWaitingFlag: boolean = true;
  isLoading: boolean = false;
  selectedContacts = [];
  page = 1;
  limit = 100;
  totalPage;
  allContacts;
  contactListSubscription: Subscription;
  contactLabelsSubscription: Subscription;
  searchLabelIds = [];
  searchLabels = [];
  labelOptions = [];
  searchContactName = "";
  searchContactEmail = "";
  searchContactCompanyName = "";
  searchContactCountry = "";
  searchContactCity = "";
  searchContactState = "";
  searchContactMarketingStatus = "";
  searchContactEmailStatus = "";
  addToDripCampaignId;
  addToDrip;
  contactId;
  sortType = "";
  sortBy = "";
  activeFilterCount = 0;
  selectAllContacts = false;

  constructor(
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private dripCampaignService: DripCampaignService,
    private ngbOffcanvas: NgbOffcanvas,
    private modal: NgbModal,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    // override the route reuse strategy
    this.router.routeReuseStrategy.shouldReuseRoute = function() {
      return false;
    };
  }

  async ngOnInit() {
    document.title = "Contacts - KEXY Brand Portal";
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
      if (params["addToDripCampaignId"]) {
        this.addToDripCampaignId = params["addToDripCampaignId"];
      }
      if (params["addToDrip"] && params["contactId"]) {
        this.addToDrip = true;
        this.contactId = params["contactId"];
      }
    });
  };

  getContactsApiPostData = () => {
    return {
      supplier_id: this.supplierId,
      drip_campaign_id: "",
      label_ids: this.searchLabelIds,
      contact_name: this.searchContactName,
      company_name: this.searchContactCompanyName,
      email: this.searchContactEmail,
      job_title: "",
      email_status: this.searchContactEmailStatus,
      marketing_status: this.searchContactMarketingStatus,
      city: this.searchContactCity,
      state: this.searchContactState,
      country: this.searchContactCountry,
      page: this.page,
      limit: this.limit,
      get_total_count: true,
      sort_by: this.sortBy,
      sort_type: this.sortType,
    };
  };

  getContacts = async (overwrite = false) => {
    const postData = this.getContactsApiPostData();
    await this.prospectingService.getContacts(postData, overwrite);
  };

  getAContact = async () => {
    const postData = {
      supplier_id: this.supplierId,
      contact_id: this.contactId,
    };
    const contact = await this.prospectingService.getContact(postData);
    this.contactList = this.prospectingService.setLabelsInContactsList([contact]);
    this.totalPage = "1";
  };

  setContactSubscription = () => {
    this.contactListSubscription = this.prospectingService.contacts.subscribe((data) => {
      if (data) {
        this.contactList = this.prospectingService.setLabelsInContactsList(data["contacts"]);
        this.totalContactsCount = data["total"];
        this.totalPage = Math.ceil(this.totalContactsCount / this.limit);

        this.selectedContacts = [];
        this.isLoading = false;
        // this.cdr.detectChanges();  // 🔹 Force UI update
      }
    });
  };


  getLabels = async () => {
    // Get Label
    await this.prospectingService.getLabels({ supplier_id: this.supplierId });

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.labels.subscribe((labels) => {
      // Set label dropdown options
      this.labelOptions = [];
      labels.map(i => {
        const labelObj = {
          key: i.label,
          value: i.label,
          itemBgColor: i.bg_color,
          itemTextColor: i.text_color,
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
      supplier_id: this.supplierId,
      drip_campaign_id: "",
      label_ids: [],
      contact_name: "",
      company_name: "",
      job_title: "",
      marketing_status: "",
      email_status: "",
      city: "",
      state: "",
      country: "",
      page: 1,
      limit: 9999999,
      get_total_count: true,
      sort_by: "",
      sort_type: "",
    };
    try {
      this.allContacts = await this.prospectingService.getAllContacts(postData, true);
      this.exportBtnLoading = false;
    } catch (e) {
      this.exportBtnLoading = false;
      Swal.fire("Error", e.message);
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
    this.cdr.detectChanges();  // 🔹 Ensure UI updates before fetching
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
    this.prospectingService.cachedContacts = {};
  };

  importBtnClick = (content) => {
    this.modalReference = this.modal.open(content, { size: "md" });
  };

  @ViewChild("searchContacts", { static: true }) searchContactsModal: ElementRef;
  handleSearchBtnClick = () => {
    this.searchModalReference = this.modal.open(this.searchContactsModal, { size: "lg" });
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
    if (data) {
      this.prospectingService.clickedContactInContactPage = [data];
    }
    this.openContactSlider();
  };

  openContactSlider = () => {
    this.openSlider(ProspectingContactsComponent);
  };

  openSlider = (component, sliderClass = "contact-slide-content") => {
    this.ngbOffcanvas.open(component, {
      panelClass: `${sliderClass} edit-rep-canvas`,
      backdropClass: "edit-rep-canvas-backdrop",
      position: "end",
      scroll: false,
    });
  };

  resetSearchData = async () => {
    this.searchContactName = "";
    this.searchContactCompanyName = "";
    this.searchContactEmail = "";
    this.searchContactCountry = "";
    this.searchContactState = "";
    this.searchContactCity = "";
    this.searchContactMarketingStatus = "";
    this.searchContactEmailStatus = "";
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
      searchData.labels.forEach(l => {
        this.searchLabelIds.push(l.id);
      });
    } else {
      searchData.labels = [];
    }
    this.searchContactName = searchData.name || "";
    this.searchContactCompanyName = searchData.companyName || "";
    this.searchContactEmail = searchData.email || "";
    this.searchContactCity = searchData.city || "";
    this.searchContactState = searchData.state || "";
    this.searchContactCountry = searchData.country || "";
    this.searchContactMarketingStatus = searchData.marketingStatus || "";
    this.searchContactEmailStatus = searchData.emailStatus || "";

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
    console.log("data", data);
    this.isLoading = true;
    const contacts = [];

    data.map(contact => {
      contacts.push({
        id: "",
        first_name: contact["First Name"],
        last_name: contact["Last Name"],
        name: `${contact["First Name"]} ${contact["Last Name"]}`,
        linkedin_url: contact["Linkedin"],
        title: contact["Job Title"],
        email_status: null,
        photo_url: null,
        twitter_url: null,
        github_url: null,
        facebook_url: null,
        headline: contact["Job Title"],
        email: contact["Email"],
        organization_id: "",
        employment_history: [{}],
        state: contact["State"],
        city: contact["City"],
        country: contact["Country"],
        organization: {
          name: contact["Company Name"],
          website_url: null,
          blog_url: null,
          angellist_url: null,
          linkedin_url: null,
          twitter_url: null,
          facebook_url: null,
          logo_url: null,
          phone: contact["Phone Number"],
          industry: null,
          founded_year: null,
          estimated_num_employees: null,
          street_address: "",
          city: contact["City"],
          state: contact["State"],
          postal_code: "",
          country: contact["Country"],
        },
        is_likely_to_engage: true,
      });
    });

    const labelId = this.selectedLabel?.id?.toString();
    const payload = {
      supplier_id: this.supplierId,
      contacts: contacts,
      label_ids: labelId ? [labelId] : [],
    };

    if (this.zerobounceBypass) {
      payload["bypass_zerobounce"] = "true";
    }

    try {
      await this.prospectingService.addContacts(payload);

      if (labelId) {
        const notifyApiPostData = {
          supplier_id: this.userData.supplier_id,
          label_id: labelId,
        };
        const notifyApiRes = await this.prospectingService.notifyAddContactsInDrip(notifyApiPostData);
        if (notifyApiRes && notifyApiRes["drip_campaign_id"]) {
          const dripCampaign = await this.dripCampaignService.getDripCampaignTitle({ drip_campaign_id: notifyApiRes["drip_campaign_id"] });
          let isConfirm = await Swal.fire({
            title: "Are you sure?",
            text: `Selected "${this.selectedLabel["value"]}" is connected to a drip campaign "${dripCampaign["title"]}". Do you want to add these contacts to this drip campaign?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: "Yes, do it!",
            showLoaderOnConfirm: true,
          });

          if (!isConfirm.dismiss) {
            const assignApiPostData = {
              supplier_id: this.userData.supplier_id,
              contacts,
              label_ids: [labelId],
              notify: false,
              drip_campaign_id: notifyApiRes["drip_campaign_id"],
            };
            await this.dripCampaignService.assignContactsAndLabelsInCampaign(assignApiPostData);
          }
        }
      }

      await this.getContacts(true);
      this.isLoading = false;
      this.closeModal();
    } catch (e) {
      this.isLoading = false;
      await Swal.fire("Error", e.message);
    }
  };

  exportCSV = async () => {
    await this.getAllContacts();

    const headers = `First Name,Last Name,Linkedin,Email,Email Status,Job Title,Company Name,Phone Number,City,State,Country,Marketing Status,List`;
    let rows = "";
    this.allContacts.forEach((contact) => {
      // console.log('contact', contact);
      let labels = [];
      contact.kexy_contact_labels.forEach(label => {
        labels.push(label.kexy_label.label);
      });

      let contactDetails = JSON.parse(contact.details);
      rows += `${contactDetails.first_name?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.last_name?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.linkedin_url?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.email?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.email_status?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.title?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.organization.name?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.organization.phone?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.city?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.state?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.country?.replace(/,/g, " ")}, `;
      rows += `${contact.marketing_status?.replace(/,/g, " ")}, `;
      rows += `${labels.length ? labels.join("/") : ""}\n`;
    });
    // console.log(rows);
    await ExportToCsv.download("Contacts.csv", headers + "\n" + rows);
    this.isWaitingFlag = false;
  };

  deleteContacts = async () => {
    let isConfirm = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: "Yes, delete it!",
      showLoaderOnConfirm: true,
    });

    if (isConfirm.dismiss) {
      return;
    }

    Swal.fire({
      title: "",
      text: "Please wait...",
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    Swal.showLoading();

    const contactIds = [];
    this.selectedContacts.map(i => contactIds.push(i.id));
    const postData = {
      supplier_id: this.supplierId,
      contacts: contactIds,
    };
    if (this.selectAllContacts) {
      postData["selected_all_contacts"] = "true";
      postData["selected_all_contacts_payload"] = this.getContactsApiPostData();
      postData["contacts"] = [];
    }
    try {
      await this.prospectingService.deleteContacts(postData);
      await this.getContacts(true);
      this.prospectingService.selectedContacts = [];
      Swal.close();
    } catch (e) {
      Swal.close();
      await Swal.fire("Error", e.message);
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
    this.openSlider(AddContactsToDripCampaignComponent, "attributes-bg");
  };

  toggleSelectAllContactSelection = () => {
    this.selectAllContacts = !this.selectAllContacts;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };
}
