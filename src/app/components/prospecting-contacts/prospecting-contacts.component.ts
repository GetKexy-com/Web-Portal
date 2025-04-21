import { Component, OnDestroy, OnInit } from "@angular/core";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import { NgbActiveOffcanvas, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { AuthService } from "../../services/auth.service";
import { ProspectingService } from "../../services/prospecting.service";
import { AddOrDeleteContactLabelComponent } from "../add-or-delete-contact-label/add-or-delete-contact-label.component";
import { constants } from "../../helpers/constants";
import { usaStates } from "src/assets/usaStates";
import { canadaStates } from "src/assets/canadaStates";
import Swal from "sweetalert2";
import { Subscription } from "rxjs";
import { PageUiService } from "../../services/page-ui.service";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { routeConstants } from "../../helpers/routeConstants";
import { Router } from "@angular/router";
import {
  AsYouType,
  isValidPhoneNumber,
  parsePhoneNumberFromString as parsePhoneNumber,
  PhoneNumber,
} from "libphonenumber-js";
import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'prospecting-contacts',
  imports: [
    ReactiveFormsModule,
    KexySelectDropdownComponent,
    ErrorMessageCardComponent,
    CommonModule,
  ],
  templateUrl: './prospecting-contacts.component.html',
  styleUrl: './prospecting-contacts.component.scss'
})
export class ProspectingContactsComponent {
  primaryForm: FormGroup;
  userData;
  supplierId;
  isLoading: boolean = false;
  initialLoading: boolean = true;
  submitted: boolean = false;
  canvasTitle: string = "Edit";
  labelOptions = [];
  countries = [...constants.COUNTRIES];
  selectedCountry: string = constants.UNITED_STATES;
  selectedState;
  isMultipleContactsSelected: boolean = false;
  statesOptions = [];
  usaStatesWithKeyValuePair = [];
  canadaStatesWithKeyValuePair = [];
  marketingStatusOptions = [...constants.MARKETING_STATUS_OPTIONS];
  selectedMarketingStatus;
  selectedContacts;
  labelIds = [];
  labelIdFromListContactPage;
  labelIdWhenEditContactFromListContactPage;
  dripCampaignTitles = [];
  contactDripCampaigns = [];
  contactLabelsSubscription: Subscription;
  dripCampaignTitlesSubscription: Subscription;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private dripCampaignService: DripCampaignService,
    private pageUiService: PageUiService,
    private ngbOffcanvas: NgbOffcanvas,
    private router: Router,
  ) {
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    // Get edit data
    if (this.prospectingService.clickedContactInContactPage.length) {
      this.selectedContacts = this.prospectingService.clickedContactInContactPage;
      console.log("selectedContact", this.selectedContacts);
    }
    if (!this.prospectingService.isAddNewButtonClickedInContactPage && !this.prospectingService.clickedContactInContactPage.length) {
      this.selectedContacts = this.prospectingService.selectedContactsInContactsPage;
    }

    // Get label ids for comparing later in assignLabel api for edit single contact
    if (this.selectedContacts?.length && !this.isMultipleContactsSelected) {
      this.selectedContacts[0].kexy_contact_labels.forEach(label => this.labelIds.push(label.id));
    }

    this.isMultipleContactsSelected = this.selectedContacts?.length > 1;

    // Set Canvas Title
    if (this.prospectingService.isAddNewButtonClickedInContactPage) {
      this.canvasTitle = "Create";
    }

    // Get Labels
    this.getAndSetLabels();

    // Get contact drip campaign
    // this.getDripCampaignTitle();
    this.getContactDripCampaign();

    // get labelId from service to check if user is trying to add contact in a list from list-contact page
    this.labelIdFromListContactPage = this.prospectingService.selectedLabelIdInListContactPage;

    // get labelId from service to check if user is trying to edit contact in a list from list-contact page
    this.labelIdWhenEditContactFromListContactPage = this.prospectingService.listIdWhenEditContactFromListContactPage;

    // Checking that if multiple contact is selected or not.If selected than we don't need states list because state field will be hidden.
    if (!this.isMultipleContactsSelected) {
      // Set states dropdown option
      this.getStatesList();
    }

    this.setPrimaryForm();
  }

  ngOnDestroy() {
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
    if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
    this.prospectingService.isAddNewButtonClickedInContactPage = false;
    this.prospectingService.clickedContactInContactPage = [];
    this.prospectingService.selectedLabelIdInListContactPage = null;
    this.prospectingService.listIdWhenEditContactFromListContactPage = null;
  }

  getDripCampaignTitle = async () => {
    await this.dripCampaignService.getAllDripCampaignTitle({ supplier_id: this.userData.supplier_id }, false);

    this.dripCampaignTitlesSubscription = this.dripCampaignService.dripCampaignTitles.subscribe((campaignTitles) => {
      this.dripCampaignTitles = campaignTitles;
    });
  };

  getContactDripCampaign = async () => {
    if (this.isMultipleContactsSelected || this.prospectingService.isAddNewButtonClickedInContactPage) {
      this.initialLoading = false;
      return;
    }

    await this.getDripCampaignTitle();

    const postData = {
      supplier_id: this.supplierId,
      contact_id: parseInt(this.selectedContacts[0].id),
    };
    try {
      const contactDripCampaigns: any = await this.prospectingService.getContactDripCampaigns(postData);
      contactDripCampaigns.forEach(campaign => {
        const index = this.dripCampaignTitles.findIndex(d => d.id.toString() === campaign.drip_campaign_title_id.toString());
        console.log("index", campaign);
        if (index > -1) {
          this.contactDripCampaigns.push({
            ...this.dripCampaignTitles[index],
            drip_campaign_id: campaign.drip_campaign_id,
          });
        }
      });
      this.initialLoading = false;
    } catch (e) {
      this.initialLoading = false;
      Swal.fire("Error", e.message);
    }
  };

  setLabelForListContactAdd = () => {
    this.labelOptions.forEach(label => {
      if (label.id.toString() === this.labelIdFromListContactPage.toString()) {
        label.isSelected = true;
        return;
      }
      label.isSelected = false;
    });
  };

  getAndSetLabels = () => {
    // Get Label
    const getLabelApiPostData = {
      supplier_id: this.supplierId,
      page: this.prospectingService.manageListCurrentPage || 1,
      limit: this.prospectingService.manageListLimit || 100,
      get_total_count: true,
    };
    this.prospectingService.getLabels(getLabelApiPostData);

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.labels.subscribe((labels) => {
      // Set label dropdown options
      this.labelOptions = [];
      labels.forEach(i => {
        const labelObj = {
          key: i.label,
          value: i.label,
          itemBgColor: i.bg_color,
          itemTextColor: i.text_color,
          id: i.id,
          isSelected: false,
        };

        // Set selected labels for edit for single contact
        if (!this.isMultipleContactsSelected && this.selectedContacts?.length) {
          const index = this.selectedContacts[0].kexy_contact_labels.findIndex(label => i.id.toString() === label.kexy_label.id.toString());
          if (index > -1) {
            labelObj.isSelected = true;
          }
        }
        this.labelOptions.push(labelObj);
      });

      // user is trying to add contact in a list from list-contact page
      // so we set label to that listId
      if (this.labelIdFromListContactPage) {
        this.setLabelForListContactAdd();
      }
    });
  };

  redirectToEditPage = (dripCampaign) => {
    // console.log(dripCampaign); return;
    // const queryParams: any = {
    //   id: dripCampaign.id,
    // };
    // this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN], {
    //   queryParams
    // });
  };

  setPrimaryForm = () => {
    let contactDetails;
    let contact;

    if (this.selectedContacts?.length && !this.isMultipleContactsSelected) {
      contact = this.selectedContacts[0];
      contactDetails = JSON.parse(contact.details);

      // set dropdowns data
      this.selectedCountry = contactDetails.country;
      this.selectedState = contactDetails.state;
      this.selectedMarketingStatus = this.pageUiService.capitalizeFirstLetter(contact.marketing_status);

      // let contactPhone = contactDetails?.organization?.phone;
      // if (contactPhone) {
      //   let cleanNumber = contactPhone.replace(/[^\d]/g, "");
      //   let filterNUmber = parsePhoneNumber("+" + cleanNumber);
      //   contactDetails.organization.phone = filterNUmber.formatInternational();
      // }


    }

    this.primaryForm = new FormGroup({
      marketing_status: new FormControl(
        contact?.marketing_status ? contact.marketing_status : "",
        Validators.compose([Validators.minLength(0)]),
      ),
      first_name: new FormControl(
        contactDetails?.first_name ? contactDetails.first_name : "",
        Validators.compose([!this.isMultipleContactsSelected ? Validators.required : null, Validators.minLength(0)]),
      ),
      last_name: new FormControl(
        contactDetails?.last_name ? contactDetails.last_name : "",
        Validators.compose([!this.isMultipleContactsSelected ? Validators.required : null, Validators.minLength(0)]),
      ),
      linkedin: new FormControl(
        contactDetails?.linkedin_url ? contactDetails.linkedin_url : "",
      ),
      // this.pageUiService.customEmailValidator()
      // , !this.isMultipleContactsSelected ? Validators.email : null
      email_address: new FormControl(
        contactDetails?.email ? contactDetails.email : "",
        Validators.compose([!this.isMultipleContactsSelected ? Validators.required : null]),
      ),
      job_title: new FormControl(
        contactDetails?.title ? contactDetails.title : "",
      ),
      company_name: new FormControl(contactDetails?.organization?.name ? contactDetails.organization.name : ""),
      phone_number: new FormControl(contactDetails?.organization?.phone ? contactDetails?.organization?.phone : "", Validators.compose([])),
      city: new FormControl(
        contactDetails?.city ? contactDetails.city : "",
      ),
      state: new FormControl(
        contactDetails?.state ? contactDetails.state : "",
      ),
      country: new FormControl(
        contactDetails?.country ? contactDetails.country : constants.UNITED_STATES,
      ),
      label: new FormControl([]),
      // label: new FormControl([], Validators.compose([!this.isMultipleContactsSelected ? Validators.required : null])),
      notes: new FormControl(contactDetails?.notes ? contactDetails.notes : ""),
    });
  };

  changePhoneNumber = (ev) => {
    console.log(ev.target.value);
    const number = ev.target.value;
    console.log(new AsYouType().input(number));
    console.log(isValidPhoneNumber(new AsYouType().input(number)));
    if (isValidPhoneNumber(new AsYouType().input(number))) {
      let newNUm = parsePhoneNumber(new AsYouType().input(number)).formatNational();
      console.log(newNUm);
    }
  };

  formValidationErrorCheck = (fieldName: string) => {
    return (
      this.primaryForm.controls[fieldName].invalid && (this.submitted || this.primaryForm.controls[fieldName].dirty)
    );
  };

  handleMultiselectFunctionality = (options, selectedValue) => {
    const i = options.indexOf(selectedValue);
    if (i > -1) {
      options[i].isSelected = !options[i].isSelected;
    }
  };

  onLabelSelect = (selectedValue, index = null, rowIndex = null) => {
    this.handleMultiselectFunctionality(this.labelOptions, selectedValue);
  };

  onMarketingStatusSelect = (selectedValue, index = null, rowIndex = null) => {
    this.selectedMarketingStatus = selectedValue.value;
    this.primaryForm.patchValue({ marketing_status: selectedValue.key });
  };

  handleEditContactLabel = (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    // Set selected item in service and open canvas
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

  onCountrySelect = async (selectedValue, index, rowIndex) => {
    this.selectedCountry = selectedValue.value;
    this.primaryForm.patchValue({ country: this.selectedCountry });
    this.getStatesList();
  };

  onStateSelect = async (selectedValue, index, rowIndex) => {
    this.selectedState = selectedValue.value;
    this.primaryForm.patchValue({ state: this.selectedState });
  };

  getStatesList = () => {
    if (this.selectedCountry === constants.UNITED_STATES) {
      // set key value pair for state options
      this.setKeyValuePairForStates();

      this.statesOptions = this.usaStatesWithKeyValuePair.sort((a, b) => a.value.localeCompare(b.value));
    }
    if (this.selectedCountry === constants.CANADA) {
      // set key value pair for state options
      this.setKeyValuePairForStates();

      this.statesOptions = this.canadaStatesWithKeyValuePair.sort((a, b) => a.value.localeCompare(b.value));
    }
  };

  setKeyValuePairForStates = () => {
    // For USA
    if (this.selectedCountry === constants.UNITED_STATES && !this.usaStatesWithKeyValuePair.length) {
      this.usaStatesWithKeyValuePair = [];
      usaStates.map((i) => this.usaStatesWithKeyValuePair.push({ key: i.name, value: i.name, code: i.code }));
    }

    // For Canada
    if (this.selectedCountry === constants.CANADA && !this.canadaStatesWithKeyValuePair.length) {
      this.canadaStatesWithKeyValuePair = [];
      canadaStates.map((i) => this.canadaStatesWithKeyValuePair.push({ key: i.name, value: i.name, code: i.code }));
    }
  };

  handleDeleteLabel = async (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    const confirmed = await this.__isDeleteConfirmed();
    if (!confirmed) return;

    const postData = {
      supplier_id: this.userData.supplier_id,
      label_ids: [data.id],
    };

    try {
      await this.prospectingService.deleteLabel(postData);
    } catch (e) {
      await Swal.fire("Error", e.message);
    }
  };

  __isDeleteConfirmed = async (confirmBtnText: string = "Yes, delete it!") => {
    let isConfirm = await Swal.fire({
      title: `Are you sure?`,
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: confirmBtnText,
    });

    return !isConfirm.dismiss;
  };

  setLabelFieldToPrimaryForm = () => {
    const selectedLabels = this.labelOptions.filter((i) => i.isSelected);
    if (!selectedLabels.length) {
      return;
    }

    const selectedLabelsId = [];
    selectedLabels.map(i => selectedLabelsId.push(`${i.id}`));

    this.primaryForm.patchValue({ label: selectedLabelsId });
  };

  setAndGetAddOrEditSingleContactApiPayload = (formData) => {
    return {
      supplier_id: this.supplierId,
      contacts: [
        {
          id: this.selectedContacts?.length ? this.selectedContacts[0].id : "",
          apollo_contact_id: this.selectedContacts?.length ? JSON.parse(this.selectedContacts[0].details).id : "",
          first_name: formData.first_name,
          last_name: formData.last_name,
          name: `${formData.first_name} ${formData.last_name}`,
          linkedin_url: formData.linkedin,
          title: formData.job_title,
          marketing_status: formData.marketing_status,
          email_status: null,
          photo_url: null,
          twitter_url: null,
          github_url: null,
          facebook_url: null,
          headline: formData.job_title,
          email: formData.email_address,
          organization_id: "",
          employment_history: [{}],
          state: formData.state,
          city: formData.city,
          country: formData.country,
          notes: formData.notes,
          organization: {
            name: formData.company_name,
            website_url: null,
            blog_url: null,
            angellist_url: null,
            linkedin_url: formData.linkedin,
            twitter_url: null,
            facebook_url: null,
            logo_url: null,
            phone: formData.phone_number,
            industry: null,
            founded_year: null,
            estimated_num_employees: null,
            street_address: "",
            city: formData.city,
            state: formData.state,
            postal_code: "",
            country: formData.country,
          },
          is_likely_to_engage: true,
        },
      ],
      label_ids: formData.label,
    };
  };

  setAndGetEditMultipleContactApiPayload = (formData) => {
    const contacts = [];
    this.selectedContacts.forEach(contact => {
      const contactDetails = JSON.parse(contact.details);
      const apolloContactId = contactDetails.id;
      const contactObj = {
        id: contact.id,
        apollo_contact_id: apolloContactId,
        first_name: contactDetails.first_name,
        last_name: contactDetails.last_name,
        name: `${contactDetails.first_name} ${contactDetails.last_name}`,
        linkedin_url: contactDetails.linkedin,
        title: contactDetails.title,
        marketing_status: formData.marketing_status === "" ? contact.marketing_status : formData.marketing_status,
        email_status: null,
        photo_url: null,
        twitter_url: null,
        github_url: null,
        facebook_url: null,
        headline: contactDetails.title,
        email: contactDetails.email,
        organization_id: "",
        employment_history: [{}],
        state: contactDetails.state,
        city: contactDetails.city,
        country: contactDetails.country,
        notes: formData.notes,
        organization: {
          name: contactDetails.organization.name,
          website_url: null,
          blog_url: null,
          angellist_url: null,
          linkedin_url: contactDetails.linkedin,
          twitter_url: null,
          facebook_url: null,
          logo_url: null,
          phone: contactDetails.organization.phone,
          industry: null,
          founded_year: null,
          estimated_num_employees: null,
          street_address: "",
          city: contactDetails.city,
          state: contactDetails.state,
          postal_code: "",
          country: contactDetails.country,
        },
        is_likely_to_engage: true,
      };
      contacts.push(contactObj);
    });
    return {
      supplier_id: this.supplierId,
      contacts: contacts,
      label_ids: formData.label,
    };
  };

  parseContactDetails = (data) => {
    console.log("data", data);
    const contacts = [];
    data.forEach(contact => {
      const details = JSON.parse(contact.details);
      details["id"] = contact.id;
      contacts.push({ ...contact, details: details });
      console.log("details", details);
    });
    return contacts;
  };

  getContactsApiPayload = () => {
    const getContactApiPostData = {
      supplier_id: this.supplierId,
      page: this.prospectingService.brandContactCurrentPage,
      limit: this.prospectingService.brandContactContactLimit,
      drip_campaign_id: "",
      label_ids: [],
      contact_name: "",
      company_name: "",
      email: "",
      job_title: "",
      marketing_status: "",
      email_status: "",
      city: "",
      state: "",
      country: "",
      get_total_count: true,
      sort_by: "",
    };
    if (this.labelIdFromListContactPage) getContactApiPostData["label_ids"] = [this.labelIdFromListContactPage];
    if (this.labelIdWhenEditContactFromListContactPage) getContactApiPostData["label_ids"] = [this.labelIdWhenEditContactFromListContactPage];

    if (!this.labelIdFromListContactPage && !this.labelIdWhenEditContactFromListContactPage) {
      const filterCount = this.prospectingService.searchContactActiveFilterCount;
      const filterData = this.prospectingService.searchContactFilterData;
      if (filterCount && filterData) {
        if (filterData["country"]) getContactApiPostData["country"] = filterData["country"];
        if (filterData["city"]) getContactApiPostData["city"] = filterData["city"];
        if (filterData["state"]) getContactApiPostData["state"] = filterData["state"];
        if (filterData["name"]) getContactApiPostData["contact_name"] = filterData["name"];
        if (filterData["companyName"]) getContactApiPostData["company_name"] = filterData["companyName"];
        if (filterData["email"]) getContactApiPostData["email"] = filterData["email"];
        if (filterData["emailStatus"]) getContactApiPostData["email_status"] = filterData["emailStatus"];
        if (filterData["marketingStatus"]) getContactApiPostData["marketing_status"] = filterData["marketingStatus"];
        if (filterData["labels"]?.length) {
          const label_ids = [];
          filterData["labels"].forEach(label => label_ids.push(label.id));
          getContactApiPostData["label_ids"] = label_ids;
        }
      }
    }
    return getContactApiPostData;
  };

  handleSubmit = async () => {
    this.submitted = true;
    this.setLabelFieldToPrimaryForm();
    if (!this.primaryForm.valid) {
      console.log("primaryForm", this.primaryForm);
      return false;
    }

    this.isLoading = true;
    const formData = this.primaryForm.getRawValue();
    let postData;
    const getContactApiPostData = this.getContactsApiPayload();

    try {
      let contacts: any = [];
      if (this.selectedContacts?.length) {
        contacts = this.parseContactDetails(this.selectedContacts);
      }

      if (!this.selectedContacts) {
        // Create Contact
        postData = this.setAndGetAddOrEditSingleContactApiPayload(formData);
        const createdContacts = await this.prospectingService.addContacts(postData);
        contacts = this.parseContactDetails(createdContacts);

      } else if (this.selectedContacts?.length && !this.isMultipleContactsSelected) {
        // Edit Single Contact
        postData = this.setAndGetAddOrEditSingleContactApiPayload(formData);
        await this.prospectingService.editContacts(postData);

      } else {
        // Edit Multiple Contact
        postData = this.setAndGetEditMultipleContactApiPayload(formData);
        if (this.prospectingService.selectedAllContacts) {
          postData["selected_all_contacts"] = "true";
          postData["selected_all_contacts_payload"] = getContactApiPostData;
          postData["contacts"] = [];
          if (this.selectedMarketingStatus) {
            postData["selected_all_contacts_marketing_status"] = this.selectedMarketingStatus;
          }
        }
        await this.prospectingService.editContacts(postData);
      }

      // for (const labelId of formData.label) {
      //   const notifyApiPostData = {
      //     supplier_id: this.userData.supplier_id,
      //     label_id: labelId,
      //   };
      //   const notifyApiRes = await this.prospectingService.notifyAddContactsInDrip(notifyApiPostData);
      //   if (notifyApiRes && notifyApiRes["drip_campaign_id"]) {
      //     const assignApiPostData = {
      //       supplier_id: this.userData.supplier_id,
      //       contacts,
      //       label_ids: [labelId],
      //       notify: false,
      //       drip_campaign_id: notifyApiRes["drip_campaign_id"],
      //     };
      //     if (this.prospectingService.selectedAllContacts) {
      //       assignApiPostData["selected_all_contacts"] = "true";
      //       assignApiPostData["selected_all_contacts_payload"] = getContactApiPostData;
      //       assignApiPostData["contacts"] = [];
      //     }
      //     await this.dripCampaignService.assignContactsAndLabelsInCampaign(assignApiPostData);
      //   }
      // }

      if (this.labelIdFromListContactPage) {
        this.getAndSetLabels();
      }
      await this.prospectingService.getContacts(getContactApiPostData, true);
      this.prospectingService.selectedContactsInContactsPage = [];

      this.activeCanvas.dismiss("Cross click");
      this.isLoading = false;
    } catch (e) {
      await Swal.fire("Error", e.message);
    }
  };

  removeContactFromDripCampaign = async (campaign) => {
    const confirmed = await this.__isDeleteConfirmed("Yes, remove it!");
    if (!confirmed) return;

    const postData = {
      drip_campaign_id: campaign.drip_campaign_id,
      contact_email: this.selectedContacts[0].email,
    };

    try {
      this.initialLoading = true;
      await this.prospectingService.removeDripCampaignFromContact(postData);
      const index = this.contactDripCampaigns.indexOf(campaign);
      if (index > -1) {
        this.contactDripCampaigns.splice(index, 1);
      }

    } catch (e) {
      await Swal.fire("Error", e.message);
    } finally {
      this.initialLoading = false;
    }

  };
}
