import { Component, OnInit } from "@angular/core";
import { constants } from "src/app/helpers/constants";
import { AuthService } from "src/app/services/auth.service";
import { environment } from "src/environments/environment";
import { routeConstants } from "src/app/helpers/routeConstants";
import { HttpService } from "src/app/services/http.service";
import { Router } from "@angular/router";
import Swal from "sweetalert2";
import { SubscriptionService } from "src/app/services/subscription.service";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {CommonModule, NgClass} from '@angular/common';
import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
import {FormsModule} from '@angular/forms';
import {
  PricePageSubscriptionTypeCardComponent
} from '../../components/price-page-subscription-type-card/price-page-subscription-type-card.component';
import {ProratedPriceInfoComponent} from '../../components/prorated-price-info/prorated-price-info.component';

@Component({
  selector: 'app-brand-price',
  imports: [
    BrandLayoutComponent,
    NgClass,
    KexyButtonComponent,
    FormsModule,
    PricePageSubscriptionTypeCardComponent,
    ProratedPriceInfoComponent,
    CommonModule
  ],
  templateUrl: './brand-price.component.html',
  styleUrl: './brand-price.component.scss'
})
export class BrandPriceComponent {
  public initialLoading: boolean = true;
  public isMonthlySelected: boolean = true;
  public constants = constants;
  public usersCount = 1;
  public subscription;
  public currentSubscriptionPlan;
  public selectedSubscriptionCardData;
  public userData;
  public noviceSubscriptionData = { ...constants.NOVICE_SUBSCRIPTION_DATA };
  public amateurSubscriptionData = { ...constants.AMATEUR_SUBSCRIPTION_DATA };
  public proSubscriptionData = { ...constants.PRO_SUBSCRIPTION_DATA };
  public enterpriseSubscriptionData = { ...constants.ENTERPRISE_SUBSCRIPTION_DATA };
  public starterSubscriptionData = { ...constants.STARTER_SUBSCRIPTION_DATA };
  public lifetimeSubscriptionData = { ...constants.LIFETIME_SUBSCRIPTION_DATA };
  public proratedApiResponse;
  public prorationPrice = 0;
  public prorationDate;
  public invitedUsersListCount;
  public latestSubscriptionPayments;
  public discountPercent;


  constructor(
    private authService: AuthService,
    private httpService: HttpService,
    private subscriptionService: SubscriptionService,
    private router: Router,
  ) {
  }

  async ngOnInit() {
    document.title = "Subscription Price - KEXY Brand Portal";
    this.userData = this.authService.userTokenValue;
    this.getUsersList();
    await this.userOrganisationApiCall();
    // await this.setPricePerUser();
    console.log("get");
    this.initialLoading = false;
  }

