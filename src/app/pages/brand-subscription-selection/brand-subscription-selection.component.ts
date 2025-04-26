// import { Component, OnInit } from "@angular/core";
// import { AuthService } from "src/app/services/auth.service";
// import { Router } from "@angular/router";
// import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
// import { environment } from "src/environments/environment";
// import { constants } from "src/app/helpers/constants";
// import { HttpService } from "src/app/services/http.service";
// import { routeConstants } from "src/app/helpers/routeConstants";
// import Swal from "sweetalert2";
// import {LoginLayoutComponent} from '../../layouts/login-layout/login-layout.component';
// import {NgClass} from '@angular/common';
// import {FormsModule} from '@angular/forms';
// import {
//   PricePageSubscriptionTypeCardComponent
// } from '../../components/price-page-subscription-type-card/price-page-subscription-type-card.component';
// import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
// import {ProratedPriceInfoComponent} from '../../components/prorated-price-info/prorated-price-info.component';
//
// @Component({
//   selector: 'app-brand-subscription-selection',
//   imports: [
//     LoginLayoutComponent,
//     NgClass,
//     FormsModule,
//     PricePageSubscriptionTypeCardComponent,
//     KexyButtonComponent,
//     ProratedPriceInfoComponent
//   ],
//   templateUrl: './brand-subscription-selection.component.html',
//   styleUrl: './brand-subscription-selection.component.scss'
// })
// export class BrandSubscriptionSelectionComponent {
//   public isMonthlySelected: boolean = true;
//   public constants = constants;
//   public usersCount = 1;
//   public subscription;
//   public currentSubscriptionPlan;
//   public selectedSubscriptionCardData;
//   public userData;
//   public noviceSubscriptionData = { ...constants.NOVICE_SUBSCRIPTION_DATA };
//   public amateurSubscriptionData = { ...constants.AMATEUR_SUBSCRIPTION_DATA };
//   public proSubscriptionData = { ...constants.PRO_SUBSCRIPTION_DATA };
//   public enterpriseSubscriptionData = { ...constants.ENTERPRISE_SUBSCRIPTION_DATA };
//   public starterSubscriptionData = { ...constants.STARTER_SUBSCRIPTION_DATA };
//   public lifetimeSubscriptionData = { ...constants.LIFETIME_SUBSCRIPTION_DATA };
//   public prorationPrice = 0;
//   public supplier_id;
//   public proratedPriceInfoComponentLoading = false;
//
//   constructor(
//     private authService: AuthService,
//     private router: Router,
//     private modal: NgbModal,
//     private httpService: HttpService,
//   ) {
//   }
//
//   async ngOnInit() {
//     document.title = "Subscription - KEXY Brand Portal";
//     this.userData = this.authService.userTokenValue;
//     this.supplier_id = await localStorage.getItem(constants.SUPPLIER_ID);
//     this.currentSubscriptionPlan = {
//       name: "",
//       price: 0,
//     };
//   }
//
//   toggleSubscriptionRecurringType = () => {
//     this.isMonthlySelected = !this.isMonthlySelected;
//     this.changePriceBasedOnRecuringType();
//
//     if (this.selectedSubscriptionCardData && this.selectedSubscriptionCardData.subscriptionType !== constants.BRAND_PRESALE_LIFETIME) {
//       if (this.isMonthlySelected) {
//         this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount;
//       } else {
//         this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount * 12;
//       }
//     }
//   };
//
//   changePriceBasedOnRecuringType = () => {
//     if (this.isMonthlySelected) {
//       this.amateurSubscriptionData = {
//         ...this.amateurSubscriptionData,
//         price: constants.AMATEUR_SUBSCRIPTION_PRICE_MONTH,
//       };
//       this.proSubscriptionData = { ...this.proSubscriptionData, price: constants.PRO_SUBSCRIPTION_PRICE_MONTH };
//       this.starterSubscriptionData = {
//         ...this.starterSubscriptionData,
//         price: constants.STARTER_SUBSCRIPTION_PRICE_MONTH,
//       };
//     } else {
//       this.amateurSubscriptionData = {
//         ...this.amateurSubscriptionData,
//         price: constants.AMATEUR_SUBSCRIPTION_PRICE_YEAR,
//       };
//       this.proSubscriptionData = { ...this.proSubscriptionData, price: constants.PRO_SUBSCRIPTION_PRICE_YEAR };
//       this.starterSubscriptionData = {
//         ...this.starterSubscriptionData,
//         price: constants.STARTER_SUBSCRIPTION_PRICE_YEAR,
//       };
//     }
//
//     if (this.selectedSubscriptionCardData?.subscriptionType === this.amateurSubscriptionData.subscriptionType) {
//       this.selectedSubscriptionCardData = this.amateurSubscriptionData;
//     }
//     if (this.selectedSubscriptionCardData?.subscriptionType === this.proSubscriptionData.subscriptionType) {
//       this.selectedSubscriptionCardData = this.proSubscriptionData;
//     }
//     if (this.selectedSubscriptionCardData?.subscriptionType === this.starterSubscriptionData.subscriptionType) {
//       this.selectedSubscriptionCardData = this.starterSubscriptionData;
//     }
//   };
//
//   plusBtnClicked = () => {
//     this.usersCount++;
//
//     if (this.selectedSubscriptionCardData && this.selectedSubscriptionCardData.subscriptionType !== constants.BRAND_PRESALE_LIFETIME) {
//       if (this.isMonthlySelected) {
//         this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount;
//       } else {
//         this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount * 12;
//       }
//     } else {
//       this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount;
//     }
//   };
//
//   minusBtnClicked = () => {
//     this.usersCount--;
//     if (this.usersCount < 1) {
//       this.usersCount = 1;
//       return;
//     }
//
//     if (this.selectedSubscriptionCardData && this.selectedSubscriptionCardData.subscriptionType !== constants.BRAND_PRESALE_LIFETIME) {
//       if (this.isMonthlySelected) {
//         this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount;
//       } else {
//         this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount * 12;
//       }
//     } else {
//       this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount;
//     }
//   };
//
//   changePlanBtnClick = async () => {
//     let postData;
//     if (this.selectedSubscriptionCardData.title === constants.NOVICE) {
//       await this.addNoviceSubscriptionApi();
//       return;
//
//     } else if (this.selectedSubscriptionCardData.title === constants.LIFETIME_DEAL) {
//       postData = {
//         type: this.selectedSubscriptionCardData.subscriptionType,
//         supplier_id: this.supplier_id,
//         is_lifetime: "true",
//         reccuring: constants.MONTH,
//         payment_for: constants.ONETIME,
//         promotion_code: this.couponCode,
//         seats: this.usersCount,
//         success_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.WELCOME,
//         cancel_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.SUBSCRIPTION_SELECTION,
//       };
//
//       // if (!environment.LIFETIME_COUPONS.includes(this.couponCode)) {
//       //   postData["seats"] = this.userData;
//       // }
//
//     } else {
//       postData = {
//         type: this.selectedSubscriptionCardData.subscriptionType,
//         supplier_id: this.supplier_id,
//         reccuring: this.isMonthlySelected ? constants.MONTH : constants.YEAR,
//         payment_for: constants.SUBSCRIPTION,
//         success_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.WELCOME,
//         cancel_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.SUBSCRIPTION_SELECTION,
//         promotion_code: this.couponCode,
//         seats: this.usersCount,
//       };
//     }
//     await this.makePaymentForSubscriptionApi(postData);
//   };
//
//   makePaymentForSubscriptionApi = async (postData) => {
//     console.log(postData);
//     this.proratedPriceInfoComponentLoading = true;
//     this.httpService.post("payment/makePaymentForSubscription", postData).subscribe(res => {
//       if (res.success) {
//         window.location.href = res.data;
//       } else {
//         Swal.fire("Failed!", res.error.message, "error").then(() => {
//         });
//       }
//       this.proratedPriceInfoComponentLoading = false;
//     });
//   };
//
//   addNoviceSubscriptionApi = async () => {
//     this.proratedPriceInfoComponentLoading = true;
//     this.httpService.post("supplier/addNoviceSubscription", { supplier_id: this.supplier_id }).subscribe(res => {
//       if (res.success) {
//         this.router.navigate([routeConstants.BRAND.WELCOME]);
//       } else {
//         Swal.fire("Failed!", res.error.message, "error").then(() => {
//         });
//       }
//       this.proratedPriceInfoComponentLoading = false;
//     });
//   };
//
//   toggleSubscriptionSelectedBox = (data) => {
//     this.selectedSubscriptionCardData = data;
//     if (data.title === constants.LIFETIME_DEAL) {
//       this.lifetimeSubscriptionData.active = true;
//       this.noviceSubscriptionData.active = false;
//       this.amateurSubscriptionData.active = false;
//       this.proSubscriptionData.active = false;
//       this.prorationPrice = 0;
//     }
//     if (data.title === constants.NOVICE) {
//       this.noviceSubscriptionData.active = true;
//       this.amateurSubscriptionData.active = false;
//       this.proSubscriptionData.active = false;
//       this.lifetimeSubscriptionData.active = false;
//       this.prorationPrice = 0;
//     }
//     // if (data.title === constants.STARTER) {
//     //   this.noviceSubscriptionData.active = false;
//     //   this.amateurSubscriptionData.active = false;
//     //   this.proSubscriptionData.active = false;
//     //   this.starterSubscriptionData.active = true;
//     // }
//     if (data.title === constants.AMATEUR) {
//       this.noviceSubscriptionData.active = false;
//       this.amateurSubscriptionData.active = true;
//       this.proSubscriptionData.active = false;
//       this.lifetimeSubscriptionData.active = false;
//     }
//     if (data.title === constants.PRO) {
//       this.noviceSubscriptionData.active = false;
//       this.amateurSubscriptionData.active = false;
//       this.proSubscriptionData.active = true;
//       this.lifetimeSubscriptionData.active = false;
//     }
//
//     if (this.selectedSubscriptionCardData) {
//       if (this.isMonthlySelected) {
//         this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount;
//       } else {
//         this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount * 12;
//       }
//
//       if (this.selectedSubscriptionCardData.subscriptionType === constants.BRAND_PRESALE_LIFETIME) {
//         this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount;
//       }
//     }
//   };
//
//   scheduleCallTap = () => {
//     window.open(constants.KEXY_CALENDLY_URL);
//   };
//
//   couponCode = "";
//   handlecouponInputChange = (value) => {
//     this.couponCode = value;
//   };
// }

