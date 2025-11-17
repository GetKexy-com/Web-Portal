// import { Component, OnInit } from "@angular/core";
// import { Organization } from "src/app/models/Organization";
// import { environment } from "src/environments/environment";
// import { ActivatedRoute, Router } from "@angular/router";
// import { AuthService } from "src/app/services/auth.service";
// import { BehaviorSubject } from "rxjs";
// import { User } from "src/app/models/user";
// import { constants } from "src/app/helpers/constants";
// import { HttpService } from "src/app/services/http.service";
// import { routeConstants } from "src/app/helpers/routeConstants";
//
// @Component({
//   selector: 'app-brand-list',
//   imports: [],
//   templateUrl: './brand-list.component.html',
//   styleUrl: './brand-list.component.scss'
// })
// export class BrandListComponent {
//   protected params: any;
//   private userTokenSubject: BehaviorSubject<User>;
//   companyList: Organization[];
//   private isFirstTime = true;
//   public baseImageUrl;
//   public screenWidth: any;
//   public screenHeight: any;
//   public mobileScreenSize: any = 992;
//   public isMobileScreen: boolean = false;
//
//   constructor(
//     private httpService: HttpService,
//     private _authService: AuthService,
//     private router: Router,
//     private route: ActivatedRoute,
//   ) {
//     this.userTokenSubject = new BehaviorSubject(JSON.parse(localStorage.getItem("userToken")));
//   }
//
//   ngOnInit() {
//     this._authService.loggedUserRedirectToProperDashboard();
//     document.title = "Brand List - KEXY Brand Webportal";
//
//     this.screenWidth = window.innerWidth;
//     this.screenHeight = window.innerHeight;
//
//     if (this.screenWidth < this.mobileScreenSize) {
//       this.isMobileScreen = true;
//       localStorage.setItem("showResponsiveMessage", "true");
//     }
//
//     this.baseImageUrl = environment.imageUrl;
//     this.route.params.subscribe((params) => {
//       this.params = params;
//     });
//     this.getOrganizationData();
//   }
//
//   private async getOrganizationData(blockUi = true) {
//     this.httpService.post("user/getUserOrganizations", {}).subscribe((res) => {
//       if (!res.success) {
//         return;
//       }
//       this.companyList = res.data.supplier_list;
//       console.log("companyList", this.companyList);
//       console.log(this.params);
//       if (this.params && this.params["fromPage"] && this.params["fromPage"] === "login") {
//         if (this.companyList.length === 1) {
//           this.selectCompany(this.companyList[0]);
//           return;
//         }
//       }
//       this.isFirstTime = false;
//     });
//   }
//
//   async selectCompany(company: Organization) {
//     console.log({ company });
//     let userData = JSON.parse(localStorage.getItem("userToken"));
//     localStorage.setItem("tutorialVideo", "false");
//     localStorage.setItem(constants.PROSPECTING_CALENDLY_LINKS, company.calendly_links);
//     localStorage.setItem(constants.PROSPECTING_WEBSITE, company.websites);
//
//     userData.supplier_id = company.supplier_id;
//     userData.zip_code = company.zip_code_list[0].zip_code;
//     userData.job_title = company.job_title;
//     userData.role = company.role;
//     userData.isAdmin = company.role === constants.ADMIN;
//     userData.slack_notification_sent = company?.slack_notification_sent;
//     userData.industry = company?.industry;
//     userData.supplier_name = company.name;
//     userData.supplier_phone = company.phone;
//     userData.supplier_country = company.country;
//     userData.supplier_city = company.city;
//     userData.supplier_state = company.state;
//     userData.supplier_street_address = company.street_address;
//     userData.supplier_logo = company.logo_image_url;
//     userData.websites = company.websites;
//     userData.calendly_links = company.calendly_links;
//     userData.company_description = company.company_description;
//
//     if (company.subscription && company.subscription["id"]) {
//       userData.is_subscription = company.subscription["id"];
//       userData.subscription = JSON.stringify(company.subscription);
//       localStorage.setItem(constants.PAYMENT_STATUS, company.subscription["payment_status"]);
//     } else {
//       userData.is_subscription = 0;
//       userData.subscription = null;
//       localStorage.removeItem(constants.PAYMENT_STATUS);
//     }
//
//     localStorage.setItem("fake_distributor", JSON.stringify(company.fake_distributor));
//
//     userData.side = company.side;
//     localStorage.setItem("userToken", JSON.stringify(userData));
//     this.userTokenSubject.next(userData);
//
//     try {
//       const userSide = company.side;
//       let localsupplierId = parseInt(localStorage.getItem("supplierId"));
//       if (!localsupplierId) {
//         if (userSide === "BOTH") {
//           localStorage.setItem("side", "FOH");
//         } else {
//           localStorage.setItem("side", userSide);
//         }
//         localStorage.setItem("supplierId", company.supplier_id.toString());
//       } else {
//         if (userData.supplier_id !== localsupplierId) {
//           if (userSide === "BOTH") {
//             localStorage.setItem("side", "FOH");
//           } else {
//             localStorage.setItem("side", userSide);
//           }
//           localStorage.setItem("supplierId", userData.supplier_id.toString());
//         }
//       }
//     } catch (ex) {
//       ("pass");
//     }
//
//     const returnUrl = decodeURIComponent(localStorage.getItem("returnUrl"));
//     if (returnUrl && returnUrl !== "null") {
//       await this.router.navigateByUrl(returnUrl);
//       localStorage.removeItem("returnUrl");
//     } else {
//       await this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN]);
//     }
//   }
// }