  userOrganisationApiCall = async () => {
    this.subscription = await this.authService.getSubscriptionData();
    const subscriptionPayments = this.subscription.subscription_payments;
    this.latestSubscriptionPayments = subscriptionPayments.length && subscriptionPayments[subscriptionPayments.length - 1];

    // this.latestSubscriptionPayments.amount = this.latestSubscriptionPayments.amount;
    console.log("latestSubscription", this.latestSubscriptionPayments);

    if (!this.latestSubscriptionPayments.subscription_product) {
      this.currentSubscriptionPlan = {
        name: constants.NOVICE,
        price: 0,
      };
      this.isMonthlySelected = true;
    } else {
      this.discountPercent = await this.subscriptionService.getSubscriptionDiscount(this.subscription.id, this.userData.supplier_id);

      if (this.subscription.product_name === constants.SUBSCRIPTION_MONTH) {
        this.isMonthlySelected = true;
      } else if (this.subscription.product_name === constants.SUBSCRIPTION_LIFETIME) {
        this.isMonthlySelected = true;
      } else {
        this.isMonthlySelected = false;
      }
      this.currentSubscriptionPlan = this.latestSubscriptionPayments.subscription_product;
    }
    this.usersCount = this.subscription.total_seats;
    // this.changePriceBasedOnRecuringType();

    if (this.currentSubscriptionPlan.name === constants.NOVICE) {
      this.toggleSubscriptionSelectedBox(this.noviceSubscriptionData);
      this.selectedSubscriptionCardData = this.noviceSubscriptionData;
    }
    if (this.currentSubscriptionPlan.name === constants.AMATEUR) {
      this.toggleSubscriptionSelectedBox(this.amateurSubscriptionData);
      this.selectedSubscriptionCardData = this.amateurSubscriptionData;
    }
    if (this.currentSubscriptionPlan.name === constants.STARTER) {
      this.toggleSubscriptionSelectedBox(this.starterSubscriptionData);
      this.selectedSubscriptionCardData = this.starterSubscriptionData;
    }
    if (this.currentSubscriptionPlan.name === constants.PRO) {
      this.toggleSubscriptionSelectedBox(this.proSubscriptionData);
      this.selectedSubscriptionCardData = this.proSubscriptionData;
    }
    if (this.currentSubscriptionPlan.name === constants.ENTERPRISE) {
      this.toggleSubscriptionSelectedBox(this.enterpriseSubscriptionData);
      this.selectedSubscriptionCardData = this.enterpriseSubscriptionData;
    }
    if (this.currentSubscriptionPlan.name === constants.LIFETIME) {
      this.toggleSubscriptionSelectedBox(this.lifetimeSubscriptionData);
      this.isMonthlySelected = true;
      this.selectedSubscriptionCardData = constants.LIFETIME_SUBSCRIPTION_DATA;
    }
    this.changePriceBasedOnRecuringType();

  };

  getRecurringType = () => {
    let type = this.isMonthlySelected ? constants.MONTHLY : constants.ANNUAL;
    if (this.currentSubscriptionPlan.name === constants.LIFETIME) {
      type = "";
    }
    return type;
  };

  reduceTwentyPercentPrice = (data) => {
    let price = this.latestSubscriptionPayments.subscription_product.price;
    let discountedAmount = price * 0.2; //20% discount
    data["original_price"] = price - discountedAmount;
  }

  toggleSubscriptionRecurringType = async () => {
    this.isMonthlySelected = !this.isMonthlySelected;
    const price = this.getPricePerMonthForAUser(this.latestSubscriptionPayments);
    this.changePriceBasedOnRecuringType(true);
    if (
      this.currentSubscriptionPlan.name !== constants.NOVICE &&
      this.currentSubscriptionPlan.name !== constants.LIFETIME
    ) {
      // If user applied coupon when purchasing then we need to adjust the price
      if (this.currentSubscriptionPlan.name === constants.AMATEUR) {
        this.amateurSubscriptionData.price = price;
        this.amateurSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;

        if(!this.isMonthlySelected) {
          this.reduceTwentyPercentPrice(this.amateurSubscriptionData);
        }
      }
      if (this.currentSubscriptionPlan.name === constants.PRO) {
        this.proSubscriptionData.price = price;
        this.proSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;

        if(!this.isMonthlySelected) {
          this.reduceTwentyPercentPrice(this.proSubscriptionData);
        }
      }
      if (this.currentSubscriptionPlan.name === constants.STARTER) {
        this.starterSubscriptionData.price = price;
        this.starterSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;

        if(!this.isMonthlySelected) {
          this.reduceTwentyPercentPrice(this.starterSubscriptionData);
        }
      }

      if (this.__shouldCallProrate()) {
        this.getProratedSubscriptionPrice(this.selectedSubscriptionCardData);
      }
    } else {
      if (!this.isMonthlySelected) {
        this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount * 12;
      } else {
        this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount;
      }
    }
  };


