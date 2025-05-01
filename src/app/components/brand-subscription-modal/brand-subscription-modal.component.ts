import { Component, OnInit, Input } from "@angular/core";
import {CommonModule, Location} from "@angular/common";
import { environment } from "src/environments/environment";
import { constants } from "src/app/helpers/constants";
import { routeConstants } from "src/app/helpers/routeConstants";
import { HttpService } from "src/app/services/http.service";
import {KexyModalHeadComponent} from '../kexy-modal-head/kexy-modal-head.component';
import {FormsModule} from '@angular/forms';
import {BrandSubscriptionCardComponent} from '../brand-subscription-card/brand-subscription-card.component';

@Component({
  selector: 'brand-subscription-modal',
  imports: [
    KexyModalHeadComponent,
    FormsModule,
    BrandSubscriptionCardComponent,
    CommonModule,
  ],
  templateUrl: './brand-subscription-modal.component.html',
  styleUrl: './brand-subscription-modal.component.scss'
})
export class BrandSubscriptionModalComponent {
  @Input() closeModal;
  @Input() userData;
  @Input() from;
  @Input() handleFreeSubscriptionSelection;
  addSubscriptionFlag: boolean = false;
  selectedSubscriptionRecurringType = "";
  couponCode;
  subscriptionFullFormSubmitted = false;
  errorMessage;
  employeeList = [];
  selectedPaidUsers = [];
  subscriptionInfo;
  bypasStripe: boolean = false;
  isLoading: boolean = true;
  subscriptionType = "";
  recurringType = "";
  isFreeAccount: boolean;

  isMonthlySelected: boolean = true;
  amateurPrice = constants.AMATEUR_BRAND_MONTH_PRICE;
  proPrice = constants.PRO_BRAND_MONTH_PRICE;
  subscriptionTypeNoviceCardLoading: boolean = false;
  subscriptionTypeAmateurCardLoading: boolean = false;
  subscriptionTypeProCardLoading: boolean = false;

  constructor(private location: Location, private httpService: HttpService) {}

  async ngOnInit() {
    if (this.from === "add-brand") {
      this.userData.isAdmin = true;
    }

    await this.userOrganaizationApiCall();

    if (
      this.subscriptionInfo &&
      this.subscriptionInfo.payment_status === constants.SUCCESS &&
      this.subscriptionInfo.status !== constants.INACTIVE &&
      this.subscriptionInfo.product_name !== constants.IMPRESSION_DAY
    ) {
      this.subscriptionType = constants.PRO;
      this.isFreeAccount = false;
      this.recurringType =
        this.subscriptionInfo.product_name === constants.SUBSCRIPTION_MONTH ? constants.MONTHLY : constants.YEARLY;

      this.setRecurringAndPrice();
    } else {
      this.subscriptionType = constants.FREE;
      this.isFreeAccount = true;
    }

    console.log("subscription", this.subscriptionType, this.isFreeAccount, this.recurringType);
    this.isLoading = false;
  }

  setRecurringAndPrice = () => {
    if (this.subscriptionInfo.product_name === constants.SUBSCRIPTION_MONTH) {
      this.isMonthlySelected = true;
      this.amateurPrice = constants.AMATEUR_BRAND_MONTH_PRICE;
      this.proPrice = constants.PRO_BRAND_MONTH_PRICE;
    } else {
      this.isMonthlySelected = false;
      this.amateurPrice = `${constants.AMATEUR_BRAND_YEAR_PRICE}/${constants.MONTH}`;
      this.proPrice = `${constants.PRO_BRAND_YEAR_PRICE}/${constants.MONTH}`;
    }
  };

  changeSwitchInputOption = (e) => {
    this.isMonthlySelected = !this.isMonthlySelected;
    if (this.isMonthlySelected) {
      this.amateurPrice = constants.AMATEUR_BRAND_MONTH_PRICE;
      this.proPrice = constants.PRO_BRAND_MONTH_PRICE;
    } else {
      this.amateurPrice = `${constants.AMATEUR_BRAND_YEAR_PRICE}/${constants.MONTH}`;
      this.proPrice = `${constants.PRO_BRAND_YEAR_PRICE}/${constants.MONTH}`;
    }
  };

  changePaymentMethod = async () => {
    const response = await this.httpService
      .post("payment/changePaymentMethod", {
        // success_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.SUBSCRIPTION,
        // cancel_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.SUBSCRIPTION,
        success_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.LANDING_PAGES,
        cancel_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.LANDING_PAGES,
      })
      .toPromise();
    // window.location.href = response.data;
    window.open(response.data, "_blank");
  };

  async userOrganaizationApiCall() {
    const response = await this.httpService.post("user/getUserOrganizations", {}).toPromise();
    if (response.success) {
      const supplier = response.data.supplier_list.find((s) => {
        return s.supplier_id == this.userData.supplier_id;
      });

      this.employeeList = supplier.employee;
      this.selectedPaidUsers = [];
      if (supplier.subscription) {
        this.subscriptionInfo = supplier.subscription;
        this.bypasStripe = this.subscriptionInfo.bypass_stripe;
        console.log("subscriptionInfo", this.subscriptionInfo);
      }
    }
  }

  chooseFreeBtnClick = () => {
    if (this.from === "add-brand") {
      this.handleFreeSubscriptionSelection();
    }
  };

  chooseProBtnClick = async (recurringValue = constants.MONTH, couponCode = "") => {
    this.selectedSubscriptionRecurringType = recurringValue;
    this.couponCode = couponCode;
    await this.onSubscibe();
  };

  chooseAmateurBtnClick = async (recurringValue = constants.MONTH, couponCode = "") => {
    this.selectedSubscriptionRecurringType = recurringValue;
    this.couponCode = couponCode;
    await this.onSubscibe();
  };

  async onSubscibe() {
    this.subscriptionFullFormSubmitted = true;
    if (!this.selectedSubscriptionRecurringType) {
      return;
    }

    this.addSubscriptionFlag = true;

    let subscriptionData = {
      type: constants.BRAND_TEST,
      reccuring: this.selectedSubscriptionRecurringType,
      payment_for: "subscription",
      paidEmployeeIds: [this.userData.id],
      promotion_code: this.couponCode,
      supplier_id: this.userData.supplier_id,
      success_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.LANDING_PAGES,
      cancel_url: environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.LANDING_PAGES,
    };

    if (this.from === "add-brand") {
      subscriptionData.success_url = environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.ORGANIZATION;

      subscriptionData.cancel_url = environment.siteUrl + routeConstants.BASE_URL + routeConstants.BRAND.ORGANIZATION;
    }
    console.log(subscriptionData);

    const paymentForSubscriptionResponse = await this.httpService
      .post("payment/makePaymentForSubscription", subscriptionData)
      .toPromise();
    if (paymentForSubscriptionResponse.success) {
      this.addSubscriptionFlag = false;
      window.location.href = paymentForSubscriptionResponse.data;
    } else {
      this.addSubscriptionFlag = false;
      this.errorMessage = paymentForSubscriptionResponse.error.message;
    }
  }
}
