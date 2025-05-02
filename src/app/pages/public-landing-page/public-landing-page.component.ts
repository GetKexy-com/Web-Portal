import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpService } from 'src/app/services/http.service';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CampaignService } from 'src/app/services/campaign.service';
import { environment } from 'src/environments/environment';
import { constants } from 'src/app/helpers/constants';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { ProspectContact } from 'src/app/models/ProspectContact';
import Swal from 'sweetalert2';
import { lastValueFrom } from 'rxjs';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { ErrorMessageCardComponent } from '../../components/error-message-card/error-message-card.component';
import { KexyRichEditorComponent } from '../../components/kexy-rich-editor/kexy-rich-editor.component';
import { BrandConvoAvatarComponent } from '../../components/brand-convo-avatar/brand-convo-avatar.component';
import { LabelAndValueComponent } from '../../components/label-and-value/label-and-value.component';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LandingPage } from '../../models/LandingPage';

@Component({
  selector: 'app-public-landing-page',
  imports: [
    KexyButtonComponent,
    ErrorMessageCardComponent,
    KexyRichEditorComponent,
    BrandConvoAvatarComponent,
    LabelAndValueComponent,
    DatePipe,
    FormsModule,
    CommonModule,
  ],
  templateUrl: './public-landing-page.component.html',
  styleUrl: './public-landing-page.component.scss',
})
export class PublicLandingPageComponent implements OnInit {
  loading: boolean = true;
  promotionIdFromParams;
  params;
  restaurant_id: number;
  public landingPage: LandingPage;
  public readonly constants = constants;
  contactPerson = '';
  promotionTitleObj;
  promotionInnerDetailsObj;
  productObj;
  selectedConversation: ProspectContact;
  emailContent = '';
  userFullName = '';
  userEmailAddress = '';
  submitted: boolean = false;

  constructor(
    private httpService: HttpService,
    private activatedRoute: ActivatedRoute,
    private campaignService: CampaignService,
    private prospectingService: ProspectingService,
    private modal: NgbModal,
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.params = params;
      this.promotionIdFromParams = params['id'];
    });
  }

  async ngOnInit() {
    document.title = 'Landing Page - KEXY Brand Portal';

    // const isLoggedIn = !!this._authService.userTokenValue;
    // if(isLoggedIn) {
    //   await this.router.navigate([routeConstants.RESTAURANT.DEAL_DETAILS], {
    //     queryParams: { dealId: this.promotionIdFromParams },
    //   });
    //   return;
    // }

    // Promotion api call
    await this.getLandingPage();

    // Promotion title api call
    this.promotionTitleObj = this.landingPage.detail.title;


    // Product api call
    this.productObj = this.landingPage.detail.prospectingProduct;

    this.getCampaignTitleAndOtherData();
    this.setContactPerson();
    this.setBottomButtonsList();

    this.loading = false;
  }

  public buttonsList = [];
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

  purchaseUrl = '';
  contactNumber = '';
  getLandingPage = async () => {
    if (!this.promotionIdFromParams) {
      return false;
    }
    const postData = {
      id: this.promotionIdFromParams,
    };
    this.landingPage = await this.campaignService.getCampaignWithToken(postData);

    this.purchaseUrl = this.landingPage.contactInfo.transactionHandleUrl;

    const contactData = this.landingPage.contactInfo.questionReferredData;
    const index = contactData.findIndex(i => i.mobileNumber);
    if (index > -1) {
      this.contactNumber = `${contactData[index].phoneCode}${contactData[index].mobileNumber}`;
    }
  };

  promotionTitleText = '';
  promotionDetailsText = '';
  productText = '';
  getCampaignTitleAndOtherData = () => {
    // Setting campaign title text
    if (this.promotionTitleObj && Object.keys(this.promotionTitleObj).length) {
      this.promotionTitleText = this.promotionTitleObj.title || '';
    }

    // Setting campaign details text
    if (this.promotionInnerDetailsObj && Object.keys(this.promotionInnerDetailsObj).length) {
      this.promotionDetailsText = this.promotionInnerDetailsObj.inner_detail || '';
    }

    // Setting product text
    if (this.productObj && Object.keys(this.productObj).length) {
      this.productText = this.productObj.name || '';
    }
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

  setContactPerson = () => {
    let contactList = this.landingPage.contactInfo.questionReferredData;
    this.contactPerson = `${contactList[0].firstName || ''} ${contactList[0].lastName || ''}`;
    this.contactPerson = this.contactPerson.trim() || 'N/A';
  };

  ensureHttps = (url) => {
    // Check if the URL starts with "https://"
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      // If not, add "https://" to the beginning of the URL
      url = 'https://' + url;
    }
    return url;
  };


  purchaseBtnClick = () => {
    window.open(this.ensureHttps(this.purchaseUrl), '_blank');
  };

  callBtnClicked = () => {
    let mobileNumber = `tel: ${this.contactNumber}`;
    window.open(mobileNumber);
  };

  @ViewChild('sendEmailModal', { static: true }) sendEmailModal: ElementRef;
  handleBottomBtnClick = (btnObj) => {
    if (btnObj.label === constants.SEND_EMAIL) {
      this.sendMessageBtnClick(this.sendEmailModal);
      return;
    }
    if (btnObj.label === constants.SEND_MESSAGE_CALL_BTN_TEXT) {
      let mobileNumber = `tel: ${btnObj.value}`;
      window.open(mobileNumber, '_blank');
      return;
    }
    window.open(this.ensureHttps(btnObj.value), '_blank');
  };

  updatedEmailContent = '';
  onEmailContentChange = (editor) => {
    this.updatedEmailContent = editor.getData();
  };

  // addMessageToConversation = async () => {
  //   this.submitted = true;
  //
  //   const postData = {
  //     sender_name: this.userFullName,
  //     sender_email: this.userEmailAddress,
  //     sender_email_content: this.updatedEmailContent,
  //     receiver_user_id: this.landingPage.,
  //     product_name: this.productText,
  //   };
  //
  //   this.loading = true;
  //   const sendEmailApi = await this.httpService.post('prospect/sendEmailFromPromotionPublicUrl', postData);
  //   const res = await lastValueFrom(sendEmailApi);
  //   this.loading = false;
  //   if (res.success) {
  //     await Swal.fire({
  //       title: `Success!`,
  //       text: 'Email sent successfully.',
  //       icon: 'success',
  //     });
  //     this.userFullName = '';
  //     this.userEmailAddress = '';
  //     this.modalRef.close();
  //
  //   } else {
  //     await Swal.fire({
  //       title: `Error`,
  //       text: res.error.message,
  //       icon: 'warning',
  //     });
  //   }
  // };

  modalRef;
  sendMessageBtnClick = (modalContent) => {
    this.modalRef = this.modal.open(modalContent, { size: 'lg' });
  };
}