  getPricePerMonthForAUser = (productDetails) => {
    console.log(productDetails);
    if(
      productDetails.subscriptionProduct.type === constants.BRAND_NOVICE ||
      productDetails.subscriptionProduct.type === constants.BRAND_299_MONTH_PER_USER ||
      productDetails.subscriptionProduct.type === constants.BRAND_PRESALE_LIFETIME
    ) {
      return "0";
    }
    const stripeDetails = JSON.parse(productDetails.stripeDetails);
    console.log({ stripeDetails });
    let price, total;
    if (stripeDetails && stripeDetails.length > 1) {
      total = stripeDetails[stripeDetails.length - 1].total;
    } else {
      total = parseInt(productDetails.amount);
    }

    price = total / this.subscription.total_seats;
    // if(this.discountPercent) {
    //   pricePerUser = pricePerUser * this.discountPercent;
    // }

    if (this.subscription.product_name === constants.SUBSCRIPTION_YEAR) {
      price = price / 12;
    }


    // If no coupon was applied and user select annual then we must apply 20% discount
    if(!this.isMonthlySelected && !this.discountPercent) {
      price = price - (price * 0.2);
    }

    return price.toString();

    // if (
    //   (this.subscription.product_name === constants.SUBSCRIPTION_MONTH && this.isMonthlySelected) ||
    //   (this.subscription.product_name === constants.SUBSCRIPTION_YEAR && !this.isMonthlySelected)
    // ) {
    //
    //   const stripeDetails = productDetails['stripe_details'] ? JSON.parse(productDetails['stripe_details']) : [];
    //   console.log('stripeDetails', stripeDetails);
    //   let price = stripeDetails[stripeDetails.length - 1].unit_amount;
    //   if (this.discountPercent) {
    //     let discountedAmount = price * this.discountPercent;
    //     price = price - discountedAmount;
    //   }
    //
    //   if(this.subscription.product_name === constants.SUBSCRIPTION_YEAR) {
    //     console.log('here we go again');
    //     price = price / 12;
    //
    //     if (!this.discountPercent) {
    //       let discountedAmount = price * 0.2;
    //       price = price - discountedAmount;
    //     }
    //   }
    //   return  price.toString();
    // }
    //
    // if (this.isMonthlySelected) {
    //   if (this.currentSubscriptionPlan.type === constants.BRAND_AMATEUR) return constants.AMATEUR_SUBSCRIPTION_PRICE_MONTH;
    //   if (this.currentSubscriptionPlan.type === constants.BRAND_PRO) return constants.PRO_SUBSCRIPTION_PRICE_MONTH;
    //   if (this.currentSubscriptionPlan.type === constants.BRAND_STARTER) return constants.STARTER_SUBSCRIPTION_PRICE_MONTH;
    // } else {
    //   if (this.currentSubscriptionPlan.type === constants.BRAND_AMATEUR) return constants.AMATEUR_SUBSCRIPTION_PRICE_YEAR;
    //   if (this.currentSubscriptionPlan.type === constants.BRAND_PRO) return constants.PRO_SUBSCRIPTION_PRICE_YEAR;
    //   if (this.currentSubscriptionPlan.type === constants.BRAND_STARTER) return constants.STARTER_SUBSCRIPTION_PRICE_YEAR;
    // }
  };

