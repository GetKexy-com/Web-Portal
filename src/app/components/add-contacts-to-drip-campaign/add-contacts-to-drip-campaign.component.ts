import { Component, OnDestroy, OnInit } from "@angular/core";
import { NgbActiveOffcanvas, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { AuthService } from "../../services/auth.service";
import { ProspectingService } from "../../services/prospecting.service";
import { Subscription } from "rxjs";
import Swal from "sweetalert2";
import { constants } from "src/app/helpers/constants";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { ActivatedRoute } from "@angular/router";
import {FormsModule} from '@angular/forms';
import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'add-contacts-to-drip-campaign',
  imports: [
    FormsModule,
    KexySelectDropdownComponent,
    ErrorMessageCardComponent,
    CommonModule,
  ],
  templateUrl: './add-contacts-to-drip-campaign.component.html',
  styleUrl: './add-contacts-to-drip-campaign.component.scss'
})
export class AddContactsToDripCampaignComponent {
  isLoading: boolean = false;
  labels = [];
  userData;
  dripCampaignDropDownList = [];
  dripCampaignList;
  dripCampaignTitles;
  selectedDripCampaign = "";
  addToDripCampaignId;
  submitted: boolean = false;
  selectedContacts;
  selectedLabelIds = [];
  contactLabelsSubscription: Subscription;
  dripCampaignTitlesSubscription: Subscription;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private dripCampaignService: DripCampaignService,
    private route: ActivatedRoute,
  ) {
  }

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;
    this.selectedContacts = this.prospectingService.selectedContactsInContactsPage;

    this.route.queryParams.subscribe((params) => {
      if (params["addToDripCampaignId"]) {
        this.addToDripCampaignId = params["addToDripCampaignId"];
      }
    });

    await this.getAndSetDripCampaignTitleSubscription();
    this.getDripCampaignsApiCall();
    this.getAndSetLabels();
  }

  ngOnDestroy() {
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
    if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
  }

  getAndSetLabels = () => {
    // Get Label
    const getLabelApiPostData = {
      supplier_id: this.userData.supplier_id,
      page: this.prospectingService.manageListCurrentPage || 1,
      limit: this.prospectingService.manageListLimit || 100,
      get_total_count: true,
    };
    this.prospectingService.getLabels(getLabelApiPostData);

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.labels.subscribe((labels) => {
      // Set label dropdown options
      this.labels = labels;
    });
  };

  getDripCampaignsApiCall = async () => {
    const postData = {
      page: 1,
      supplier_id: this.userData.supplier_id,
      limit: 1000,
      get_total_count: false,
    };
    this.dripCampaignList = await this.dripCampaignService.getListOfDripCampaignsWithoutPagination(postData, true);
    if (this.dripCampaignList.length) {
      this.dripCampaignList = this.dripCampaignList.filter(i => {
        return (i.status === constants.ACTIVE || i.status === constants.PAUSE);
      });
    }

    this.dripCampaignList.forEach(cam => {
      this.dripCampaignDropDownList.push({
        key: cam.id,
        id: cam.id,
        lists: cam.drip_campaign_kexy_labels,
        value: this.getCampaignTitle(cam.drip_campaign_detail.drip_campaign_title_id),
      });
    });

    if (this.addToDripCampaignId) {
      const index = this.dripCampaignDropDownList.findIndex(d => d.id.toString() === this.addToDripCampaignId);
      if (index > -1) {
        this.onDripCampaignSelect(this.dripCampaignDropDownList[index]);
      }
    }
  };

  getCampaignTitle = (title_id) => {
    const index = this.dripCampaignTitles && this.dripCampaignTitles.findIndex(i => i.id.toString() === title_id.toString());
    if (index < 0) return;

    return this.dripCampaignTitles[index].title;
  };

  getAndSetDripCampaignTitleSubscription = async () => {
    await this.dripCampaignService.getAllDripCampaignTitle({ supplier_id: this.userData.supplier_id });

    this.dripCampaignTitlesSubscription = this.dripCampaignService.dripCampaignTitles.subscribe((dripCampaignTitles) => {
      this.dripCampaignTitles = dripCampaignTitles;
      this.dripCampaignTitles.map((i) => {
        i.value = i.title.length > 100 ? i.title.slice(0, 100) + "..." : i.title;
      });
    });
  };

  onDripCampaignSelect = async (selectedValue, index = 0, rowIndex = 0) => {
    console.log("labels", selectedValue);
    this.selectedDripCampaign = selectedValue;
    this.addToDripCampaignId = selectedValue.id;
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

  setAndGetEditMultipleContactApiPayload = () => {
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
        marketing_status: contact.marketing_status,
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
        notes: contactDetails.notes,
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
      supplier_id: this.userData.supplier_id,
      contacts: contacts,
      label_ids: this.selectedLabelIds,
    };
  };

  getContactsApiPayload = () => {
    return {
      supplier_id: this.userData.supplier_id,
      page: this.prospectingService.brandContactCurrentPage,
      limit: this.prospectingService.brandContactContactLimit,
      drip_campaign_id: "",
      label_ids: [],
      contact_name: "",
      company_name: "",
      job_title: "",
      marketing_status: "",
      email_status: "",
      email: "",
      city: "",
      state: "",
      country: "",
      get_total_count: true,
      sort_by: "",
      sort_type: "",
    };
  };

  handleSubmit = async () => {
    this.submitted = true;
    // this.setSelectedLabelIds();

    // Validation
    if (!this.selectedDripCampaign["value"]) return;

    let postData;
    const getContactApiPostData = this.getContactsApiPayload();
    this.isLoading = true;
    try {
      let contacts: any = [];
      contacts = this.parseContactDetails(this.selectedContacts);

      // Edit Contact(s)
      postData = this.setAndGetEditMultipleContactApiPayload();
      if (this.prospectingService.selectedAllContacts) {
        postData["selected_all_contacts"] = "true";
        postData["selected_all_contacts_payload"] = getContactApiPostData;
        postData["contacts"] = [];
      }
      await this.prospectingService.editContacts(postData);

      const assignApiPostData = {
        supplier_id: this.userData.supplier_id,
        contacts,
        label_ids: [],
        notify: false,
        drip_campaign_id: this.addToDripCampaignId,
      };
      await this.dripCampaignService.assignContactsAndLabelsInCampaign(assignApiPostData);

      this.getAndSetLabels();
      await this.prospectingService.getContacts(getContactApiPostData, true);
      this.prospectingService.selectedContactsInContactsPage = [];

      Swal.fire("Done!", "Contact(s) added successfully!", "success");

      this.activeCanvas.dismiss("Cross click");
    } catch (e) {
      await Swal.fire("Error", e.message);
    } finally {
      this.isLoading = false;
    }
  };
}
