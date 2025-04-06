import {inject, Injectable} from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { BehaviorSubject, Observable } from "rxjs";
import { map } from "rxjs/operators";

import { environment } from "../../environments/environment";
import { User } from "../models/user";

import { HttpService } from "./http.service";
import { Router } from "@angular/router";
import { constants } from "../helpers/constants";
import { routeConstants } from "../helpers/routeConstants";
import { PageUiService } from "./page-ui.service";

@Injectable({ providedIn: "root" })
export class AuthService {
  private userTokenSubject: BehaviorSubject<User>;
  public userToken: Observable<User>;
  public userEmail;
  public userPassword;
  public userOrganisationData;

  constructor(
    private http: HttpClient,
    private router: Router,
    private httpService: HttpService,
    private pageUiService: PageUiService,
  ) {
    this.userTokenSubject = new BehaviorSubject(JSON.parse(localStorage.getItem("userToken")));
    this.userToken = this.userTokenSubject.asObservable();
  }

  public get userTokenValue() {
    return JSON.parse(localStorage.getItem("userToken"));
  }

  public get registrationTokenValue() {
    return localStorage.getItem("registerToken");
  }

  login(email: string, password: string, presale = false) {
    this.userEmail = email;
    this.userPassword = password;
    let apiUrl = `${environment.baseUrl}`;

    let headers = this._getHeaders();

    return this.http.post<any>(`${apiUrl}user/login`, { email, password }, { headers: headers }).pipe(
      map((user) => {
        console.log("user", user);
        if (user["success"] && user["data"]) {
          this.storeUserToken(user["data"], presale).then(() => {
          });
        }
        return user;
      }),
    );
  }

  logout() {
    localStorage.clear();
    this.userTokenSubject.next(null);
    this.pageUiService.updateGleapIcon(true);
  }

  _getHeaders(): HttpHeaders {
    return new HttpHeaders({ "Content-Type": "application/json", accept: "application/json" });
  }

  userOrganisationApiCall = async (overwrite = false) => {
    if (this.userOrganisationData && !overwrite) {
      return this.userOrganisationData;
    }
    try {
      const response = await this.httpService.post("user/getUserOrganizations", {}).toPromise();
      if (response.success) {
        this.userOrganisationData = response;
      }
      return this.userOrganisationData;
    } catch (ex) {
      console.log(ex);
    }
  };

  getSubscriptionData = async (overwrite = false) => {
    const response = await this.userOrganisationApiCall(overwrite);
    if (response.success) {
      const userData = this.userTokenValue;
      const supplierId = userData.supplier_id;
      const userId = userData.id;
      const supplier = response.data.supplier_list.find(s => s.supplier_id === supplierId);
      if (supplier.subscription) {
        supplier.subscription.subscription_payments = supplier.subscription.subscription_payments.filter(p => {
          return p.success === true && p.reccuring !== "day";
        });
        const paymentsLength = supplier.subscription.subscription_payments.length - 1;
        let productDetails = supplier.subscription.subscription_payments[paymentsLength].subscription_product;
        if (!productDetails) {
          productDetails = {
            name: constants.NOVICE,
            price: 0,
            type: constants.BRAND_NOVICE,
            allowed_credit_limit: 25,
          };
        }
        supplier.subscription["subscription_product"] = productDetails;

        const creditsInfo = supplier.subscription.subscription_credits;
        if (creditsInfo) {
          const currentUserCredits = creditsInfo.findLast(c => c.user_id === userId);
          currentUserCredits["total_credits"] = currentUserCredits.allowed_credit_limit;
          currentUserCredits["used_credits"] = currentUserCredits.allowed_credit_limit - currentUserCredits.current_credits;
          supplier.subscription.subscription_credits = [currentUserCredits];
        }
        const additionalCreditsInfo = supplier.subscription.subscription_additional_credits;
        if (additionalCreditsInfo) {
          const currentUserAdditionalCredits = additionalCreditsInfo.filter(c => c.user_id === userId);
          let totalCredits = 0;
          let totalAdditionalCredits = 0;
          if (currentUserAdditionalCredits) {
            currentUserAdditionalCredits.forEach(credit => {
              totalCredits += credit.aditional_credit_limit;
              totalAdditionalCredits += credit.current_credits;
            });
            currentUserAdditionalCredits["total_credits"] = totalCredits;
            currentUserAdditionalCredits["used_credits"] = totalCredits - totalAdditionalCredits;

            supplier.subscription.subscription_additional_credits = currentUserAdditionalCredits;
          }
        }
        return supplier.subscription;
      }
    }
  };