  changePriceBasedOnRecuringType = (toggleSubscription = false) => {
    const price = this.getPricePerMonthForAUser(this.latestSubscriptionPayments);
    if (this.isMonthlySelected) {
      this.amateurSubscriptionData = {
        ...this.amateurSubscriptionData,
        price: constants.AMATEUR_SUBSCRIPTION_PRICE_MONTH,
      };
      this.proSubscriptionData = { ...this.proSubscriptionData, price: constants.PRO_SUBSCRIPTION_PRICE_MONTH };
      this.starterSubscriptionData = {
        ...this.starterSubscriptionData,
        price: constants.STARTER_SUBSCRIPTION_PRICE_MONTH,
      };

      if (this.currentSubscriptionPlan.name === constants.AMATEUR) {
        // this.amateurSubscriptionData.price = this.latestSubscriptionPayments.amount;
        this.amateurSubscriptionData.price = price;
        this.amateurSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;
      }
      if (this.currentSubscriptionPlan.name === constants.PRO) {
        this.proSubscriptionData.price = price;
        this.proSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;
      }
      if (this.currentSubscriptionPlan.name === constants.STARTER) {
        this.starterSubscriptionData.price = price;
        this.starterSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;
      }

    } else {
      this.amateurSubscriptionData = {
        ...this.amateurSubscriptionData,
        price: constants.AMATEUR_SUBSCRIPTION_PRICE_YEAR,
      };
      this.proSubscriptionData = { ...this.proSubscriptionData, price: constants.PRO_SUBSCRIPTION_PRICE_YEAR };
      this.starterSubscriptionData = {
        ...this.starterSubscriptionData,
        price: constants.STARTER_SUBSCRIPTION_PRICE_YEAR,
      };

      if (this.currentSubscriptionPlan.name === constants.AMATEUR) {
        this.amateurSubscriptionData.price = price;
        this.reduceTwentyPercentPrice(this.amateurSubscriptionData);
        // this.amateurSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;
      }
      if (this.currentSubscriptionPlan.name === constants.PRO) {
        this.proSubscriptionData.price = price;
        this.proSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;
        this.reduceTwentyPercentPrice(this.proSubscriptionData);
      }
      if (this.currentSubscriptionPlan.name === constants.STARTER) {
        this.starterSubscriptionData.price = price;
        this.starterSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;
        this.reduceTwentyPercentPrice(this.starterSubscriptionData);
      }
    }

    if (toggleSubscription) {
      if (this.selectedSubscriptionCardData.subscriptionType === this.amateurSubscriptionData.subscriptionType) {
        this.selectedSubscriptionCardData = this.amateurSubscriptionData;
      }
      if (this.selectedSubscriptionCardData.subscriptionType === this.proSubscriptionData.subscriptionType) {
        this.selectedSubscriptionCardData = this.proSubscriptionData;
      }
      if (this.selectedSubscriptionCardData.subscriptionType === this.starterSubscriptionData.subscriptionType) {
        this.selectedSubscriptionCardData = this.starterSubscriptionData;
      }
    }
  };

  plusBtnClicked = () => {
    this.__calculatePriceForUserCount(true);
  };

  minusBtnClicked = () => {
    this.__calculatePriceForUserCount(false);
  };


  __calculatePriceForUserCount = (increment = true) => {
    // We prevent "lifetime" from increment/decrement user count to avoid getProratedPrice API call
    if (this.selectedSubscriptionCardData.subscriptionType === constants.LIFETIME_SUBSCRIPTION_DATA.subscriptionType) {
      Swal.fire({
        icon: "error",
        text: `Please select a plan first.`,
      });
      return;
    }

    if (increment) {
      this.usersCount++;
    } else {
      // Do not proceed if users count is equal to invited users count.
      if (this.invitedUsersListCount === this.usersCount) {
        Swal.fire({
          icon: "error",
          text: `This plan requires at least ${this.invitedUsersListCount} user(s)`,
        });
        return;
      }
      this.usersCount--;
      if (this.usersCount < 1) {
        this.usersCount = 1;
        return;
      }
    }

    const isUserCurrentRecurringMonthly = this.subscription.product_name === constants.SUBSCRIPTION_MONTH;

    // Point 1 - If user is on "Novice" then we will create new subscription, so we do not need proration data
    // Point 2 - If user has a paid subscription and want to get another paid one then we prorate.
    if (
      this.currentSubscriptionPlan.name !== constants.NOVICE &&
      this.currentSubscriptionPlan.name !== constants.LIFETIME &&
      (
        this.selectedSubscriptionCardData.title === constants.PRO ||
        this.selectedSubscriptionCardData.title === constants.AMATEUR ||
        this.selectedSubscriptionCardData.title === constants.STARTER
      )
    ) {
      // Set proration price = 0 because user toggle back to their current plan and users count is also unchanged
      if (
        this.currentSubscriptionPlan.name === this.selectedSubscriptionCardData.title &&
        this.usersCount === this.subscription.total_seats &&
        isUserCurrentRecurringMonthly === this.isMonthlySelected
      ) {
        this.prorationPrice = 0;
      } else {
        this.getProratedSubscriptionPrice(this.selectedSubscriptionCardData);
      }

    }

    // If user is on "Novice" then we will create new subscription, so we do not need proration data.
    // Which is why we set prorate price to 0
    this.__calculateProratedPrice();

  };

