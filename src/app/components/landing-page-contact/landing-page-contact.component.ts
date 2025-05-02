// import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
// import { constants } from "src/app/helpers/constants";
// import { NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import { AuthService } from "src/app/services/auth.service";
// import { HttpService } from "src/app/services/http.service";
// import { CampaignService } from "src/app/services/campaign.service";
// import { ActivatedRoute } from "@angular/router";
// import {FormsModule} from '@angular/forms';
// import {CampaignLayoutBottmBtnsComponent} from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
// import {PhoneNumberMaskDirective} from '../../directive/phone-number-mask.directive';
//
// @Component({
//   selector: 'landing-page-contact',
//   imports: [
//     FormsModule,
//     CampaignLayoutBottmBtnsComponent,
//     PhoneNumberMaskDirective
//   ],
//   templateUrl: './landing-page-contact.component.html',
//   styleUrl: './landing-page-contact.component.scss'
// })
// export class LandingPageContactComponent {
//   @Input() setWaitingFlagToTrue;
//   @Input() setWaitingFlagToFalse;
//   @Input() nextBtnClick;
//   @Input() backBtnClick;
//   public constants = constants;
//   public userData;
//   public submitted: boolean;
//   public personInfoList = [
//     {
//       firstName: "",
//       lastName: "",
//       email: "",
//       phoneCode: "+1",
//       mobileNumber: "",
//     },
//   ];
//   public isWaiting: boolean = true;
//   public landingPageId;
//   public stripeLoginUrl = "";
//   public isStripeReady;
//   public isAdmin;
//
//   constructor(
//     private _authService: AuthService,
//     private httpService: HttpService,
//     private campaignService: CampaignService,
//     private route: ActivatedRoute,
//   ) {
//   }
//
//   @ViewChild("stateSelectionModal") stateSelectionModalRef: ElementRef;
//
//   async ngOnInit() {
//     this.userData = this._authService.userTokenValue;
//     this.isAdmin = this.userData.role === constants.ADMIN;
//     this.route.queryParams.subscribe((params) => {
//       if (params["id"]) {
//         console.log("Inside ngOnInit and route subscription");
//         this.landingPageId = params["id"];
//       }
//     });
//
//     this.loginToStripeApiCall();
//
//     // Show previous data if any
//     let landingPageId = this.landingPageId;
//     if (landingPageId) {
//       await this.getCampaign();
//       this.showPreviousData();
//     }
//     this.isWaiting = false;
//   }
//
//   getCampaign = async () => {
//     let landingPageId = this.landingPageId;
//     console.log({ landingPageId });
//     if (!landingPageId) {
//       return false;
//     }
//     const postData = {
//       campaign_id: landingPageId,
//       supplier_id: this.userData.supplier_id,
//     };
//     await this.campaignService.getCampaign(postData);
//   };
//
//   showPreviousData = () => {
//     const contactInfoPageData = this.campaignService.getContactInfoPageData();
//     console.log("contactInfoPageData", contactInfoPageData);
//     if (Object.keys(contactInfoPageData).length == 0) return;
//
//     const contactData = contactInfoPageData["contactData"];
//     this.personInfoList = JSON.parse(contactData.customer_question_referred_data);
//   };
//
//   loginToStripeApiCall = async () => {
//     let stripeCheck = await this.httpService.get("payment/loginToStripe").toPromise();
//     if (stripeCheck.success) {
//       this.stripeLoginUrl = stripeCheck.data.url;
//       if (stripeCheck.data.type === "onboarding") {
//         this.isStripeReady = false;
//       } else if (stripeCheck.data.type === "login") {
//         this.isStripeReady = true;
//       }
//     }
//   };
//
//   handleClickBackButton = () => {
//     this.backBtnClick();
//   };
//
//   handleClickNextButton = async () => {
//     this.submitted = true;
//
//     // Api call
//     const editContactPayload = {
//       campaign_id: this.landingPageId,
//       transaction_handle_by: "",
//       distributor_transaction_handle_url: "",
//       customer_question_referred_data: JSON.stringify(this.personInfoList),
//       distributor_rep: "",
//       has_question_for_buyer: 0,
//     };
//
//     const questionData = {
//       supplier_id: this.userData.supplier_id,
//       question_list: [],
//     };
//
//     this.setWaitingFlagToTrue();
//     await this.campaignService.editContactInfo(editContactPayload, questionData);
//     this.setWaitingFlagToFalse();
//
//     // Proceed to next page
//     this.nextBtnClick();
//   };
// }

import { Component, inject, signal, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { constants } from 'src/app/helpers/constants';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { CampaignService } from 'src/app/services/campaign.service';
import { ActivatedRoute } from '@angular/router';
import {
  CampaignLayoutBottmBtnsComponent,
} from 'src/app/components/campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import { PhoneNumberMaskDirective } from 'src/app/directive/phone-number-mask.directive';
import { LandingPage } from '../../models/LandingPage';

interface PersonInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  mobileNumber: string;
}

interface ContactInfoPayload {
  landingPageId: string;
  transactionHandleBy?: string;
  transactionHandleUrl?: string;
  questionReferredData: string;
  distributorRep?: string;
  questionForBuyer: boolean;
}

interface QuestionData {
  supplier_id: string;
  question_list: any[];
}

@Component({
  selector: 'landing-page-contact',
  standalone: true,
  imports: [
    FormsModule,
    CampaignLayoutBottmBtnsComponent,
    PhoneNumberMaskDirective,
  ],
  templateUrl: './landing-page-contact.component.html',
  styleUrl: './landing-page-contact.component.scss',
})
export class LandingPageContactComponent implements OnInit {
  // Inputs
  @Input() setWaitingFlagToTrue!: () => void;
  @Input() setWaitingFlagToFalse!: () => void;
  @Input() nextBtnClick!: () => void;
  @Input() backBtnClick!: () => void;
  @Input() landingPage: LandingPage;

  private authService = inject(AuthService);
  private campaignService = inject(CampaignService);

  // State signals
  submitted = signal(false);
  isWaiting = signal(true);
  landingPageId = signal<string>('');
  isAdmin = signal(false);

  // Data
  personInfoList = signal<PersonInfo[]>([{
    firstName: '',
    lastName: '',
    email: '',
    phoneCode: '+1',
    mobileNumber: '',
  }]);

  // Constants
  public constants = constants;

  async ngOnInit() {
    const userData = this.authService.userTokenValue;
    console.log(this.landingPage);
    this.isAdmin.set(userData.role === constants.ADMIN);
    if(this.landingPage.contactInfo.questionReferredData) {
      this.personInfoList.set(this.landingPage.contactInfo.questionReferredData);
    }
    this.isWaiting.set(false);
  }

  handleClickBackButton = () => {
    this.backBtnClick();
  };

  handleClickNextButton = async () => {
    this.submitted.set(true);

    const editContactPayload: ContactInfoPayload = {
      landingPageId: this.landingPage.id.toString(),
      questionReferredData: JSON.stringify(this.personInfoList()),
      questionForBuyer: false,
    };

    const questionData: QuestionData = {
      supplier_id: this.authService.userTokenValue.supplier_id,
      question_list: [],
    };

    this.setWaitingFlagToTrue();
    try {
      await this.campaignService.editContactInfo(editContactPayload, questionData);
      this.nextBtnClick();
    } catch (error) {
      console.error('Error saving contact info:', error);
    } finally {
      this.setWaitingFlagToFalse();
    }
  };
}
