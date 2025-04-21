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
//   selector: 'campaign-contact-info-form-content',
//   imports: [
//     FormsModule,
//     CampaignLayoutBottmBtnsComponent,
//     PhoneNumberMaskDirective
//   ],
//   templateUrl: './campaign-contact-info-form-content.component.html',
//   styleUrl: './campaign-contact-info-form-content.component.scss'
// })
// export class CampaignContactInfoFormContentComponent {
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
//   public campaignId;
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
//         this.campaignId = params["id"];
//       }
//     });
//
//     this.loginToStripeApiCall();
//
//     // Show previous data if any
//     let campaignId = this.campaignId;
//     if (campaignId) {
//       await this.getCampaign();
//       this.showPreviousData();
//     }
//     this.isWaiting = false;
//   }
//
//   getCampaign = async () => {
//     let campaignId = this.campaignId;
//     console.log({ campaignId });
//     if (!campaignId) {
//       return false;
//     }
//     const postData = {
//       campaign_id: campaignId,
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
//       campaign_id: this.campaignId,
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

import {Component, inject, signal, Input, OnInit} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { constants } from 'src/app/helpers/constants';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { CampaignService } from 'src/app/services/campaign.service';
import { ActivatedRoute } from '@angular/router';
import { CampaignLayoutBottmBtnsComponent } from 'src/app/components/campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import { PhoneNumberMaskDirective } from 'src/app/directive/phone-number-mask.directive';

interface PersonInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  mobileNumber: string;
}

interface ContactInfoPayload {
  campaign_id: string;
  transaction_handle_by: string;
  distributor_transaction_handle_url: string;
  customer_question_referred_data: string;
  distributor_rep: string;
  has_question_for_buyer: number;
}

interface QuestionData {
  supplier_id: string;
  question_list: any[];
}

@Component({
  selector: 'campaign-contact-info-form-content',
  standalone: true,
  imports: [
    FormsModule,
    CampaignLayoutBottmBtnsComponent,
    PhoneNumberMaskDirective
  ],
  templateUrl: './campaign-contact-info-form-content.component.html',
  styleUrl: './campaign-contact-info-form-content.component.scss'
})
export class CampaignContactInfoFormContentComponent implements OnInit {
  // Inputs
  @Input() setWaitingFlagToTrue!: () => void;
  @Input() setWaitingFlagToFalse!: () => void;
  @Input() nextBtnClick!: () => void;
  @Input() backBtnClick!: () => void;

  // Services
  private authService = inject(AuthService);
  private httpService = inject(HttpService);
  private campaignService = inject(CampaignService);
  private route = inject(ActivatedRoute);

  // State signals
  submitted = signal(false);
  isWaiting = signal(true);
  campaignId = signal<string>('');
  stripeLoginUrl = signal<string>('');
  isStripeReady = signal<boolean | null>(null);
  isAdmin = signal(false);

  // Data
  personInfoList = signal<PersonInfo[]>([{
    firstName: "",
    lastName: "",
    email: "",
    phoneCode: "+1",
    mobileNumber: "",
  }]);

  // Constants
  public constants = constants;

  async ngOnInit() {
    const userData = this.authService.userTokenValue;
    this.isAdmin.set(userData.role === constants.ADMIN);

    this.route.queryParams.subscribe(params => {
      if (params["id"]) {
        this.campaignId.set(params["id"]);
      }
    });

    await this.loginToStripeApiCall();

    // Show previous data if any
    const campaignId = this.campaignId();
    if (campaignId) {
      await this.getCampaign();
      this.showPreviousData();
    }
    this.isWaiting.set(false);
  }

   getCampaign = async ()=> {
    const campaignId = this.campaignId();
    if (!campaignId) return false;

    const postData = {
      campaign_id: campaignId,
      supplier_id: this.authService.userTokenValue.supplier_id,
    };
    await this.campaignService.getCampaign(postData);
  }

  showPreviousData = () => {
    const contactInfoPageData = this.campaignService.getContactInfoPageData();
    if (!contactInfoPageData || Object.keys(contactInfoPageData).length === 0) return;

    const contactData = contactInfoPageData["contactData"];
    try {
      const parsedData = JSON.parse(contactData.customer_question_referred_data);
      this.personInfoList.set(Array.isArray(parsedData) ? parsedData : [parsedData]);
    } catch (e) {
      console.error('Error parsing contact data:', e);
    }
  }

   loginToStripeApiCall = async () => {
    try {
      const stripeCheck = await this.httpService.get("payment/loginToStripe").toPromise();
      if (stripeCheck.success) {
        this.stripeLoginUrl.set(stripeCheck.data.url);
        this.isStripeReady.set(stripeCheck.data.type === "login");
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
    }
  }

  handleClickBackButton = () => {
    this.backBtnClick();
  }

   handleClickNextButton = async () => {
    this.submitted.set(true);

    const editContactPayload: ContactInfoPayload = {
      campaign_id: this.campaignId(),
      transaction_handle_by: "",
      distributor_transaction_handle_url: "",
      customer_question_referred_data: JSON.stringify(this.personInfoList()),
      distributor_rep: "",
      has_question_for_buyer: 0,
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
  }
}
