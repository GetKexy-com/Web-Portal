// import { Component, Input, inject } from '@angular/core';
// import {NgxSliderModule, Options} from "@angular-slider/ngx-slider";
// import { lastValueFrom } from "rxjs";
// import { constants } from "../../helpers/constants";
// import Swal from "sweetalert2";
// import { HttpService } from "../../services/http.service";
// import { AuthService } from "../../services/auth.service";
// import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
// import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
// import {CurrencyPipe} from '@angular/common';
// import {FormsModule} from '@angular/forms';
//
// const creditPurchasePriceMap = [
//   { credit: 0, price: 0.0 },
//   { credit: 1000, price: 1000 },
//   { credit: 2500, price: 2500 },
//   { credit: 5000, price: 5000 },
//   { credit: 10000, price: 10000 },
//   { credit: 25000, price: 25000 },
// ];
//
// @Component({
//   selector: 'purchase-additioanl-credit-modal-content',
//   imports: [
//     KexyButtonComponent,
//     CurrencyPipe,
//     NgxSliderModule,
//     FormsModule
//   ],
//   templateUrl: './purchase-additioanl-credit-modal-content.component.html',
//   styleUrl: './purchase-additioanl-credit-modal-content.component.scss'
// })
// export class PurchaseAdditioanlCreditModalContentComponent {
//   @Input() modalClose;
//   creditsToPurchase: number = 1000;
//   creditsPrice: number = 0;
//   creditsPriceOptions: Options = {
//     showTicksValues: true,
//     stepsArray: [
//       { value: 0, legend: "0" },
//       { value: 1000, legend: "1,000" },
//       { value: 2500, legend: "2,500" },
//       { value: 5000, legend: "5,000" },
//       { value: 10000, legend: "10,000" },
//       { value: 25000, legend: "25,000" },
//     ],
//   };
//   isLoading: boolean = false;
//   couponCode: string = "";
//   userData;
//   subscription;
//   creditsInfo;
//   additionalCreditUsage = constants.ADDITIONAL_CREDIT_INFO;
//   initialLoading: boolean = true;
//   activeModal = inject(NgbActiveModal);
//
//   constructor(private httpService: HttpService, private authService: AuthService) {}
//
//   async ngOnInit() {
//     this.userData = this.authService.userTokenValue;
//     this.userOrganisationApiCall();
//     this.creditValueChange(this.creditsToPurchase);
//     this.initialLoading = false;
//   }
//
//   userOrganisationApiCall = async () => {
//     this.subscription = await this.authService.getSubscriptionData(true);
//     console.log(this.subscription);
//     // this.monthlyCreditUsage = { ...this.monthlyCreditUsage, ...this.subscription.subscription_credits[0] };
//     this.additionalCreditUsage = { ...this.additionalCreditUsage, ...this.subscription.subscription_additional_credits };
//     this.creditsInfo = this.subscription.subscription_credits[this.subscription.subscription_credits.length - 1];
//   };
//
//   creditValueChange = (newCredits: number) => {
//     this.creditsToPurchase = newCredits;
//     this.creditsPrice = creditPurchasePriceMap.find(p => p.credit === newCredits).price;
//   };
//
//   purchaseAdditionalCreditsTapped = async () => {
//     const creditsType = this.creditsPriceOptions.stepsArray.find(p => p.value === this.creditsToPurchase).legend;
//     const postData = {
//       credits_type: creditsType,
//       supplier_id: this.userData.supplier_id,
//       subscription_id: this.subscription.id,
//       promotion_code: this.couponCode,
//     };
//     this.isLoading = true;
//     const paymentForSubscriptionResponse = this.httpService
//       .post("payment/makePaymentForAdditionalCredits", postData);
//     const res = await lastValueFrom(paymentForSubscriptionResponse);
//     console.log(res.data);
//     this.isLoading = false;
//     if (res.success) {
//       localStorage.setItem(constants.ADDITIONAL_CREDIT_PURCHASE, "true");
//       localStorage.setItem(constants.CURRENT_ADDITIONAL_CREDIT, this.additionalCreditUsage.total_credits.toString());
//
//       this.activeModal.close();
//       window.open(res.data, "_blank");
//     } else {
//       console.log(res);
//       Swal.fire("Error", res.error.message);
//     }
//   };
//
//   talkButtonTap = () => {
//     window.open(constants.KEXY_CALENDLY_URL);
//   };
// }

import {Component, inject, OnInit, signal} from '@angular/core';
import { NgxSliderModule, Options } from "@angular-slider/ngx-slider";
import { lastValueFrom } from "rxjs";
import { constants } from "../../helpers/constants";
import Swal from "sweetalert2";
import { HttpService } from "../../services/http.service";
import { AuthService } from "../../services/auth.service";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {environment} from '../../../environments/environment';
import {routeConstants} from '../../helpers/routeConstants';

