import { Component, OnInit, Input, Output } from '@angular/core';
import { CampaignService } from 'src/app/services/campaign.service';
import { constants } from 'src/app/helpers/constants';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../services/auth.service';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { CommonModule, DatePipe } from '@angular/common';
import { LabelAndValueComponent } from '../label-and-value/label-and-value.component';
import { LandingPage } from '../../models/LandingPage';

@Component({
  selector: 'desktop-preview',
  imports: [
    KexyButtonComponent,
    LabelAndValueComponent,
    CommonModule,
  ],
  templateUrl: './desktop-preview.component.html',
  styleUrl: './desktop-preview.component.scss',
})
export class DesktopPreviewComponent implements OnInit {
  @Input() campaignTitleText: string = '';
  @Input() campaignDetailsText: string = '';
  @Input() productText: string = '';
  @Input() landingPage: LandingPage;
  @Input() sendEmailBtnClickHander;
  public readonly constants = constants;
  public distributorName: string = '';
  public repName: string = '';
  public imageUrl = '';
  // public landingPage: LandingPage;
  public products;
  public userData;
  public contactPerson: string = '';
  public buttonsList = [];

  constructor(private campaignService: CampaignService, private _authService: AuthService) {
  }

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;
    // this.landingPage = this.campaignService.getLandingPage();
    this.setContactPerson();
    this.setBottomButtonsList();
  }

  setBottomButtonsList = () => {
    const campaignDetails = this.landingPage.detail;
    const campaignContactInfo = this.landingPage.contactInfo.questionReferredData;
    const contactNumber = campaignContactInfo[0]['mobileNumber'];
    const contactEmail = campaignContactInfo[0]['email'];

    if (campaignDetails.purchaseUrl) this.buttonsList.push({
      label: constants.PURCHASE_BTN_TEXT,
      value: campaignDetails.purchaseUrl,
    });
    if (campaignDetails.visitWebsite) this.buttonsList.push({
      label: constants.VISIT_WEBSITE_BTN_TEXT,
      value: campaignDetails.visitWebsite,
    });
    if (contactNumber) this.buttonsList.push({ label: constants.SEND_MESSAGE_CALL_BTN_TEXT, value: contactNumber });
    if (contactEmail) this.buttonsList.push({ label: constants.SEND_EMAIL, value: contactEmail });
    if (campaignDetails.customButtonUrl && campaignDetails.customButtonLabel) this.buttonsList.push({
      label: campaignDetails.customButtonLabel,
      value: campaignDetails.customButtonUrl,
    });
  };

  setContactPerson = () => {
    let contactList = this.landingPage.contactInfo.questionReferredData;
    this.contactPerson = `${contactList[0].firstName || ''} ${contactList[0].lastName || ''}`;
    this.contactPerson = this.contactPerson.trim() || 'N/A';
  };

  public getImageUrl = () => {
    return `${environment.imageUrl}${this.landingPage.detail.image}`;
  };


  playVideoBtnClick = () => {
    window.open(this.landingPage.detail.video, '_blank');
  };

  productInfoSheetBtnClick = () => {
    window.open(`${environment['imageUrl']}${this.landingPage.detail.salesSheet}`, '_blank');
  };
}
