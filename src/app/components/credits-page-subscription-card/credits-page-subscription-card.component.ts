// import { Component, Input, OnInit } from "@angular/core";
// import { Router } from "@angular/router";
// import { routeConstants } from "../../helpers/routeConstants";
// import { HttpService } from "../../services/http.service";
// import { lastValueFrom } from "rxjs";
// import { constants } from "../../helpers/constants";
// import Swal from "sweetalert2";
// import { environment } from "../../../environments/environment";
// import { AuthService } from "../../services/auth.service";
// import { SubscriptionService } from "../../services/subscription.service";
// import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
// import {CurrencyPipe} from '@angular/common';
//
// @Component({
//   selector: 'credits-page-subscription-card',
//   imports: [
//     KexyButtonComponent,
//     CurrencyPipe
//   ],
//   templateUrl: './credits-page-subscription-card.component.html',
//   styleUrl: './credits-page-subscription-card.component.scss'
// })
// export class CreditsPageSubscriptionCardComponent {
//   @Input() subscription;
//   productDetails;
//   recurringType = "/ Monthly Fee (per user)";
//   creditsInfo;
//   userData;
//   pricePerUser: number = 0;
//   isLoading: boolean = false;
//   public discountPercent;
//
//   constructor(
//     private router: Router,
//     private httpService: HttpService,
//     private subscriptionService: SubscriptionService,
//     private authService: AuthService,
//   ) {
//   }
//
//   async ngOnInit() {
//     this.userData = this.authService.userTokenValue;
//     const paymentsLength = this.subscription.subscription_payments.length - 1;
//     this.productDetails = this.subscription.subscription_payments[paymentsLength];
//     this.discountPercent = await this.subscriptionService.getSubscriptionDiscount(this.subscription.id, this.userData.supplier_id);
//
//     this.getPricePerMonthForAUser();
//     if (!this.productDetails) {
//       this.productDetails.subscription_product = {
//         name: "Novice",
//         price: 0,
//       };
//     }
//     // this.__setRecurringType();
//     this.creditsInfo = this.subscription.subscription_credits[this.subscription.subscription_credits.length - 1];
//   }
//
//   getPricePerMonthForAUser = () => {
//     if (this.productDetails.subscription_product.name === constants.NOVICE) return "0";
//     if (
//       this.productDetails.subscription_product.type === constants.BRAND_299_MONTH_PER_USER ||
//       this.productDetails.subscription_product.type === constants.BRAND_PRESALE_LIFETIME
//     ) {
//       this.pricePerUser = this.productDetails.amount.toString();
//       return;
//     }
//
//     const stripeDetails = this.productDetails['stripe_details'] ? JSON.parse(this.productDetails['stripe_details']) : [];
//     let price = stripeDetails[stripeDetails.length - 1]["unit_amount"];
//     if (this.discountPercent) {
//       let discountedAmount = price * this.discountPercent;
//       price = price - discountedAmount;
//     }
//
//     if(this.subscription.product_name === constants.SUBSCRIPTION_YEAR) {
//       price = price / 12;
//       if (!this.discountPercent) {
//         let discountedAmount = price * 0.2;
//         price = price - discountedAmount;
//       }
//     }
//
//     this.pricePerUser =  price.toString();
//   }
//
//
//   changePlanBtnClick = async () => {
//     const isAllowed = await this.__hasPermission();
//     if (!isAllowed) {
//       return;
//     }
//     await this.router.navigate([routeConstants.BRAND.PRICE]);
//   };
//
//   __hasPermission = async () => {
//     if (this.userData.role !== constants.ADMIN) {
//       await Swal.fire("Error", "You are not authorized for this action.", "warning");
//       return false;
//     }
//
//     return true;
//   };
//
//   updatePaymentMethod = async () => {
//     const isAllowed = await this.__hasPermission();
//     if (!isAllowed) {
//       return;
//     }
//     this.isLoading = true;
//     const postData = {
//       success_url: environment.siteUrl + "/brand/subscriptions",
//       cancel_url: environment.siteUrl + "/brand/subscriptions",
//     };
//     const paymentForSubscriptionResponse = this.httpService
//       .post("payment/changePaymentMethod", postData);
//     const res = await lastValueFrom(paymentForSubscriptionResponse);
//     this.isLoading = false;
//     if (res.success) {
//       window.open(res.data);
//     } else {
//       Swal.fire("Error", res.error.message);
//     }
//
//   };
//   protected readonly constants = constants;
//   protected readonly parseInt = parseInt;
// }