interface CreditPrice {
  credit: number;
  price: number;
}

@Component({
  selector: 'purchase-additioanl-credit-modal-content',
  standalone: true,
  imports: [
    KexyButtonComponent,
    CurrencyPipe,
    NgxSliderModule,
    FormsModule,
  ],
  templateUrl: './purchase-additioanl-credit-modal-content.component.html',
  styleUrl: './purchase-additioanl-credit-modal-content.component.scss'
})
export class PurchaseAdditioanlCreditModalContentComponent implements OnInit {
  // Services
  private httpService = inject(HttpService);
  private authService = inject(AuthService);
  activeModal = inject(NgbActiveModal);

  // Constants
  private readonly creditPurchasePriceMap: CreditPrice[] = [
    { credit: 0, price: 0.0 },
    { credit: 1000, price: 1000 },
    { credit: 2500, price: 2500 },
    { credit: 5000, price: 5000 },
    { credit: 10000, price: 10000 },
    { credit: 25000, price: 25000 },
  ];

  // State signals
  creditsToPurchase = signal(1000);
  creditsPrice = signal(0);
  isLoading = signal(false);
  initialLoading = signal(true);
  couponCode = signal("");
  creditsInfo = signal<any>(null);
  subscription = signal<any>(null);
  additionalCreditUsage = signal(constants.ADDITIONAL_CREDIT_INFO);

  // Slider configuration
  readonly creditsPriceOptions: Options = {
    showTicksValues: true,
    stepsArray: [
      { value: 0, legend: "0" },
      { value: 1000, legend: "1,000" },
      { value: 2500, legend: "2,500" },
      { value: 5000, legend: "5,000" },
      { value: 10000, legend: "10,000" },
      { value: 25000, legend: "25,000" },
    ],
  };

  async ngOnInit(): Promise<void> {
    try {
      await this.userOrganisationApiCall();
      this.creditValueChange(this.creditsToPurchase());
    } catch (error) {
      console.error('Failed to initialize component:', error);
      Swal.fire('Error', 'Failed to load credit information', 'error');
    } finally {
      this.initialLoading.set(false);
    }
  }

  private async userOrganisationApiCall(): Promise<void> {
    const subscriptionData = await this.authService.getSubscriptionData(true);
    this.subscription.set(subscriptionData);
    console.log('subscriptionData', subscriptionData);

    this.additionalCreditUsage.set({
      ...this.additionalCreditUsage(),
      ...subscriptionData.additionalCredits
    });

    const lastCreditInfo = subscriptionData.credits.at(-1);
    this.creditsInfo.set(lastCreditInfo);
  }

  creditValueChange(newCredits: number): void {
    this.creditsToPurchase.set(newCredits);
    const priceInfo = this.creditPurchasePriceMap.find(p => p.credit === newCredits);
    this.creditsPrice.set(priceInfo ? priceInfo.price : 0);
  }

  async purchaseAdditionalCreditsTapped(): Promise<void> {
    if (this.creditsToPurchase() < 1) return;

    const creditsType = this.creditsPriceOptions.stepsArray
      .find(p => p.value === this.creditsToPurchase())?.legend;

    if (!creditsType) {
      Swal.fire('Error', 'Invalid credit selection', 'error');
      return;
    }

    const postData = {
      creditsType: creditsType,
      companyId: this.authService.userTokenValue.supplier_id,
      subscriptionId: this.subscription()?.id,
      promotionCode: this.couponCode(),
      successUrl: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.SUBSCRIPTION,
      cancelUrl: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.SUBSCRIPTION
    };

    this.isLoading.set(true);

    try {
      const paymentResponse = await lastValueFrom(
        this.httpService.post("subscriptions/checkout-additional-credits", postData)
      );
      console.log(paymentResponse)

      if (paymentResponse.success) {
        localStorage.setItem(constants.ADDITIONAL_CREDIT_PURCHASE, "true");
        localStorage.setItem(
          constants.CURRENT_ADDITIONAL_CREDIT,
          this.additionalCreditUsage().total_credits.toString()
        );

        this.activeModal.close();
        window.open(paymentResponse.data.session.url, "_blank");
      } else {
        Swal.fire("Error", paymentResponse.error?.message || 'Payment failed');
      }
    } catch (error) {
      console.error("Payment error:", error);
      Swal.fire("Error", "Failed to process payment");
    } finally {
      this.isLoading.set(false);
    }
  }

  talkButtonTap(): void {
    window.open(constants.KEXY_CALENDLY_URL, "_blank");
  }
}