import { Component, OnInit, signal, computed } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from "src/environments/environment";
import { constants } from '../../helpers/constants';
import { HttpService } from '../../services/http.service';
import { routeConstants } from '../../helpers/routeConstants';
import Swal from 'sweetalert2';
import { LoginLayoutComponent } from '../../layouts/login-layout/login-layout.component';
import { FormsModule } from '@angular/forms';
import { PricePageSubscriptionTypeCardComponent } from '../../components/price-page-subscription-type-card/price-page-subscription-type-card.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { ProratedPriceInfoComponent } from '../../components/prorated-price-info/prorated-price-info.component';

@Component({
  selector: 'app-brand-subscription-selection',
  standalone: true,
  imports: [
    LoginLayoutComponent,
    FormsModule,
    PricePageSubscriptionTypeCardComponent,
    KexyButtonComponent,
    ProratedPriceInfoComponent
  ],
  templateUrl: './brand-subscription-selection.component.html',
  styleUrl: './brand-subscription-selection.component.scss'
})
export class BrandSubscriptionSelectionComponent implements OnInit {
  public isMonthlySelected = signal<boolean>(true);
  public constants = constants;
  public usersCount = signal<number>(1);
  public currentSubscriptionPlan = signal<any>({ name: '', price: 0 });
  public selectedSubscriptionCardData = signal<any>(null);
  public userData: any;
  public prorationPrice = signal<number>(0);
  public supplier_id = signal<string>('');
  public proratedPriceInfoComponentLoading = signal<boolean>(false);
  public couponCode = signal<string>('');

