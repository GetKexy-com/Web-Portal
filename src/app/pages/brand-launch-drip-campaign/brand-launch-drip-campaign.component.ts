import { Component, OnDestroy, OnInit } from "@angular/core";
import { routeConstants } from "src/app/helpers/routeConstants";
import { constants } from "src/app/helpers/constants";
import { DripCampaignService } from "src/app/services/drip-campaign.service";
import { AuthService } from "src/app/services/auth.service";
import { Subscription } from "rxjs";
import { ProspectingService } from "src/app/services/prospecting.service";
import Swal from "sweetalert2";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {KexySelectDropdownComponent} from '../../components/kexy-select-dropdown/kexy-select-dropdown.component';
import {ErrorMessageCardComponent} from '../../components/error-message-card/error-message-card.component';
import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
import {
  ProspectingCommonCardComponent
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import {
  PurchaseAdditioanlCreditModalContentComponent
} from '../../components/purchase-additioanl-credit-modal-content/purchase-additioanl-credit-modal-content.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-brand-launch-drip-campaign',
  imports: [
    BrandLayoutComponent,
    KexySelectDropdownComponent,
    ErrorMessageCardComponent,
    KexyButtonComponent,
    ProspectingCommonCardComponent,
    CommonModule,
  ],
  templateUrl: './brand-launch-drip-campaign.component.html',
  styleUrl: './brand-launch-drip-campaign.component.scss'
})
export class BrandLaunchDripCampaignComponent {
  public isWaitingFlag: boolean = false;

  public userData;
  public dripCampaignDropDownList = [];
  public selectedDripCampaign = "";
  public dripCampaignTitles;
  public dripCampaignList;
  public labelOptions = [];
  public monthlyCredits;
  public additionalCredits;
  public subscription;
  public contactList = [];
  public isLoading = false;
  public selectedLabelIds = [];
  public dripCampaignTitlesSubscription: Subscription;
  public contactLabelsSubscription: Subscription;
  public contactListSubscription: Subscription;

  constructor(
    private dripCampaignService: DripCampaignService,
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private modal: NgbModal,
  ) {
  }

  async ngOnInit() {
    document.title = "Launch Drip Campaign - KEXY Brand Portal";
    this.userData = this._authService.userTokenValue;

    // Get DripCampaigns
    await this.getAndSetDripCampaignTitleSubscription();
    await this.getDripCampaignsApiCall();

    // Get Labels
    this.getAndSetLabels();

    // getting credit info
    this.userOrganisationApiCall();
  }

  ngOnDestroy() {
    if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
    if (this.contactListSubscription) this.contactListSubscription.unsubscribe();
  }

  getAndSetDripCampaignTitleSubscription = async () => {
    await this.dripCampaignService.getAllDripCampaignTitle({ supplier_id: this.userData.supplier_id });

    this.dripCampaignTitlesSubscription = this.dripCampaignService.dripCampaignTitles.subscribe((dripCampaignTitles) => {
      this.dripCampaignTitles = dripCampaignTitles;
      this.dripCampaignTitles.map((i) => {
        i.value = i.title.length > 100 ? i.title.slice(0, 100) + "..." : i.title;
      });
    });
  };

  getDripCampaignsApiCall = async () => {
    this.dripCampaignList = await this.dripCampaignService.getListOfDripCampaignsWithoutPagination(true);
    if (this.dripCampaignList.length) {
      this.dripCampaignList = this.dripCampaignList.filter(i => {
        return (i.status === constants.PUBLISHED || i.status === constants.ACTIVE);
      });
    }

    if (this.dripCampaignList.length) {
      this.dripCampaignList.forEach(cam => {
        this.dripCampaignDropDownList.push({
          key: cam.id,
          value: this.getCampaignTitle(cam.drip_campaign_detail.drip_campaign_title_id),
          id: cam.id,
        });
      });
    } else {
      this.dripCampaignDropDownList = [];
    }
  };