  addUserTokenInLocalStorage(data) {
    let userData = data.user;
    userData.token = data.token;
    localStorage.setItem("userToken", JSON.stringify(userData));
    this.userTokenSubject.next(userData);
  }

  async storeUserToken(data: any, presale = false) {
    let userData = data.user;
    userData.token = data.token;

    localStorage.setItem("userToken", JSON.stringify(userData));
    this.userTokenSubject.next(userData);

    const response = await this.userOrganisationApiCall(true);
    if (response.success) {

      let createUrl;
      let organizationListUrl;
      let company;

      // If user is a supplier then redirect to supplier portal
      company = response.data.supplier_list[0];
      if (!company) {
        createUrl = routeConstants.BRAND.CREATE;
      }
      organizationListUrl = routeConstants.BRAND.ORGANIZATION_LIST;

      // Removed any draft data for campaign before user goes to the dashboard.
      localStorage.removeItem(constants.DRAFT_DEAL);

      if (response.data.supplier_list.length === 0) {
        createUrl = routeConstants.BRAND.CREATE;
      }

      if (createUrl) {
        await this.router.navigate([createUrl]);
        return;
      }

      console.log("Is it here?");
      await this.router.navigate([organizationListUrl, { fromPage: "login" }]);
    }
  }

  // This function is for supplier
  sendSlackNotification = async () => {
    const subscription = await this.getSubscriptionData();
    if (environment.production && !this.userTokenValue["slack_notification_sent"]) {
      const slackData = {
        supplier_id: this.userTokenValue.supplier_id,
        company_name: this.userTokenValue.supplier_name,
        email: this.userTokenValue.email,
        name: `${this.userTokenValue.first_name} ${this.userTokenValue.last_name}`,
        address: `${this.userTokenValue["supplier_street_address"]},${this.userTokenValue["supplier_city"]},${this.userTokenValue["supplier_state"]}`,
        subscription: subscription.subscription_product.name,
      };
      await this.httpService.post("supplier/postToSlack", slackData).toPromise();
    }
  };


  checkInventory(userData: any) {
    console.log("CHECK INVENTORY!");
    let fohData = { restaurant_id: userData.restaurant_id, side: "FOH" };
    this.httpService.post("restaurant/getWebportalDashboardData", fohData).subscribe((response) => {
      if (response.is_data_draft) {
        response.data = JSON.parse(response.data.draft_data);
      }
      if (response.success) {
        let productCats = response.data.category_list.filter((cat) => cat.product_list.length > 0);
        userData.is_foh_setup = productCats.length > 0;

        let bohData = { restaurant_id: userData.restaurant_id, side: "BOH" };
        this.httpService.post("restaurant/getWebportalDashboardData", bohData).subscribe((response) => {
          if (response.is_data_draft) {
            response.data = JSON.parse(response.data.draft_data);
          }
          let productCats = response.data.category_list.filter((cat) => cat.product_list.length > 0);
          userData.is_boh_setup = productCats.length > 0;
          localStorage.setItem("userToken", JSON.stringify(userData));
          this.userTokenSubject.next(userData);

          return;
        });
      }
    });
  }

  loggedUserRedirectToProperDashboard() {
    const currentUrl = this.router.url;
    const userTokenValue = this.userTokenValue;
    if (userTokenValue) {
      if (userTokenValue.type === constants.BRAND) {
        if (!currentUrl.includes(constants.BRAND)) {
          // this.router.navigate([routeConstants.BRAND.DEAL]);
          this.router.navigate([routeConstants.BRAND.PROMOTIONS]);
        }
      }
    }
  }

  changeUserData(userData) {
    localStorage.setItem("userToken", JSON.stringify(userData));
    this.userTokenSubject.next(userData);
  }
}
