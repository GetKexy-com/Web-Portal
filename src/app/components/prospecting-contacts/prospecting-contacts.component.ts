import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveOffcanvas, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { ProspectingService } from '../../services/prospecting.service';
import { AddOrDeleteContactLabelComponent } from '../add-or-delete-contact-label/add-or-delete-contact-label.component';
import { constants } from '../../helpers/constants';
import { usaStates } from 'src/assets/usaStates';
import { canadaStates } from 'src/assets/canadaStates';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { PageUiService } from '../../services/page-ui.service';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { routeConstants } from '../../helpers/routeConstants';
import { Router } from '@angular/router';
import {
  AsYouType,
  isValidPhoneNumber,
  parsePhoneNumberFromString as parsePhoneNumber,
  PhoneNumber,
} from 'libphonenumber-js';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { CommonModule } from '@angular/common';
import { Contact, ContactDetails } from '../../models/Contact';

@Component({
  selector: 'prospecting-contacts',
  imports: [
    ReactiveFormsModule,
    KexySelectDropdownComponent,
    ErrorMessageCardComponent,
    CommonModule,
  ],
  templateUrl: './prospecting-contacts.component.html',
  styleUrl: './prospecting-contacts.component.scss',
})
export class ProspectingContactsComponent implements OnInit, OnDestroy {
  primaryForm: FormGroup;
  userData;
  supplierId;
  isLoading: boolean = false;
  initialLoading: boolean = true;
  submitted: boolean = false;
  canvasTitle: string = 'Edit';
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
  selectedContacts: Contact[] = [];
  contact: Contact = Contact.empty();
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
    }
    if (!this.prospectingService.isAddNewButtonClickedInContactPage && !this.prospectingService.clickedContactInContactPage.length) {
      this.selectedContacts = this.prospectingService.selectedContactsInContactsPage;
    }

    // Get label ids for comparing later in assignLabel api for edit single contact
    if (this.selectedContacts?.length && !this.isMultipleContactsSelected) {
      this.selectedContacts[0].lists.forEach(label => this.labelIds.push(label.id));
    }

    this.isMultipleContactsSelected = this.selectedContacts?.length > 1;

    // Set Canvas Title
    if (this.prospectingService.isAddNewButtonClickedInContactPage) {
      this.canvasTitle = 'Create';
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

    // const postData = {
    //   supplier_id: this.supplierId,
    //   contact_id: parseInt(this.selectedContacts[0].id),
    // };
    try {
      // TODO - Later
      // const contactDripCampaigns: any = await this.prospectingService.getContactDripCampaigns(postData);
      // contactDripCampaigns.forEach(campaign => {
      //   const index = this.dripCampaignTitles.findIndex(d => d.id.toString() === campaign.drip_campaign_title_id.toString());
      //   console.log("index", campaign);
      //   if (index > -1) {
      //     this.contactDripCampaigns.push({
      //       ...this.dripCampaignTitles[index],
      //       drip_campaign_id: campaign.drip_campaign_id,
      //     });
      //   }
      // });
      this.initialLoading = false;
    } catch (e) {
      this.initialLoading = false;
      Swal.fire('Error', e.message);
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
          itemBgColor: i.bgColor,
          itemTextColor: i.textColor,
          id: i.id,
          isSelected: false,
        };

        // Set selected labels for edit for single contact
        if (!this.isMultipleContactsSelected && this.selectedContacts?.length) {
          const index = this.selectedContacts[0].lists.findIndex(label => i.id.toString() === label.id.toString());
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
    let contactDetails: ContactDetails;
    this.contact = this.selectedContacts[0];
    contactDetails = this.contact.details;

    if (this.selectedContacts?.length && !this.isMultipleContactsSelected) {
      // set dropdowns data
      this.selectedCountry = contactDetails.country;
      this.selectedState = contactDetails.state;
      this.selectedMarketingStatus = this.pageUiService.capitalizeFirstLetter(this.contact.marketingStatus);
    } else {
      this.selectedMarketingStatus = '';
    }

    this.primaryForm = new FormGroup({
      marketingStatus: new FormControl(
        this.selectedMarketingStatus,
        Validators.compose([Validators.minLength(0)]),
      ),
      firstName: new FormControl(
        contactDetails.firstName,
        Validators.compose([!this.isMultipleContactsSelected ? Validators.required : null, Validators.minLength(0)]),
      ),
      lastName: new FormControl(
        contactDetails.lastName,
        Validators.compose([!this.isMultipleContactsSelected ? Validators.required : null, Validators.minLength(0)]),
      ),
      linkedinUrl: new FormControl(
        contactDetails.linkedinUrl,
      ),
      // this.pageUiService.customEmailValidator()
      // , !this.isMultipleContactsSelected ? Validators.email : null
      email: new FormControl(
        contactDetails.email,
        Validators.compose([!this.isMultipleContactsSelected ? Validators.required : null, Validators.email]),
      ),
      title: new FormControl(
        contactDetails.title,
      ),
      organizationName: new FormControl(contactDetails?.organization?.name ? contactDetails.organization.name : ''),
      organizationPhone: new FormControl(contactDetails?.organization?.phone ? contactDetails?.organization?.phone : '', Validators.compose([])),
      city: new FormControl(
        contactDetails.city,
      ),
      state: new FormControl(
        contactDetails.state,
      ),
      country: new FormControl(
        contactDetails.country ? contactDetails.country : constants.UNITED_STATES,
      ),
      lists: new FormControl([], Validators.compose([!this.isMultipleContactsSelected ? Validators.required : null])),
      notes: new FormControl(contactDetails?.notes ? contactDetails.notes : ''),
    });
  };

  formValidationErrorCheck = (fieldName: string) => {
    return (
      this.primaryForm.controls[fieldName].invalid && (this.submitted || this.primaryForm.controls[fieldName].dirty)
    );
  };

  handleMultiselectFunctionality = (options, selectedValue) => {
    const i = options.indexOf(selectedValue);
    console.log({ i });
    if (i > -1) {
      options[i].isSelected = !options[i].isSelected;
    }
  };

  onLabelSelect = (selectedValue, index = null, rowIndex = null) => {
    this.handleMultiselectFunctionality(this.labelOptions, selectedValue);
    this.setLabelFieldToPrimaryForm();
  };

  onMarketingStatusSelect = (selectedValue, index = null, rowIndex = null) => {
    this.selectedMarketingStatus = selectedValue.value;
    this.primaryForm.patchValue({ marketingStatus: selectedValue.key });
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
      panelClass: 'attributes-bg edit-rep-canvas',
      backdropClass: 'edit-rep-canvas-backdrop label-offcanvas-backdrop',
      position: 'end',
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
      await Swal.fire('Error', e.message);
    }
  };

  __isDeleteConfirmed = async (confirmBtnText: string = 'Yes, delete it!') => {
    let isConfirm = await Swal.fire({
      title: `Are you sure?`,
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: confirmBtnText,
    });

    return !isConfirm.dismiss;
  };

  setLabelFieldToPrimaryForm = () => {
    const selectedLabels = this.labelOptions.filter((i) => i.isSelected);
    // if (!selectedLabels.length) {
    //   return;
    // }

    const selectedLabelsId = [];
    if (selectedLabels.length) {
      selectedLabels.map(i => selectedLabelsId.push(`${i.id}`));
    }
    this.primaryForm.patchValue({ lists: selectedLabelsId });
  };

  setAndGetAddOrEditSingleContactApiPayload = (formData) => {
    const contactDetails: ContactDetails = this.contact.details;
    contactDetails.firstName = formData.firstName;
    contactDetails.lastName = formData.lastName;
    contactDetails.linkedinUrl = formData.linkedinUrl;
    contactDetails.name = `${formData.firstName} ${formData.lastName}`;
    contactDetails.title = formData.title;
    contactDetails.marketingStatus = formData.marketingStatus;
    contactDetails.email = formData.email;
    contactDetails.state = formData.state;
    contactDetails.city = formData.city;
    contactDetails.country = formData.country;
    contactDetails.notes = formData.notes;
    contactDetails.isLikelyToEngage = true;
    contactDetails.organization.name = formData.organizationName;
    contactDetails.organization.phone = formData.organizationPhone;
    contactDetails.organization.linkedinUrl = formData.linkedinUrl;
    contactDetails.organization.city = formData.city;
    contactDetails.organization.state = formData.state;
    contactDetails.organization.country = formData.country;

    return {
      companyId: this.supplierId,
      contacts: [Contact.contactPostDto(this.contact)],
      listIds: formData.lists,
    };
  };

  setAndGetEditMultipleContactApiPayload = (formData) => {
    const contacts = this.selectedContacts.map((c: any) => {
      return Contact.contactPostDto(c);
    });
    return {
      companyId: this.supplierId,
      contacts,
      listIds: formData.lists,
      marketingStatus: formData.marketingStatus,
    };
  };

  parseContactDetails = (data) => {
    console.log('data', data);
    const contacts = [];
    data.forEach(contact => {
      const details = JSON.parse(contact.details);
      details['id'] = contact.id;
      contacts.push({ ...contact, details: details });
      console.log('details', details);
    });
    return contacts;
  };

  getContactsApiPayload = () => {
    const getContactApiPostData = {
      companyId: this.supplierId,
      dripCampaignId: '',
      listIds: [],
      contactName: '',
      companyName: '',
      jobTitle: '',
      emailStatus: '',
      marketingStatus: '',
      city: '',
      state: '',
      country: '',
      page: this.prospectingService.brandContactCurrentPage,
      limit: this.prospectingService.brandContactContactLimit,
      sortBy: '',
      sortType: '',
    };
    if (this.labelIdFromListContactPage) getContactApiPostData.listIds = [this.labelIdFromListContactPage];
    if (this.labelIdWhenEditContactFromListContactPage) getContactApiPostData.listIds = [this.labelIdWhenEditContactFromListContactPage];

    if (!this.labelIdFromListContactPage && !this.labelIdWhenEditContactFromListContactPage) {
      const filterCount = this.prospectingService.searchContactActiveFilterCount;
      const filterData = this.prospectingService.searchContactFilterData;
      if (filterCount && filterData) {
        if (filterData['country']) getContactApiPostData['country'] = filterData['country'];
        if (filterData['city']) getContactApiPostData['city'] = filterData['city'];
        if (filterData['state']) getContactApiPostData['state'] = filterData['state'];
        if (filterData['name']) getContactApiPostData['contactName'] = filterData['name'];
        if (filterData['companyName']) getContactApiPostData['companyName'] = filterData['companyName'];
        if (filterData['email']) getContactApiPostData['email'] = filterData['email'].trim();
        if (filterData['emailStatus']) getContactApiPostData['emailStatus'] = filterData['emailStatus'];
        if (filterData['marketingStatus']) getContactApiPostData['marketingStatus'] = filterData['marketingStatus'];
        if (filterData['labels']?.length) {
          const listIds = [];
          filterData['labels'].forEach(label => listIds.push(label.id));
          getContactApiPostData.listIds = listIds;
        }
      }
    }
    return getContactApiPostData;
  };

  handleSubmit = async () => {
    this.submitted = true;
    if (!this.primaryForm.valid) {
      return false;
    }

    this.isLoading = true;
    const formData = this.primaryForm.getRawValue();
    let postData;
    const getContactApiPostData = this.getContactsApiPayload();

    try {

      if (!this.selectedContacts) {
        postData = this.setAndGetAddOrEditSingleContactApiPayload(formData);
        // Create Contact
        await this.prospectingService.addContacts(postData);

      } else if (this.selectedContacts?.length && !this.isMultipleContactsSelected) {
        // Edit Single Contact
        postData = this.setAndGetAddOrEditSingleContactApiPayload(formData);
        await this.prospectingService.editContacts(postData);

      } else {
        // Edit Multiple Contact
        postData = this.setAndGetEditMultipleContactApiPayload(formData);
        if (this.prospectingService.selectedAllContacts) {
          postData['selectedAllContacts'] = true;
          postData['selectedAllContactsPayload'] = getContactApiPostData;
          postData['contacts'] = [];
          if (this.selectedMarketingStatus) {
            postData['selectedAllContactsMarketingStatus'] = this.selectedMarketingStatus;
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

      this.activeCanvas.dismiss('Cross click');
      this.isLoading = false;
    } catch (e) {
      await Swal.fire('Error', e.message);
    }
  };

  removeContactFromDripCampaign = async (campaign) => {
    const confirmed = await this.__isDeleteConfirmed('Yes, remove it!');
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
      await Swal.fire('Error', e.message);
    } finally {
      this.initialLoading = false;
    }

  };
}
