import { Injectable } from "@angular/core";
import { AuthService } from "./auth.service";
import { constants } from "../helpers/constants";
import { environment } from "../../environments/environment";
import { routeConstants } from "../helpers/routeConstants";
import { HttpService } from "./http.service";
import { lastValueFrom } from "rxjs";
import { PageUiService } from "./page-ui.service";

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  userData: any;
  subscriptionDiscount: number;

  constructor(private _authService: AuthService, private http: HttpService, private pageUiService: PageUiService) {
  }

  // checkRestaurantFeatureAndSubscription = async (fetch = false) => {
  //   if (!this.userData) {
  //     this.userData = this._authService.userTokenValue;
  //   }
  //
  //   if (fetch) {
  //     const result = await this.getSubscriptionData({
  //       restaurant_id: this.userData.restaurant_id,
  //     });
  //     if (result["success"]) {
  //       this.userData.subscription = result["data"];
  //     }
  //     localStorage.setItem("userToken", JSON.stringify(this.userData));
  //     this.userData = this._authService.userTokenValue;
  //   }
  //
  //   const currentPage = this.pageUiService.getCurrentPageUrl();
  //
  //   const response = {
  //     hasFullAccess: null,
  //     cardRequired: null,
  //   };
  //
  //   let subscription = null;
  //   let activeFeature = !this.userData.active_feature ? constants.DEALS : this.userData.active_feature;
  //
  //   if (
  //     this.userData.subscription &&
  //     (this.userData.subscription.status === constants.ACTIVE ||
  //       this.userData.subscription.status === constants.TRIALING)
  //   ) {
  //     subscription = this.userData.subscription;
  //   }
  //
  //   if (subscription) {
  //     response.hasFullAccess = true;
  //   } else {
  //     if (activeFeature === constants.DEALS) {
  //       response.hasFullAccess = false;
  //       response.cardRequired = true;
  //     } else if (activeFeature === constants.DEALS_WITH_REPORTS) {
  //       response.cardRequired = false;
  //       // User with no subscription but feature deal with reports can access inventory
  //       response.hasFullAccess = currentPage.includes("/create-new-inventory");
  //     }
  //   }
  //
  //   return response;
  // };
  //
  // getSubscription = () => {
  //   if (this.userData.subscription) {
  //     return JSON.parse(this.userData.subscription);
  //   } else {
  //     return null;
  //   }
  // };
  //
  // getSubscriptionStatus = () => {
  //   this.userData = this._authService.userTokenValue;
  //   if (this.userData.subscription) {
  //     const sub = JSON.parse(this.userData.subscription);
  //     return sub.status;
  //   } else {
  //     return null;
  //   }
  // };
  //
  // getSubscriptionDiscount = async (subscriptionId, supplierId) => {
  //   if(this.subscriptionDiscount) {
  //     return this.subscriptionDiscount;
  //   }
  //   const res = await lastValueFrom(this.http.post("payment/getSubscriptionDataFromStripe", {subscription_id: subscriptionId, supplier_id: supplierId}));
  //   if (res.success && res.data?.discount?.coupon) {
  //     // Reduce price based on coupon
  //     this.subscriptionDiscount = res.data.discount.coupon.percent_off_precise / 100;
  //   } else {
  //     this.subscriptionDiscount = 0;
  //   }
  //   return this.subscriptionDiscount;
  //
  // }
  //
  // async onSubscribe(data: any) {
  //   const currentPage = this.pageUiService.getCurrentPageUrl() + "?subscribed=1";
  //
  //   let subscriptionData = {
  //     type: data.type,
  //     reccuring: data.selectedSubscriptionRecurringType,
  //     payment_for: constants.SUBSCRIPTION,
  //     paidEmployeeIds: [this.userData.id],
  //     promotion_code: data.couponCode,
  //     restaurant_id: data.company_id,
  //     trial_period_days: data.trialPeriodDays,
  //     card_required: data.cardRequired,
  //     success_url: environment.siteUrl + currentPage,
  //     cancel_url: environment.siteUrl + currentPage,
  //   };
  //
  //   let result = this.http.post("payment/makePaymentForSubscription", subscriptionData);
  //   return await lastValueFrom(result);
  // }

  // getSubscriptionData(data: any) {
  //   return new Promise((resolve, reject) => {
  //     let postData = {
  //       restaurant_id: data.restaurant_id,
  //     };
  //
  //     this.http.post("restaurant/getSubscriptionDetails", postData).subscribe((result) => {
  //       resolve(result);
  //     });
  //   });
  // }
}