  getCampaignTitle = (title_id) => {
    const index = this.dripCampaignTitles && this.dripCampaignTitles.findIndex(i => i.id.toString() === title_id.toString());
    if (index < 0) return;

    return this.dripCampaignTitles[index].title;
  };

  onDripCampaignSelect = async (selectedValue, index, rowIndex) => {
    this.selectedDripCampaign = selectedValue;
  };

  getAndSetLabels = () => {
    // Get Label
    this.prospectingService.getLists({ supplier_id: this.userData.supplier_id });

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.lists.subscribe((labels) => {
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

  handleMultiselectFunctionality = async (options, selectedValue) => {
    const i = options.indexOf(selectedValue);
    if (i > -1) {
      options[i].isSelected = !options[i].isSelected;
    }

    // get contacts based on lists
    if (this.isLabelSelected()) {
      this.isLoading = true;
      await this.getContacts();
      this.isLoading = false;
    } else {
      this.contactList = [];
    }
  };

  onLabelSelect = (selectedValue, index = null, rowIndex = null) => {
    this.handleMultiselectFunctionality(this.labelOptions, selectedValue);
  };

  userOrganisationApiCall = async () => {
    this.subscription = await this._authService.getSubscriptionData(true);
    if (!this.subscription) {
      return;
    }

    this.monthlyCredits = this.subscription.subscription_credits[0].current_credits;
    const additionalCreditInfo = this.subscription.subscription_additional_credits;
    this.additionalCredits = additionalCreditInfo.total_credits - additionalCreditInfo.used_credits;
  };

  isLabelSelected = () => {
    return this.labelOptions.some(i => i.isSelected);
  };

  getContacts = async () => {
    this.selectedLabelIds = [];
    this.labelOptions.forEach(i => {
      if (i.isSelected) {
        this.selectedLabelIds.push(i.id.toString());
      }
    });

    const postData = {
      supplier_id: this.userData.supplier_id,
      drip_campaign_id: "",
      label_ids: this.selectedLabelIds,
      contact_name: "",
      company_name: "",
      job_title: "",
      marketing_status: "",
      email_status: "",
      city: "",
      state: "",
      country: "",
      page: 1,
      limit: 99999,
      get_total_count: true,
      sort_by: "",
    };
    await this.prospectingService.getContacts(postData);

    this.contactListSubscription = this.prospectingService.contactRes.subscribe((data) => {
      this.contactList = [];
      this.contactList = data.contacts;
      this.setContactIdInDetailsInContacts();
    });
  };

  setContactIdInDetailsInContacts = () => {
    this.contactList.forEach(item => {
      let detailsObj = JSON.parse(item.details);

      // Add the id to the parsed details object
      detailsObj.id = item.id;

      // Stringify the updated details object back into a JSON string
      item.details = detailsObj;
    });
  };

  public submitted = false;
  launchDripCampaign = async () => {
    this.submitted = true;

    // Validation
    if (!this.selectedDripCampaign || !this.selectedLabelIds.length) return;

    this.isLoading = true;
    try {
      // assign api
      const assignContactPostData = {
        drip_campaign_id: this.selectedDripCampaign["id"],
        supplier_id: this.userData.supplier_id,
        contacts: this.contactList,
        label_ids: this.selectedLabelIds,
      };
      await this.dripCampaignService.assignContactsAndLabelsInCampaign(assignContactPostData);
      // reset form
      this.resetForm();

      await Swal.fire("Done!", "Campaign Launched Successfully!", "success");
      this.isLoading = false;

    } catch (e) {
      this.isLoading = false;
      await Swal.fire("Error", e.message);
    }
  };

  resetForm = () => {
    this.userOrganisationApiCall();
    this.getDripCampaignsApiCall();
    this.selectedDripCampaign = null;
    this.labelOptions.forEach(l => l.isSelected = false);
    this.contactList = [];
    this.submitted = false;
  };

  buyMoreBtnClick = () => {
    this.modal.open(PurchaseAdditioanlCreditModalContentComponent, { size: "lg" });
  };

  protected readonly routeConstants = routeConstants;
}
