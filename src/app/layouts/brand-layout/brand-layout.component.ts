import { Component, OnInit, ViewChild, Input, ElementRef, HostListener } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
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
  LANDING_PAGE,
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

/** One step in the header's breadcrumb trail. `link` is a routeConstants path. */
export interface IBreadcrumb {
  label: string;
  /** Omit on the current (last) page, or for a step that isn't navigable. */
  link?: string;
}

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
    NgbDropdownToggle,
    RouterLink
  ],
  templateUrl: './brand-layout.component.html',
  styleUrl: './brand-layout.component.scss'
})
export class BrandLayoutComponent implements OnInit {
  @Input() layoutPaddingNone;
  @Input() fullPageScroll = true;
  @Input() headerBgWhite;
  @Input() mainBgColor = "#f4f6fb";
  @Input() showBackButton = false;
  /**
   * Overrides the route's title when a page needs a DYNAMIC one (e.g.
   * `brand-list-contacts` shows the list's own name). Everything else leaves this
   * empty and gets its name from `data.title` on the route.
   */
  @Input() headline = "";

  /**
   * Page name shown in the header beside the sidebar toggle, read from the activated
   * route's `data.title` (declared in `app.routes.ts`).
   *
   * Route data rather than 24 pages each passing an `@Input()`: the title then lives
   * next to the route it names, and a new page gets one for free by declaring it there.
   * Resolved ONCE in the constructor — this layout is re-created on every navigation
   * (the same reason `.sidebar`'s width transition has to be gated after first paint),
   * so there is no stale-title case to subscribe for.
   */
  routeTitle = "";

  /**
   * Optional breadcrumb trail, replacing the plain title in the header. For pages that
   * are a child of another (a list's contacts under Manage Lists), where the title
   * alone loses the parent context and the back arrow is the only clue where you came
   * from.
   *
   * The LAST entry is the current page and renders as the `<h1>`; earlier entries with
   * a `link` become router links. Pass it whole, not per-crumb, so the trail is built
   * where the data is (the page knows the list's name; the layout doesn't).
   */
  @Input() breadcrumbs: IBreadcrumb[] = [];

  /** What the header renders when there is no breadcrumb trail. */
  get pageTitle(): string {
    return this.headline || this.routeTitle;
  }

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
  /** Sidebar icon-rail state (persisted; forced on for small screens). */
  sidebarCollapsed = localStorage.getItem("kxSidebarCollapsed") === "true";
  /**
   * Gates the sidebar width transition. The layout is re-created on every
   * navigation, so on (re)mount the rail must render at its final width
   * INSTANTLY — otherwise the `width` transition replays each page change
   * (rail flashes open then snaps back to the collapsed icon rail). Enabled only
   * after the first paint (`ngAfterViewInit`), so user toggles still animate.
   */
  sidebarAnimate = false;
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
    private route: ActivatedRoute,
    private modal: NgbModal,
    private pageUiService: PageUiService,
    private prospectingService: ProspectingService,
  ) {
    this.userTokenSubject = new BehaviorSubject(JSON.parse(localStorage.getItem("userToken")));
    this.userToken = this.userTokenSubject.asObservable();
    this.showHideDropdowns();
    this.routeTitle = this.__resolveRouteTitle();
  }

  /**
   * Walk to the DEEPEST activated child before reading `data.title`. `this.route` is
   * the layout's own (shallow) route; a title declared on a child route would be
   * missed by reading only that level.
   */
  private __resolveRouteTitle(): string {
    let route = this.route?.snapshot;
    while (route?.firstChild) route = route.firstChild;
    return route?.data?.["title"] || "";
  }

  get username(): string {
    return this.userData ? this.userData.firstName + " " + this.userData.lastName : "";
  }

  /** Two-letter initials for the header avatar (falls back to "U"). */
  get userInitials(): string {
    const f = this.userData?.firstName?.charAt(0) || "";
    const l = this.userData?.lastName?.charAt(0) || "";
    return (f + l).toUpperCase() || "U";
  }

  /** Hosted profile-photo URL if the user has uploaded one, else '' (→ initials). */
  get userAvatarUrl(): string {
    const logo = (this.userData as any)?.logoImage?.name;
    return logo ? environment.imageUrl + logo : "";
  }

  /** Signed-in user's email, for the dropdown header. */
  get userEmail(): string {
    return this.userData?.email || "";
  }

  /** Signed-in user's role label, for the dropdown header badge. */
  get userRole(): string {
    return this.userData?.role || "";
  }

  /** True whenever the sidebar is a collapsed icon rail (any screen size). */
  get railCollapsed(): boolean {
    return this.sidebarCollapsed;
  }

  /** Top arrow: toggle between the icon rail and the full sidebar. */
  toggleSidebar = () => {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem("kxSidebarCollapsed", String(this.sidebarCollapsed));
  };

  async ngOnInit() {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;

    if (this.screenWidth < this.mobileScreenSize) {
      this.isMobileScreen = true;
      // Small screens default to the collapsed icon rail.
      this.sidebarCollapsed = true;
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

  ngAfterViewInit() {
    // Enable the width transition only AFTER the initial render so the rail
    // renders at its final (collapsed/expanded) width instantly on mount — no
    // open-then-collapse flash when navigating between pages.
    setTimeout(() => (this.sidebarAnimate = true));
  }

  @HostListener("window:resize")
  onWindowResize() {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;

    const nowMobile = this.screenWidth < this.mobileScreenSize;
    // Only react when we cross the breakpoint so a manual toggle within the
    // same mode isn't clobbered on every resize tick.
    if (nowMobile !== this.isMobileScreen) {
      this.isMobileScreen = nowMobile;
      // Entering small screens collapses to the rail; leaving restores the
      // saved desktop preference.
      this.sidebarCollapsed = nowMobile
        ? true
        : localStorage.getItem("kxSidebarCollapsed") === "true";
    }
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
    if (url.includes(LANDING_PAGE)) {
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
      url.includes(routeConstants.BRAND.NEGATIVE_PROMPTS) ||
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
