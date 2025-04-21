import { Component, OnInit, Input } from "@angular/core";
import { CampaignService } from "src/app/services/campaign.service";
import { constants } from "src/app/helpers/constants";
import { environment } from "src/environments/environment";
import { AuthService } from "../../services/auth.service";
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {CommonModule, DatePipe} from '@angular/common';
import {LabelAndValueComponent} from '../label-and-value/label-and-value.component';

@Component({
  selector: 'desktop-preview',
  imports: [
    KexyButtonComponent,
    DatePipe,
    LabelAndValueComponent,
    CommonModule,
  ],
  templateUrl: './desktop-preview.component.html',
  styleUrl: './desktop-preview.component.scss'
})
export class DesktopPreviewComponent implements OnInit {
  @Input() campaignTitleText: string = "";
  @Input() campaignDetailsText: string = "";
  @Input() productText: string = "";
  public readonly constants = constants;
  public distributorName: string = "";
  public repName: string = "";
  public imageUrl = "";
  public pageData;
  public products;
  public userData;
  public contactPerson: string = "";
  public buttonsList = [];

  constructor(private campaignService: CampaignService, private _authService: AuthService,) {}

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;
    this.pageData = this.campaignService.getPreviewPageData();
    // this.setDistributorAndRep();
    this.setContactPerson();
    console.log("pageData", this.pageData);
    this.setBottomButtonsList();
  }

  setBottomButtonsList = () => {
    const campaignDetails = this.pageData.campaign_detail;
    const campaignContactInfo = JSON.parse(this.pageData.campaign_contact_info.customer_question_referred_data);
    const contactNumber = campaignContactInfo[0]["mobileNumber"];
    const contactEmail = campaignContactInfo[0]["email"];

    if (campaignDetails.purchase_url) this.buttonsList.push({ label: constants.PURCHASE_BTN_TEXT, value: campaignDetails.purchase_url });
    if (campaignDetails.visit_website) this.buttonsList.push({ label: constants.VISIT_WEBSITE_BTN_TEXT, value: campaignDetails.visit_website });
    if (contactNumber) this.buttonsList.push({ label: constants.SEND_MESSAGE_CALL_BTN_TEXT, value: contactNumber });
    if (contactEmail) this.buttonsList.push({ label: constants.SEND_EMAIL, value: contactEmail });
    if (campaignDetails.custom_button_url && campaignDetails.custom_button_label) this.buttonsList.push({ label: campaignDetails.custom_button_label, value: campaignDetails.custom_button_url });
  }

  setContactPerson = () => {
    let contactList = JSON.parse(this.pageData.campaign_contact_info.customer_question_referred_data);
    this.contactPerson = `${contactList[0].firstName || ""} ${contactList[0].lastName || ""}`;
    this.contactPerson = this.contactPerson.trim() || "N/A";
  }

  public getImageUrl = () => {
    return `${environment.imageUrl}${this.pageData.campaign_detail.campaign_image}`;
  };

  // public setDistributorAndRep = () => {
  //   console.log("distributorAndRep", this.pageData?.campaign_contact_info);
  //   const distributorAndRep = JSON.parse(this.pageData?.campaign_contact_info?.distributor_rep);
  //   if (distributorAndRep.length && !distributorAndRep[0].distributor) return;
  //
  //   this.distributorName = distributorAndRep[0].distributor?.value;
  //   this.repName = distributorAndRep[0].rep[1]?.value;
  // };

  playVideoBtnClick = () => {
    window.open(this.pageData.campaign_detail['campaign_video'], '_blank');
  }

  productInfoSheetBtnClick = () => {
    window.open(`${environment['imageUrl']}${this.pageData.campaign_detail['sales_sheet']}`, '_blank');
  }
}