  __calculateProratedPrice = () => {
    if (
      this.currentSubscriptionPlan.name === constants.NOVICE ||
      this.currentSubscriptionPlan.name === constants.LIFETIME
    ) {
      if (!this.isMonthlySelected) {
        this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount * 12;
      } else {
        this.prorationPrice = this.selectedSubscriptionCardData.price * this.usersCount;
      }
    }
  };

  handleChangeUsersCount = () => {
    // Do not proceed if users count is less than invited users count.
    if (this.invitedUsersListCount > this.usersCount) {
      this.usersCount = this.subscription.total_seats;
      Swal.fire({
        icon: "error",
        text: `This plan requires at least ${this.invitedUsersListCount} user(s)`,
      });
      return;
    }

    if (this.usersCount < 1) this.usersCount = 1;
    // If number of user is updated then we need to get the prorated the price data
    console.log(this.selectedSubscriptionCardData.title);
    if (
      this.selectedSubscriptionCardData.title === constants.PRO ||
      this.selectedSubscriptionCardData.title === constants.AMATEUR ||
      this.selectedSubscriptionCardData.title === constants.STARTER
    ) {
      this.getProratedSubscriptionPrice(this.selectedSubscriptionCardData);
    }
  };

  __isSubscriptionChangeForLifetimeConfirmed = async () => {
    let isConfirm = await Swal.fire({
      title: `Note!`,
      text: "Your current 'Lifetime' plan will be lost and won't be able to revert.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, change it!",
    });

    return !isConfirm.dismiss;
  };


  changePlanBtnClick = async () => {
    const currentPlanName = this.currentSubscriptionPlan.name.toLowerCase();
    if (
      currentPlanName === constants.NOVICE.toLowerCase() ||
      currentPlanName === constants.LIFETIME.toLowerCase()
    ) {

      if (currentPlanName === constants.LIFETIME.toLowerCase()) {
        const confirmed = await this.__isSubscriptionChangeForLifetimeConfirmed();
        if (!confirmed) return;
      }

      const postData = {
        type: this.selectedSubscriptionCardData.subscriptionType,
        supplier_id: this.userData.supplier_id,
        reccuring: this.isMonthlySelected ? constants.MONTH : constants.YEAR,
        payment_for: constants.SUBSCRIPTION,
        success_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.SUBSCRIPTION,
        cancel_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.SUBSCRIPTION,
        promotion_code: this.couponCode,
        seats: this.usersCount,
      };
      await this.makePaymentForSubscriptionApi(postData);
      return;
    }

    const postData = {
      product_type: this.selectedSubscriptionCardData.subscriptionType,
      supplier_id: this.userData.supplier_id,
      number_of_user: this.usersCount,
      previous_product_type: this.currentSubscriptionPlan.type,
      proration_date: this.selectedSubscriptionCardData.title === constants.NOVICE ? Math.floor(new Date().getTime() / 1000) : this.prorationDate,
      recurring: this.isMonthlySelected ? constants.MONTHLY.toLowerCase() : constants.ANNUAL.toLowerCase(),
      invoice_now: this.prorationPrice ? "true" : "false",
    };
    await this.switchSubscriptionForBrandsApi(postData);
  };

  makePaymentForSubscriptionApi = async (postData) => {
    this.proratedPriceInfoComponentLoading = true;
    this.httpService.post("payment/makePaymentForSubscription", postData).subscribe(res => {
      if (res.success) {
        window.location.href = res.data;
      } else {
        Swal.fire("Error", res.error.message);
      }
      this.proratedPriceInfoComponentLoading = false;
    });
  };

  switchSubscriptionForBrandsApi = async (postData) => {
    this.proratedPriceInfoComponentLoading = true;
    this.httpService.post("payment/switchSubscriptionForBrands", postData).subscribe(res => {
      if (res.success) {
        Swal.fire("Congrats!", "Your subscription has been updated.", "success").then(() => {
          this.sendSlackNotification(postData).then(() => {
            this.router.navigate([routeConstants.BRAND.SUBSCRIPTION]);
          });
        });
      } else {
        Swal.fire("Failed!", res.error.message, "error").then(() => {
          this.router.navigate([routeConstants.BRAND.SUBSCRIPTION]);
        });
      }
      this.proratedPriceInfoComponentLoading = false;
    });
  };