  // Subscription data signals
  public noviceSubscriptionData = signal({ ...constants.NOVICE_SUBSCRIPTION_DATA });
  public amateurSubscriptionData = signal({ ...constants.AMATEUR_SUBSCRIPTION_DATA });
  public proSubscriptionData = signal({ ...constants.PRO_SUBSCRIPTION_DATA });
  public lifetimeSubscriptionData = signal({ ...constants.LIFETIME_SUBSCRIPTION_DATA });

  // Computed subscription data array
  public subscriptionData = computed(() => [
    this.noviceSubscriptionData(),
    this.amateurSubscriptionData(),
    this.proSubscriptionData(),
    this.lifetimeSubscriptionData()
  ]);

  constructor(
    private authService: AuthService,
    private router: Router,
    private modal: NgbModal,
    private httpService: HttpService,
  ) {}

  async ngOnInit() {
    document.title = 'Subscription - KEXY Brand Portal';
    this.userData = this.authService.userTokenValue;
    this.supplier_id.set(localStorage.getItem(constants.SUPPLIER_ID) ?? '');
  }

  toggleSubscriptionRecurringType = () => {
    this.isMonthlySelected.update(val => !val);
    this.changePriceBasedOnRecuringType();

    if (this.selectedSubscriptionCardData() && this.selectedSubscriptionCardData().subscriptionType !== constants.BRAND_PRESALE_LIFETIME) {
      this.updateProrationPrice();
    }
  };