import { Component, OnInit, signal } from '@angular/core';
import { Organization } from '../../models/Organization';
import { environment } from 'src/environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BehaviorSubject } from 'rxjs';
import { User } from '../../models/user';
import { constants } from '../../helpers/constants';
import { HttpService } from '../../services/http.service';
import { routeConstants } from '../../helpers/routeConstants';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-brand-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brand-list.component.html',
  styleUrl: './brand-list.component.scss'
})
export class BrandListComponent implements OnInit {
  protected params: any;
  private userTokenSubject: BehaviorSubject<User>;
  companyList = signal<Organization[]>([]);
  private isFirstTime = true;
  baseImageUrl = signal<string>(environment.imageUrl);
  screenWidth = signal<number>(0);
  screenHeight = signal<number>(0);
  mobileScreenSize = signal<number>(992);
  isMobileScreen = signal<boolean>(false);

  constructor(
    private httpService: HttpService,
    private _authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.userTokenSubject = new BehaviorSubject(
      JSON.parse(localStorage.getItem("userToken") ?? 'null')
    );
  }

  ngOnInit() {
    this._authService.loggedUserRedirectToProperDashboard();
    document.title = "Brand List - KEXY Brand Webportal";

    this.screenWidth.set(window.innerWidth);
    this.screenHeight.set(window.innerHeight);

    if (this.screenWidth() < this.mobileScreenSize()) {
      this.isMobileScreen.set(true);
      localStorage.setItem("showResponsiveMessage", "true");
    }

    this.route.params.subscribe((params) => {
      this.params = params;
    });
    this.getOrganizationData();
  }

  private getOrganizationData(blockUi = true) {
    this.httpService.get("company/getUserCompanies").subscribe({
      next: (res) => {
        if (!res.success) {
          return;
        }
        this.companyList.set(res.data);
        console.log('companyList', this.companyList());

        if (this.params?.["fromPage"] === "login" && this.companyList().length === 1) {
          this.selectCompany(this.companyList()[0]);
          return;
        }
        this.isFirstTime = false;
      },
      error: (err) => console.error(err)
    });
  }

  async selectCompany(data: Organization) {
    console.log('company', data);
    const company = data["company"];
    const userData = JSON.parse(localStorage.getItem("userToken") || '{}');
    localStorage.setItem("tutorialVideo", "false");
    localStorage.setItem(constants.PROSPECTING_CALENDLY_LINKS, company.calendlyLinks ?? '');
    localStorage.setItem(constants.PROSPECTING_WEBSITE, company.websites ?? '');

    let subscription;
    if (company.subscription?.length) {
      subscription = company.subscription[company.subscription.length - 1];
    }

    let zipCode;
    if (company.zipCodeList) {
      if (typeof company.zipCodeList === 'string') {
        zipCode = JSON.parse(company.zipCodeList);
        zipCode = zipCode[0];
        if (typeof zipCode === 'object') {
          zipCode = zipCode?.zip_code
        }

      } else {
        zipCode = company.zipCodeList[0]?.zip_code;
      }
    }

    // Update user data
    const updatedUserData = {
      ...userData,
      supplier_id: company.id,
      zip_code: zipCode ?? '',
      job_title: data["jobTitle"] ?? '',
      role: data.role ?? '',
      isAdmin: data.role === constants.ADMIN,
      slack_notification_sent: company?.slackNotificationSent,
      industry: company?.industry ?? '',
      supplier_name: company.name ?? '',
      supplier_phone: company.phone ?? '',
      supplier_country: company.country ?? '',
      supplier_city: company.city ?? '',
      supplier_state: company.state ?? '',
      supplier_street_address: company.streetAddress ?? '',
      supplier_logo: company.logoImage?.name ?? '',
      websites: company.websites ?? '',
      calendly_links: company.calendlyLinks ?? '',
      company_description: company.companyDescription ?? '',
      negative_prompts: company.negativePrompts ?? '',
      is_subscription: subscription?.["id"] ? 1 : 0,
      subscription: subscription ? JSON.stringify(subscription) : null,
    };

    if (subscription?.["id"]) {
      localStorage.setItem(constants.PAYMENT_STATUS, subscription["paymentStatus"] ?? '');
    } else {
      localStorage.removeItem(constants.PAYMENT_STATUS);
    }

    localStorage.setItem("userToken", JSON.stringify(updatedUserData));
    this.userTokenSubject.next(updatedUserData);

    try {
      const localSupplierId = parseInt(localStorage.getItem("supplierId") || '0', 10);

      if (!localSupplierId || updatedUserData.supplier_id !== localSupplierId) {
        localStorage.setItem("supplierId", updatedUserData.supplier_id.toString());
      }
    } catch (ex) {
      console.error(ex);
    }

    const returnUrl = decodeURIComponent(localStorage.getItem("returnUrl") ?? '');
    if (returnUrl && returnUrl !== "null") {
      await this.router.navigateByUrl(returnUrl);
      localStorage.removeItem("returnUrl");
    } else {
      await this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN]);
    }
  }
}
