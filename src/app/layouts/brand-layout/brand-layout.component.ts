import { Component, OnInit, ViewChild, Input, ElementRef } from "@angular/core";
import { Router } from "@angular/router";
import {NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbModal} from "@ng-bootstrap/ng-bootstrap";
import { AuthService } from "src/app/services/auth.service";
import { User } from "src/app/models/user";
import { environment } from "src/environments/environment";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { constants } from "src/app/helpers/constants";
import { HttpService } from "src/app/services/http.service";
import {
  COMPANY_DETAILS,
  CONTACTS,
  DRIP_CAMPAIGN,
  PROMOTION,
  PROSPECTING,
  routeConstants,
} from "../../helpers/routeConstants";
import Gleap from "gleap";
import { PageUiService } from "../../services/page-ui.service";
import { ProspectingService } from "../../services/prospecting.service";
import { dripCampaignInitialModalData } from "../../helpers/demoData";
import {
  KexyTutorialModalContentComponent,
} from "../../components/kexy-tutorial-modal-content/kexy-tutorial-modal-content.component";
import {OrgInfoComponent} from '../../components/org-info/org-info.component';
import {NavItemDropdownComponent} from '../../components/nav-item-dropdown/nav-item-dropdown.component';
import {NavItemComponent} from '../../components/nav-item/nav-item.component';
import {ModalComponent} from '../../components/modal/modal.component';
import {BackButtonComponent} from '../../components/back-button/back-button.component';
import {
  BrandSubscriptionModalComponent
} from '../../components/brand-subscription-modal/brand-subscription-modal.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'brand-layout',
  imports: [
    OrgInfoComponent,
    NavItemDropdownComponent,
    NavItemComponent,
    ModalComponent,
    BackButtonComponent,
    NgbDropdownMenu,
    NgbDropdownItem,
    BrandSubscriptionModalComponent,
    CommonModule,
    NgbDropdown,
    NgbDropdownToggle
  ],
  templateUrl: './brand-layout.component.html',
  styleUrl: './brand-layout.component.scss'
})
export class BrandLayoutComponent implements OnInit {
  @Input() layoutPaddingNone;
  @Input() fullPageScroll = true;
  @Input() headerBgWhite;
  @Input() mainBgColor = "white";
  @Input() showBackButton = false;
  brand = routeConstants.BRAND;
  base_url = routeConstants.BASE_URL;

  userData: User;
  currentUrl = "";
  stripeLoginUrl = "";
  restaurant_id: number;
  isFoh = true;
  uploadCsvSide = "FOH";
  isUploadingCsvFlag = false;
  todayDate: number = Date.now();
  showSidebar = true;
  externalAssets = "";
  showHeaderTabs = true;
  isAdmin: boolean = false;
  public screenWidth: any;
  public screenHeight: any;
  public mobileScreenSize: any = 992;
  public isMobileScreen: boolean = false;

  private userTokenSubject: BehaviorSubject<User>;
  public userToken: Observable<User>;
  public tutorialModalSubscription: Subscription;

  @ViewChild("tabContent") private tabContent;
  @ViewChild("disableTab") private disableTab;
  @ViewChild("noSubscription") private noSubscription;
  @ViewChild("tutorialVideoDialog") private tutorialVideoDialog;

  constructor(
    private _authService: AuthService,
    private router: Router,
    private modal: NgbModal,
    private pageUiService: PageUiService,
    private prospectingService: ProspectingService,
  ) {
    this.userTokenSubject = new BehaviorSubject(JSON.parse(localStorage.getItem("userToken")));
    this.userToken = this.userTokenSubject.asObservable();
    this.showHideDropdowns();
  }

  get username(): string {
    return this.userData ? this.userData.firstName + " " + this.userData.lastName : "";
  }