  changePriceBasedOnRecuringType = () => {
    if (this.isMonthlySelected()) {
      this.amateurSubscriptionData.update(data => ({
        ...data,
        price: constants.AMATEUR_SUBSCRIPTION_PRICE_MONTH
      }));
      this.proSubscriptionData.update(data => ({
        ...data,
        price: constants.PRO_SUBSCRIPTION_PRICE_MONTH
      }));
    } else {
      this.amateurSubscriptionData.update(data => ({
        ...data,
        price: constants.AMATEUR_SUBSCRIPTION_PRICE_YEAR
      }));
      this.proSubscriptionData.update(data => ({
        ...data,
        price: constants.PRO_SUBSCRIPTION_PRICE_YEAR
      }));
    }

    const selectedData = this.selectedSubscriptionCardData();
    if (selectedData) {
      if (selectedData.subscriptionType === this.amateurSubscriptionData().subscriptionType) {
        this.selectedSubscriptionCardData.set(this.amateurSubscriptionData());
      }
      if (selectedData.subscriptionType === this.proSubscriptionData().subscriptionType) {
        this.selectedSubscriptionCardData.set(this.proSubscriptionData());
      }
    }
  };

  plusBtnClicked = () => {
    this.usersCount.update(count => count + 1);
    this.updateProrationPrice();
  };

  minusBtnClicked = () => {
    this.usersCount.update(count => {
      const newCount = count - 1;
      return newCount < 1 ? 1 : newCount;
    });
    this.updateProrationPrice();
  };

  private updateProrationPrice() {
    const selectedData = this.selectedSubscriptionCardData();
    if (!selectedData) return;

    if (selectedData.subscriptionType === constants.BRAND_PRESALE_LIFETIME) {
      this.prorationPrice.set(selectedData.price * this.usersCount());
    } else {
      const multiplier = this.isMonthlySelected() ? 1 : 12;
      this.prorationPrice.set(selectedData.price * this.usersCount() * multiplier);
    }
  }

  changePlanBtnClick = async () => {
    const selectedData = this.selectedSubscriptionCardData();
    if (!selectedData) return;

    if (selectedData.title === constants.NOVICE) {
      await this.addNoviceSubscriptionApi();
      return;
    }

    const postData = {
      type: selectedData.subscriptionType,
      companyId: this.supplier_id(),
      isLifetime: selectedData.title === constants.LIFETIME_DEAL ? "true" : undefined,
      recuring: this.isMonthlySelected() ? constants.MONTH : constants.YEAR,
      paymentFor: selectedData.title === constants.LIFETIME_DEAL ? constants.ONETIME : constants.SUBSCRIPTION,
      promotionCode: this.couponCode(),
      seats: this.usersCount(),
      successUrl: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.WELCOME,
      cancelUrl: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.SUBSCRIPTION_SELECTION,
    };

    await this.makePaymentForSubscriptionApi(postData);
  };

  makePaymentForSubscriptionApi = async (postData: any) => {
    this.proratedPriceInfoComponentLoading.set(true);
    this.httpService.post("subscriptions/checkout", postData).subscribe({
      next: (res) => {
        console.log('payment response', res);
        if (res.success) {
          window.location.href = res.data.session.url;
        } else {
          Swal.fire("Failed!", res.error.message, "error");
        }
      },
      error: (err) => {
        Swal.fire("Error!", "An error occurred while processing your request", "error");
      },
      complete: () => {
        this.proratedPriceInfoComponentLoading.set(false);
      }
    });
  };

  addNoviceSubscriptionApi = async () => {
    this.proratedPriceInfoComponentLoading.set(true);
    this.httpService.post("subscriptions/novice", { companyId: this.supplier_id() }).subscribe({
      next: (res) => {
        if (res.success) {
          this.router.navigate([routeConstants.BRAND.WELCOME]);
        } else {
          Swal.fire("Failed!", res.error.message, "error");
        }
      },
      error: (err) => {
        Swal.fire("Error!", "An error occurred while processing your request", "error");
      },
      complete: () => {
        this.proratedPriceInfoComponentLoading.set(false);
      }
    });
  };

  toggleSubscriptionSelectedBox = (data: any) => {
    this.selectedSubscriptionCardData.set(data);

    // Update active states
    this.noviceSubscriptionData.update(d => ({ ...d, active: data.title === constants.NOVICE }));
    this.amateurSubscriptionData.update(d => ({ ...d, active: data.title === constants.AMATEUR }));
    this.proSubscriptionData.update(d => ({ ...d, active: data.title === constants.PRO }));
    this.lifetimeSubscriptionData.update(d => ({ ...d, active: data.title === constants.LIFETIME_DEAL }));

    this.updateProrationPrice();
  };

  scheduleCallTap = () => {
    window.open(constants.KEXY_CALENDLY_URL);
  };

  handlecouponInputChange = (value: string) => {
    this.couponCode.set(value);
  };
}