  sendSlackNotification = async (slackNotification) => {
    if (environment.production) {
      let message = "==================\n";
      message += `Supplier Subscription Change\n`;
      message += `Supplier Company Name - ${this.userData.supplier_name}\n`;
      message += `Name of the person - ${this.userData.first_name} ${this.userData.last_name}\n`;
      message += `Email Address of the person - ${this.userData.email}\n`;
      message += `Previous Subscription - ${slackNotification.previous_product_type.replaceAll("BRAND_", "")}\n`;
      message += `Current Subscription - ${slackNotification.product_type.replaceAll("BRAND_", "")}\n`;
      message += `Previous Number of User - ${this.subscription.total_seats}\n`;
      message += `Current Number of User - ${slackNotification.number_of_user}\n`;
      await this.httpService.post("supplier/postSubscriptionChangeNotificationToSlack", { message }).toPromise();
    }
  };

  toggleSubscriptionSelectedBox = (data) => {
    const price = this.getPricePerMonthForAUser(this.latestSubscriptionPayments);
    this.selectedSubscriptionCardData = data;
    // if (data.title === constants.LIFETIME_DEAL) {
    //   this.lifetimeSubscriptionData.active = true;
    //   this.noviceSubscriptionData.active = false;
    //   this.amateurSubscriptionData.active = false;
    //   this.proSubscriptionData.active = false;
    //   // this.starterSubscriptionData.active = false;
    //   this.prorationPrice = 0;
    //
    //   this.setLifeTimeSubscriptionPrice();
    //   return;
    // }
    if (data.title === constants.NOVICE) {
      this.noviceSubscriptionData.active = true;
      this.amateurSubscriptionData.active = false;
      this.proSubscriptionData.active = false;
      this.lifetimeSubscriptionData.active = false;
      // this.starterSubscriptionData.active = false;
      this.prorationPrice = 0;
    }
    if (data.title === constants.AMATEUR) {
      this.noviceSubscriptionData.active = false;
      this.amateurSubscriptionData.active = true;
      this.proSubscriptionData.active = false;
      this.lifetimeSubscriptionData.active = false;
      // this.starterSubscriptionData.active = false;
      // If user applied coupon when purchasing then we need to adjust the price
      if (this.currentSubscriptionPlan.name === constants.AMATEUR) {
        this.amateurSubscriptionData.price = price;
        this.amateurSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;

        if(!this.isMonthlySelected) {
          this.reduceTwentyPercentPrice(this.amateurSubscriptionData);
        }
      }
      if (this.__shouldCallProrate()) {
        this.getProratedSubscriptionPrice(data);
      }
    }
    // if (data.title === constants.STARTER) {
    //   this.noviceSubscriptionData.active = false;
    //   this.amateurSubscriptionData.active = false;
    //   this.proSubscriptionData.active = false;
    //   this.starterSubscriptionData.active = true;
    //   // If user applied coupon when purchasing then we need to adjust the price
    //   if (this.currentSubscriptionPlan.name === constants.STARTER) {
    //     this.starterSubscriptionData.price = price;
    //     this.starterSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;
    //
    //     if(!this.isMonthlySelected) {
    //       this.reduceTwentyPercentPrice(this.starterSubscriptionData);
    //     }
    //   }
    //   if (this.__shouldCallProrate()) {
    //     this.getProratedSubscriptionPrice(data);
    //   }
    // }
    if (data.title === constants.PRO) {
      this.noviceSubscriptionData.active = false;
      this.amateurSubscriptionData.active = false;
      this.proSubscriptionData.active = true;
      this.lifetimeSubscriptionData.active = false;
      // this.starterSubscriptionData.active = false;
      // If user applied coupon when purchasing then we need to adjust the price
      if (this.currentSubscriptionPlan.name === constants.PRO) {
        this.proSubscriptionData.price = price;
        this.proSubscriptionData["original_price"] = this.latestSubscriptionPayments.subscription_product.price;

        if(!this.isMonthlySelected) {
          this.reduceTwentyPercentPrice(this.proSubscriptionData);
        }
      }
      if (this.__shouldCallProrate()) {
        this.getProratedSubscriptionPrice(data);
      }
    }
    // if (data.title === constants.ENTERPRISE) {
    //   this.noviceSubscriptionData.active = false;
    //   this.amateurSubscriptionData.active = false;
    //   this.proSubscriptionData.active = false;
    //   this.enterpriseSubscriptionData.active = true;
    //   this.prorationPrice = 0;
    // }

    // Set proration price = 0 because user toggle back to their current plan and users count is also unchanged
    if (
      this.currentSubscriptionPlan.name === this.selectedSubscriptionCardData.title &&
      this.usersCount === this.subscription.total_seats
    ) {
      this.prorationPrice = 0;
    }

    // If user is on "Novice" then we will create new subscription, so we do not need proration data.
    // Which is why we calculate price without proration.
    this.__calculateProratedPrice();
  };