  async ngOnInit() {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;

    if (this.screenWidth < this.mobileScreenSize) {
      this.isMobileScreen = true;
      this.showSidebar = false;
    }

    this.userData = this._authService.userTokenValue;

    this.isAdmin = this.userData.role == constants.ADMIN;

    this.currentUrl = this.router.url;
    if (this.currentUrl) {
      if (!this.currentUrl.includes(routeConstants.BRAND.PROSPECT_URL)) {
        // Reset sales-lead memory or localstorage data so user can start again
        this.pageUiService.setProspectingSalesLeadCurrentStep(1);
        this.prospectingService.setJobTitleToEmpty();
        this.prospectingService.resetSalesLeadSearchContacts();
        localStorage.removeItem(constants.SALES_LEAD_SEARCH_PAYLOAD);
        localStorage.removeItem(constants.SALES_LEAD_PRODUCT);
        localStorage.removeItem(constants.SALES_LEAD_PRODUCT_CATEGORY);
        localStorage.removeItem(constants.SALES_LEAD_EMAIL_TONE);
        localStorage.removeItem(constants.SALES_LEAD_PRODUCT_DESCRIPTION);
        localStorage.removeItem(constants.SALES_LEAD_PRODUCT_CALENDLY);
        localStorage.removeItem(constants.SALES_LEAD_PRODUCT_WEBSITE);
        localStorage.removeItem(constants.SALES_LEAD_SELECT_AREA_SEARCH_TYPE);
        localStorage.removeItem(constants.SALES_LEAD_CITY_LIST);
        localStorage.removeItem(constants.SALES_LEAD_ZIP_CODE_LIST);
        localStorage.removeItem(constants.SALES_LEAD_STATE_LIST);
        localStorage.removeItem(constants.SALES_LEAD_NUMBER_OF_ESTABLISHMENT);
        localStorage.removeItem(constants.SALES_LEAD_SEARCH_JOB_TITLES_PAYLOAD);
      }
    }
    this.externalAssets = environment.externalAssetUrl + constants.SAMPLE_INVENTORY_SHEET;
    this.pageUiService.updateGleapIcon(false);
  }

  expandProspectingDropdown = false;
  expandPromotionDropdown = false;
  expandDripCampaignDropdown = false;
  expandSettingsDropdown = false;
  expandContactsDropdown = false;
  expandCompanyDetailsDropdown = false;
  showHideDropdowns = () => {
    const url = this.router.url;
    if (url.includes(PROSPECTING)) {
      this.expandProspectingDropdown = true;
    }
    if (url.includes(PROMOTION)) {
      this.expandPromotionDropdown = true;
    }
    if (url.includes(DRIP_CAMPAIGN)) {
      this.expandDripCampaignDropdown = true;
    }
    if (url.includes(CONTACTS)) {
      this.expandContactsDropdown = true;
    }
    if (url.includes(COMPANY_DETAILS)) {
      this.expandCompanyDetailsDropdown = true;
    }
    if (
      url.includes(routeConstants.BRAND.INVITE_PEOPLE) ||
      url.includes(routeConstants.BRAND.SUPPRESSION_LIST) ||
      url.includes(routeConstants.BRAND.SLACK_INTEGRATION) ||
      url.includes(routeConstants.BRAND.SMTP_SETTINGS)
    ) {
      this.expandSettingsDropdown = true;
    }
  };

  handleLogout() {
    this._authService.logout();
    this.modal.dismissAll();
    window.location.href = routeConstants.BASE_URL + routeConstants.LOGIN;
  }

  subscriptionsTapped() {
    // this.modal.open(subscriptionModalContent, { size: "lg" });

    this.router.navigate([routeConstants.BRAND.SUBSCRIPTION]);
  }

  editProfileTapped() {
    this.router.navigate([routeConstants.BRAND.EDIT_PROFILE]);
  }

  editCompanyTapped() {
    this.router.navigate([routeConstants.BRAND.EDIT_COMPANY]);
  }

  support = () => {
    this.userToken.subscribe(user => {
      Gleap.identify(user.id.toString(), {
        name: user.firstName + " " + user.lastName,
        email: user.email,
        customData: {
          supplier_name: user.supplier_name,
          supplier_id: user.supplier_id,
        },
      });
      Gleap.open();
    });
  };

  tutorialsNavItemClicked = () => {
    this.modal.open(KexyTutorialModalContentComponent, { size: "lg" });
  };

  protected readonly constants = constants;
  protected readonly features = dripCampaignInitialModalData;
}