import { Component, Input, OnInit, Signal, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { routeConstants } from '../../helpers/routeConstants';
import { HttpService } from '../../services/http.service';
import { lastValueFrom } from 'rxjs';
import { constants } from '../../helpers/constants';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { SubscriptionService } from '../../services/subscription.service';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'credits-page-subscription-card',
  standalone: true,
  imports: [
    KexyButtonComponent,
    CurrencyPipe
  ],
  templateUrl: './credits-page-subscription-card.component.html',
  styleUrl: './credits-page-subscription-card.component.scss'
})
export class CreditsPageSubscriptionCardComponent implements OnInit {
  // Services
  private router = inject(Router);
  private httpService = inject(HttpService);
  private subscriptionService = inject(SubscriptionService);
  private authService = inject(AuthService);

  // Input signal
  @Input({ required: true }) set subscription(value: any) {
    this._subscription.set(value);
    this.updateProductDetails();
  }
  get subscription(): Signal<any> {
    return this._subscription.asReadonly();
  }
  private _subscription = signal<any>(null);

  // State signals
  productDetails = signal<any>(null);
  recurringType = signal<string>('/ Monthly Fee (per user)');
  creditsInfo = signal<any>(null);
  pricePerUser = signal<string>('0');
  isLoading = signal<boolean>(false);
  discountPercent = signal<number | null>(null);

  // Computed properties
  userData = computed(() => this.authService.userTokenValue);

  async ngOnInit() {
    console.log('subscription', this._subscription());
    // this.discountPercent.set(
    //   await this.subscriptionService.getSubscriptionDiscount(
    //     this.subscription().id,
    //     this.userData().supplier_id
    //   )
    // );

    if (!this.productDetails()) {
      this.productDetails.set({
        subscriptionProduct: {
          name: "Novice",
          price: 0,
        }
      });
    }

    this.getPricePerMonthForAUser();

    this.creditsInfo.set(
      this.subscription().subscription_credits[
      this.subscription().subscription_credits.length - 1
        ]
    );
  }

  private updateProductDetails() {
    // const paymentsLength = this.subscription().subscription_payments.length - 1;
    this.productDetails.set(this.subscription().subscription_payments[0]);
    console.log('productDetails', this.productDetails());
  }

  getPricePerMonthForAUser() {
    if (this.productDetails().subscriptionProduct.name === constants.NOVICE) {
      this.pricePerUser.set('0');
      return;
    }

    if (
      this.productDetails().subscriptionProduct.type === constants.BRAND_299_MONTH_PER_USER ||
      this.productDetails().subscriptionProduct.type === constants.BRAND_PRESALE_LIFETIME
    ) {
      this.pricePerUser.set(this.productDetails().amount.toString());
      return;
    }

    const stripeDetails = this.productDetails()['stripeDetails']
      ? JSON.parse(this.productDetails()['stripeDetails'])
      : [];

    let price = stripeDetails[stripeDetails.length - 1]["unit_amount"];

    if (this.discountPercent()) {
      const discountedAmount = price * this.discountPercent()!;
      price = price - discountedAmount;
    }

    if (this.subscription().productName === constants.SUBSCRIPTION_YEAR) {
      price = price / 12;
      if (!this.discountPercent()) {
        const discountedAmount = price * 0.2;
        price = price - discountedAmount;
      }
    }

    this.pricePerUser.set(price.toString());
  }

  async changePlanBtnClick() {
    const isAllowed = await this.__hasPermission();
    if (!isAllowed) return;
    await this.router.navigate([routeConstants.BRAND.PRICE]);
  }

  private async __hasPermission(): Promise<boolean> {
    if (this.userData().role !== constants.ADMIN) {
      await Swal.fire("Error", "You are not authorized for this action.", "warning");
      return false;
    }
    return true;
  }

  async updatePaymentMethod() {
    const isAllowed = await this.__hasPermission();
    if (!isAllowed) return;

    this.isLoading.set(true);
    const postData = {
      success_url: environment.siteUrl + "/brand/subscriptions",
      cancel_url: environment.siteUrl + "/brand/subscriptions",
    };

    try {
      const paymentForSubscriptionResponse = this.httpService
        .post("payment/changePaymentMethod", postData);
      const res = await lastValueFrom(paymentForSubscriptionResponse);

      if (res.success) {
        window.open(res.data);
      } else {
        Swal.fire("Error", res.error.message);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  protected readonly constants = constants;
  protected readonly parseInt = parseInt;
}