  __shouldCallProrate = () => {
    if (
      this.currentSubscriptionPlan.name == constants.LIFETIME ||
      this.currentSubscriptionPlan.name === constants.NOVICE
    ) {
      this.prorationPrice = 0;
      return false;
    }

    if (
      this.usersCount !== this.subscription.total_seats ||
      (this.subscription.product_name === constants.SUBSCRIPTION_MONTH && !this.isMonthlySelected) ||
      (this.subscription.product_name === constants.SUBSCRIPTION_YEAR && this.isMonthlySelected) ||
      this.currentSubscriptionPlan.name !== this.selectedSubscriptionCardData.title
    ) {
      return true;
    }
    this.prorationPrice = 0;
    return false;
  };

  proratedPriceInfoComponentLoading = false;
  getProratedSubscriptionPrice = (data) => {
    const postData = {
      product_type: data.subscriptionType,
      supplier_id: this.userData.supplier_id,
      number_of_user: this.usersCount,
      previous_product_type: this.currentSubscriptionPlan.type,
      recurring: this.isMonthlySelected ? constants.MONTHLY.toLowerCase() : constants.ANNUAL.toLowerCase(),
    };

    this.proratedPriceInfoComponentLoading = true;
    this.httpService.post("payment/getProratedSubscriptionPrice", postData).subscribe(res => {
      if (res.success) {
        this.proratedApiResponse = res.data;
        this.prorationDate = res.proration_date;

        //Get user stripe balance api for get and calculate any pending downgrade subscription price in order to upgrade subscription.
        this.httpService.post("payment/getUserStripeBalance", { supplier_id: this.userData.supplier_id }).subscribe(userBalanceApiRes => {
          let endingBalance = 0;
          if (userBalanceApiRes.success) {
            endingBalance = userBalanceApiRes.data.ending_balance;
          }

          if (res.data.total < 0) {
            this.prorationPrice = 0;
          } else {
            // Because we receive price as cents. So we convert it to $.
            this.prorationPrice = res.data.total / 100;

            // If user has ending balance which means user
            if (endingBalance < 0) {
              this.prorationPrice = this.prorationPrice + (endingBalance / 100);
            }
          }

          // If for some reason "prorationPrice" is still negative then we make it 0
          if (this.prorationPrice < 0) {
            this.prorationPrice = 0;
          }

          this.proratedPriceInfoComponentLoading = false;
        });
      } else {
        this.proratedPriceInfoComponentLoading = false;
      }
    });
  };

  // setLifeTimeSubscriptionPrice = () => {
  //   if (this.currentSubscriptionPlan.name !== constants.LIFETIME) {
  //     this.prorationPrice = this.usersCount * parseInt(this.lifetimeSubscriptionData.price);
  //   }
  // }

  scheduleCallTap = () => {
    window.open(constants.KEXY_CALENDLY_URL);
  };

  async getUsersList() {
    let data = {
      restaurant_id: "",
      distributor_id: "",
      supplier_id: this.userData.supplier_id,
    };

    let response = await this.httpService.post("user/listInvitations", data).toPromise();
    if (response.success) {
      this.invitedUsersListCount = response.data.employee.length + 1;
    }
  }

  couponCode = "";
  handlecouponInputChange = (value) => {
    this.couponCode = value;
  };
}
