import {Component, Input, OnInit} from "@angular/core";
import { constants } from "../../helpers/constants";
import {CommonModule, DatePipe, NgClass} from "@angular/common";
import { NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import {FormControl, FormGroup, FormsModule, Validators} from "@angular/forms";
import Swal from "sweetalert2";
import { AuthService } from "../../services/auth.service";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { Subscription } from "rxjs";
import { CampaignService } from "../../services/campaign.service";
import { ActivatedRoute } from "@angular/router";
import { ProspectingService } from "../../services/prospecting.service";
import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
import {
  DripCampaignPromotionsTableComponent
} from '../drip-campaign-promotions-table/drip-campaign-promotions-table.component';
import {CampaignLayoutBottmBtnsComponent} from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import {CreateDripCampaignTitleComponent} from '../create-drip-campaign-title/create-drip-campaign-title.component';
import {AddCalendlyLinkContentComponent} from '../add-calendly-link-content/add-calendly-link-content.component';
import {AddWebsiteContentComponent} from '../add-website-content/add-website-content.component';
import { LandingPage } from '../../models/LandingPage';
import {DripCampaign} from '../../models/DripCampaign';

@Component({
  selector: 'drip-campaign-content',
  imports: [
    KexySelectDropdownComponent,
    FormsModule,
    ErrorMessageCardComponent,
    DripCampaignPromotionsTableComponent,
    NgClass,
    CampaignLayoutBottmBtnsComponent,
    CommonModule
  ],
  templateUrl: './drip-campaign-content.component.html',
  styleUrl: './drip-campaign-content.component.scss'
})
export class DripCampaignContentComponent implements OnInit {
  @Input() nextBtnClick;
  @Input() backBtnClick;

  public userData;
  public emailTones = constants.EMAIL_TONES;
  public selectedEmailToneKey;
  public campaignTitles = [];
  public selectedTitle: string;
  public selectedTitleId;
  public numberOfEmail;
  public promotionId;
  public promotionTitles;
  public promotionsData = [];
  public primaryForm: FormGroup;
  public page = 1;
  public limit = 10;
  public totalPageCounts;
  public totalPages = [];
  // public paginationUrl = routeConstants.BASE_URL + routeConstants.BRAND.CREATE_DRIP_CAMPAIGN;
  public submitted: boolean = false;
  public isWaitingFlag: boolean = true;
  public dripCampaignDuplicate: boolean = false;
  public dripCampaignId;
  public calendlyLinkOptions = [];
  public selectedCalendlyLinkKey = "";
  public websitesOptions = [];
  public selectedWebsiteKey = "";
  public selectedDripCampaignType = constants.COMPANIES;
  public targetAudience = "";
  public whatDoYouCover = "";
  public emailLengthKeys = constants.EMAIL_LENGTH_KEYS;
  public selectedEmailLength;

  public dripCampaignTitlesSubscription: Subscription;
  public calendlyLinkSubscription: Subscription;
  public websiteSubscription: Subscription;


  constructor(
    private route: ActivatedRoute,
    private ngbOffcanvas: NgbOffcanvas,
    private _authService: AuthService,
    private dripCampaignService: DripCampaignService,
    private campaignService: CampaignService,
    private prospectingService: ProspectingService,
    // private datePipe: DatePipe,
  ) {
  }

  async ngOnInit() {
    // this.selectedDripCampaignType = this.dripCampaignService.selectedDripCampaignType;
    this.route.queryParams.subscribe((params) => {
      if (params["id"]) {
        this.dripCampaignId = params["id"];
      }
      if (params["action"] && params["action"] === constants.DUPLICATE) {
        this.dripCampaignDuplicate = true;
      }
    });

    this.userData = this._authService.userTokenValue;
    this.whatDoYouCover = constants.WHO_COVER;
    await this.setFormGroupField();
    await this.getAndSetDripCampaignTitleSubscription();
    this.prospectingService.getCalendlyLinks();
    this.prospectingService.getWebsites();
    this.setCalendlyLinkOptions();
    this.setWebsiteOptions();

    if (this.dripCampaignId) {
      this.setPreviousData();
    }
    await this.getListOfPromotion();

    // Set 1st index as the default which is 'short' if not find anything in service for this field
    const emailLength = this.dripCampaignService.getEmailLength();
    if (emailLength) {
      const index = this.emailLengthKeys.findIndex(i => i.key === emailLength);
      this.onEmailLengthSelect(this.emailLengthKeys[index]);
    } else {
      this.onEmailLengthSelect(this.emailLengthKeys[0]);
    }

    this.isWaitingFlag = false;
  }

  ngOnDestroy(): void {
    if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
    if (this.calendlyLinkSubscription) this.calendlyLinkSubscription.unsubscribe();
    if (this.websiteSubscription) this.websiteSubscription.unsubscribe();
  }

  setPreviousData = () => {
    let dripCampaign: DripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    console.log('dripCampaign', dripCampaign);
    let data = dripCampaign.details;
    if (!Object.keys(data).length) return;

    if (!this.dripCampaignDuplicate) {
      // const titleIndex = this.campaignTitles.findIndex(i => i.id === data["drip_campaign_title_id"]);
      // if (titleIndex > -1) this.selectedTitle = this.campaignTitles[titleIndex].value;
      this.selectedTitle = data.title.title;
      this.selectedTitleId = data.title.id;
    }
    this.selectedEmailToneKey = data.emailTone;
    this.numberOfEmail = data.numberOfEmails;
    this.promotionId = data.campaignId;
    this.selectedWebsiteKey = data.websiteUrl ? data.websiteUrl : "";
    this.selectedCalendlyLinkKey = data.calendlyLink ? data.calendlyLink : "";
    this.whatDoYouCover = dripCampaign.emailAbout;
    this.targetAudience = dripCampaign.targetAudience;
    // this.selectedDripCampaignType = dripCampaign["audience_type"];
  };

  getListOfPromotion = async () => {
    this.promotionsData = [];
    let postData = {
      page: this.page,
      supplier_id: this.userData.supplier_id,
      limit: this.limit,
      get_total_count: true,
      status: constants.ACTIVE,
    };
    let data = await this.campaignService.getListOfLandingPage(postData);
    if (!data["landingPages"] || !data["landingPages"].length) return;

    this.promotionTitles = await this.campaignService.getAllCampaignTitle();

    this.totalPageCounts = data["totalPageCounts"];
    this.calculatePages();
    data["landingPages"].map(item => {
      const obj = {
        id: item.id,
        title_of_campaign: item.detail.title.title,
        promotion_type: item.detail.landingPageType,
        date_created: item.createdAt,
        promotion_data: item,
      };
      this.promotionsData.push(obj);
    });
  };

  onEmailLengthSelect = (selectedValue, index = null, rowIndex = null) => {
    this.selectedEmailLength = selectedValue;
    this.dripCampaignService.setEmailLength(selectedValue.key);
  };

  setCalendlyLinkOptions = async () => {
    this.calendlyLinkSubscription = this.prospectingService.calendlyLinks.subscribe((data) => {
      this.calendlyLinkOptions = [];
      data.map((item, index) => {
        this.calendlyLinkOptions.push({ key: `link${index}`, value: item });
      });
    });
  };

  setWebsiteOptions = async () => {
    this.websiteSubscription = this.prospectingService.websites.subscribe((data) => {
      this.websitesOptions = [];
      data.map((item, index) => {
        this.websitesOptions.push({ key: `website${index}`, value: item });
      });
    });
  };

  // getCampaignTitle = (title_id) => {
  //   const index = this.promotionTitles && this.promotionTitles.findIndex(i => i.id.toString() === title_id.toString());
  //   if (index < 0) return;
  //
  //   return this.promotionTitles[index].title;
  // };

  getAndSetDripCampaignTitleSubscription = async () => {
    // Get dripCampaignTitles api call
    const postData = {
      companyId: this.userData.supplier_id,
      titleType: "drip"
    }
    await this.dripCampaignService.getAllDripCampaignTitle(postData);

    // Set campaignTitle subscription
    this.dripCampaignTitlesSubscription = this.dripCampaignService.dripCampaignTitles.subscribe((campaignTitles) => {
      this.campaignTitles = campaignTitles;
      this.campaignTitles.map((i) => {
        i.value = i.title.length > 100 ? i.title.slice(0, 100) + "..." : i.title;
      });
    });
  };

  onEmailToneSelect = (tone, index = null, rowIndex = null) => {
    this.selectedEmailToneKey = tone.value;
  };

  onDripCampaignTitleSelect = (title, index = null, rowIndex = null) => {
    this.selectedTitle = title.value;
    this.selectedTitleId = title.id;
  };

  handleDeleteDripCampaignTitle = async (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    const confirmed = await this.__isDeleteConfirmed();
    if (!confirmed) return;

    const postData = {
      supplier_id: this.userData.supplier_id,
      title_id: data.id,
    };

    try {
      await this.dripCampaignService.deleteDripCampaignTitle(postData);

      // If selected data gets deleted then we need to empty selected field
      if (this.selectedTitle && data.id === this.selectedTitleId) {
        this.selectedTitle = "";
        this.selectedTitleId = "";
      }

    } catch (e) {
      Swal.fire("Error", e.message, "error");
    }
  };

  handleEditDripCampaignTitle = (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    // Set selected item in service and open canvas
    this.dripCampaignService.setEditDripCampaignTitleItem(data);
    this.openCreateDripCampaignTitleCanvas();
  };


  __isDeleteConfirmed = async () => {
    let isConfirm = await Swal.fire({
      title: `Are you sure?`,
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    return !isConfirm.dismiss;
  };


  __createRightSideSlide = (Component) => {
    this.ngbOffcanvas.open(Component, {
      panelClass: "attributes-bg edit-rep-canvas",
      backdropClass: "edit-rep-canvas-backdrop",
      position: "end",
      scroll: false,
    });
  };

  openCreateDripCampaignTitleCanvas = () => {
    this.__createRightSideSlide(CreateDripCampaignTitleComponent);
  };

  setFormGroupField = async () => {
    // Check previous data in service

    this.primaryForm = new FormGroup({
      dripCampaignTitle: new FormControl(
        "",
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(50),
        ]),
      ),
    });
  };

  receivedPromotion = (data) => {
    if (this.promotionId === data.id) {
      this.promotionId = "";
    } else {
      this.promotionId = data.id;
    }
  };

  receivedLimitNumber = async (limit) => {
    this.limit = limit;
    this.page = 1;

    this.isWaitingFlag = true;
    await this.getListOfPromotion();
    this.isWaitingFlag = false;
  };

  async goToPage(page) {
    if (page === this.page) return;
    if (page > this.totalPageCounts) return;
    if (page === 0) return;
    this.isWaitingFlag = true;
    this.page = page;
    this.calculatePages();
    await this.getListOfPromotion();
    this.isWaitingFlag = false;
  }

  calculatePages() {
    this.totalPages = [];
    for (let i = 1; i <= this.totalPageCounts; i++) {
      this.totalPages.push({
        page: i,
        isActive: i === this.page,
      });
    }
  }

  onChangeNumberOfEmail = (e) => {
    if (this.numberOfEmail < 1) this.numberOfEmail = 1;
  };

  openAddCalendlyLinkCanvas = () => {
    this.ngbOffcanvas.open(AddCalendlyLinkContentComponent, {
      panelClass: "attributes-bg edit-rep-canvas",
      backdropClass: "edit-rep-canvas-backdrop",
      position: "end",
      scroll: false,
    });
  };

  onCalendlyLinkSelect = (calendlyLink, index, rowIndex) => {
    this.selectedCalendlyLinkKey = calendlyLink.value;
  };

  openAddWebsiteCanvas = () => {
    this.ngbOffcanvas.open(AddWebsiteContentComponent, {
      panelClass: "attributes-bg edit-rep-canvas",
      backdropClass: "edit-rep-canvas-backdrop",
      position: "end",
      scroll: false,
    });
  };

  onWebsiteSelect = (website, index, rowIndex) => {
    this.selectedWebsiteKey = website.value;
    // localStorage.setItem(constants.SALES_LEAD_PRODUCT_WEBSITE, website.value);
  };

  handleDeleteWebsite = async (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    let isConfirm = await Swal.fire({
      title: `Do you want to delete this website url?`,
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (isConfirm.dismiss) {
      return;
    }

    this.prospectingService.deleteSpecificWebsite(data.value, this.userData.supplier_id);

    // If selected data gets deleted then we need to empty selected field
    if (this.selectedWebsiteKey && data.value === this.selectedWebsiteKey) {
      this.selectedWebsiteKey = "";
    }
  };

  handleDeleteCalendlyLink = async (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    let isConfirm = await Swal.fire({
      title: `Do you want to delete this link?`,
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (isConfirm.dismiss) {
      return;
    }

    this.prospectingService.deleteSpecificCalendlyLink(data.value, this.userData.supplier_id);

    // If selected data gets deleted then we need to empty selected field
    if (this.selectedCalendlyLinkKey && data.value === this.selectedCalendlyLinkKey) {
      this.selectedCalendlyLinkKey = "";
    }
  };

  handleClickNextButton = async () => {
    this.submitted = true;

    // Form validation
    if (!this.selectedTitle || !this.selectedEmailToneKey || !this.numberOfEmail || !this.selectedWebsiteKey || !this.targetAudience) {
      return;
    }

    const payload = {
      dripCampaignId: parseInt(this.dripCampaignId) || "",
      companyId: this.userData.supplier_id,
      dripCampaignTitleId: this.selectedTitleId,
      numberOfEmails: this.numberOfEmail,
      emailTone: this.selectedEmailToneKey,
      emailLength: this.selectedEmailLength.value,
      websiteUrl: this.selectedWebsiteKey,
      campaignId: this.promotionId || "",
      targetAudience: this.targetAudience,
      emailAbout: this.whatDoYouCover,
      audienceType: this.selectedDripCampaignType,
    };
    if (this.dripCampaignDuplicate) {
      payload["dripCampaignDuplicate"] = true;
      // payload.dripCampaignId = this.dripCampaignId;
    }
    if (this.selectedCalendlyLinkKey) {
      payload["calendlyLink"] = this.selectedCalendlyLinkKey;
    }
    console.log({ payload });
    const dripCampaign = await this.dripCampaignService.createOrUpdateDripCampaign(payload);
    this.dripCampaignId = dripCampaign["id"];
    const postData = {
      drip_campaign_id: this.dripCampaignId,
      supplier_id: this.userData.supplier_id,
    };
    await this.dripCampaignService.getCampaign(postData);

    // Navigate to the next page
    this.nextBtnClick(this.dripCampaignId, true);
  };

  protected readonly constants = constants;
}


// import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
// import { constants } from '../../helpers/constants';
// import {CommonModule, DatePipe} from '@angular/common';
// import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
// import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
// import Swal from 'sweetalert2';
// import { AuthService } from '../../services/auth.service';
// import { DripCampaignService } from '../../services/drip-campaign.service';
// import { Subscription } from 'rxjs';
// import { CampaignService } from '../../services/campaign.service';
// import { ActivatedRoute } from '@angular/router';
// import { ProspectingService } from '../../services/prospecting.service';
// import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
// import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
// import { DripCampaignPromotionsTableComponent } from '../drip-campaign-promotions-table/drip-campaign-promotions-table.component';
// import { CampaignLayoutBottmBtnsComponent } from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
// import { CreateDripCampaignTitleComponent } from '../create-drip-campaign-title/create-drip-campaign-title.component';
// import { AddCalendlyLinkContentComponent } from '../add-calendly-link-content/add-calendly-link-content.component';
// import { AddWebsiteContentComponent } from '../add-website-content/add-website-content.component';
//
// @Component({
//   selector: 'drip-campaign-content',
//   standalone: true,
//   imports: [
//     CommonModule,
//     KexySelectDropdownComponent,
//     FormsModule,
//     ReactiveFormsModule,
//     ErrorMessageCardComponent,
//     DripCampaignPromotionsTableComponent,
//     CampaignLayoutBottmBtnsComponent,
//   ],
//   templateUrl: './drip-campaign-content.component.html',
//   styleUrl: './drip-campaign-content.component.scss'
// })
// export class DripCampaignContentComponent implements OnInit, OnDestroy {
//   @Input() nextBtnClick: (dripCampaignId: string, isValid: boolean) => void;
//   @Input() backBtnClick: () => void;
//
//   // Signals for reactive state
//   userData = signal<any>(null);
//   emailTones = constants.EMAIL_TONES;
//   selectedEmailToneKey = signal<string>('');
//   campaignTitles = signal<any[]>([]);
//   selectedTitle = signal<string>('');
//   selectedTitleId = signal<string>('');
//   numberOfEmail: number;
//   promotionId = signal<string>('');
//   promotionsData = signal<any[]>([]);
//   primaryForm: FormGroup;
//   page = signal(1);
//   limit = signal(10);
//   totalPageCounts = signal(0);
//   totalPages = signal<any[]>([]);
//   isWaitingFlag = signal(true);
//   dripCampaignDuplicate = signal(false);
//   dripCampaignId = signal<string>('');
//   calendlyLinkOptions = signal<any[]>([]);
//   selectedCalendlyLinkKey = signal<string>('');
//   websitesOptions = signal<any[]>([]);
//   selectedWebsiteKey = signal<string>('');
//   selectedDripCampaignType = signal<string>(constants.COMPANIES);
//   targetAudience = signal<string>('');
//   whatDoYouCover = signal<string>(constants.WHO_COVER);
//   emailLengthKeys = constants.EMAIL_LENGTH_KEYS;
//   selectedEmailLength = signal<any>(null);
//   submitted = signal(false);
//
//   // Computed properties
//   filteredCampaignTitles = computed(() => {
//     return this.campaignTitles().map(i => ({
//       ...i,
//       value: i.title.length > 100 ? i.title.slice(0, 100) + "..." : i.title
//     }));
//   });
//
//   private subscriptions: Subscription = new Subscription();
//
//   constructor(
//     private route: ActivatedRoute,
//     private ngbOffcanvas: NgbOffcanvas,
//     private authService: AuthService,
//     private dripCampaignService: DripCampaignService,
//     private campaignService: CampaignService,
//     private prospectingService: ProspectingService,
//   ) {}
//
//   ngOnInit = async () => {
//     this.userData.set(this.authService.userTokenValue);
//
//     this.route.queryParams.subscribe((params) => {
//       if (params["id"]) {
//         this.dripCampaignId.set(params["id"]);
//       }
//       if (params["action"] && params["action"] === constants.DUPLICATE) {
//         this.dripCampaignDuplicate.set(true);
//       }
//     });
//
//     await this.initializeForm();
//     await this.setupSubscriptions();
//
//     if (this.dripCampaignId()) {
//       this.setPreviousData();
//     }
//     await this.getListOfPromotion();
//
//     // Set default email length
//     const emailLength = this.dripCampaignService.getEmailLength();
//     const index = emailLength
//       ? this.emailLengthKeys.findIndex(i => i.key === emailLength)
//       : 0;
//     this.onEmailLengthSelect(this.emailLengthKeys[index]);
//
//     this.isWaitingFlag.set(false);
//   }
//
//   ngOnDestroy = (): void => {
//     this.subscriptions.unsubscribe();
//   }
//
//   private setupSubscriptions = async () => {
//     // Get and set drip campaign titles
//     await this.dripCampaignService.getAllDripCampaignTitle({ supplier_id: this.userData().supplier_id });
//
//     this.subscriptions.add(
//       this.dripCampaignService.dripCampaignTitles.subscribe(titles => {
//         this.campaignTitles.set(titles);
//       })
//     );
//
//     // Set up calendly links subscription
//     this.prospectingService.getCalendlyLinks();
//     this.subscriptions.add(
//       this.prospectingService.calendlyLinks.subscribe(links => {
//         this.calendlyLinkOptions.set(
//           links.map((item, index) => ({ key: `link${index}`, value: item }))
//         );
//       })
//     );
//
//     // Set up websites subscription
//     this.prospectingService.getWebsites();
//     this.subscriptions.add(
//       this.prospectingService.websites.subscribe(websites => {
//         this.websitesOptions.set(
//           websites.map((item, index) => ({ key: `website${index}`, value: item }))
//         );
//       })
//     );
//   }
//
//   private initializeForm = async () => {
//     this.primaryForm = new FormGroup({
//       dripCampaignTitle: new FormControl('', [
//         Validators.required,
//         Validators.minLength(0),
//         Validators.maxLength(50)
//       ])
//     });
//   }
//
//   private setPreviousData = () => {
//     const dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
//     const data = dripCampaign["drip_campaign_detail"];
//     if (!Object.keys(data).length) return;
//
//     if (!this.dripCampaignDuplicate()) {
//       const titleIndex = this.campaignTitles().findIndex(i => i.id === data["drip_campaign_title_id"]);
//       if (titleIndex > -1) {
//         this.selectedTitle.set(this.campaignTitles()[titleIndex].value);
//         this.selectedTitleId.set(data["drip_campaign_title_id"]);
//       }
//     }
//
//     this.selectedEmailToneKey.set(data["email_tone"]);
//     this.numberOfEmail = data["number_of_emails"];
//     this.promotionId.set(data["campaign_id"]);
//     this.selectedWebsiteKey.set(data["website_url"] || "");
//     this.selectedCalendlyLinkKey.set(data["calendly_link"] || "");
//     this.whatDoYouCover.set(dripCampaign["email_about"]);
//     this.targetAudience.set(dripCampaign["target_audience"]);
//   }
//
//   getListOfPromotion = async () => {
//     this.promotionsData.set([]);
//
//     const postData = {
//       page: this.page(),
//       supplier_id: this.userData().supplier_id,
//       limit: this.limit(),
//       get_total_count: true,
//       status: constants.ACTIVE,
//     };
//
//     try {
//       const data = await this.campaignService.getListOfLandingPage(postData);
//       if (!data["promotions"]?.length) return;
//
//       const promotionTitles: any = await this.campaignService.getAllCampaignTitle({
//         supplier_id: this.userData().supplier_id
//       });
//
//       this.totalPageCounts.set(data["totalPageCounts"]);
//       this.calculatePages();
//
//       const processedData = data["promotions"].map(item => ({
//         id: item.id,
//         title_of_campaign: this.getCampaignTitle(item.campaign_title_text, promotionTitles),
//         promotion_type: item.campaign.campaign_detail.campaign_type,
//         date_created: item.campaign.created_at,
//         promotion_data: item,
//       }));
//
//       this.promotionsData.set(processedData);
//     } catch (error) {
//       console.error('Error fetching promotions:', error);
//     }
//   }
//
//   private getCampaignTitle = (title_id: string, promotionTitles: any[]): string => {
//     const index = promotionTitles?.findIndex(i => i.id.toString() === title_id.toString());
//     return index >= 0 ? promotionTitles[index].title : '';
//   }
//
//   onEmailLengthSelect = (selectedValue: any): void => {
//     this.selectedEmailLength.set(selectedValue);
//     this.dripCampaignService.setEmailLength(selectedValue.key);
//   }
//
//   onEmailToneSelect = (tone: any): void => {
//     this.selectedEmailToneKey.set(tone.value);
//   }
//
//   onDripCampaignTitleSelect = (title: any): void => {
//     this.selectedTitle.set(title.value);
//     this.selectedTitleId.set(title.id);
//   }
//
//   handleDeleteDripCampaignTitle = async (data: any, event: Event): Promise<void> => {
//     event.stopPropagation();
//
//     const confirmed = await this.showDeleteConfirmation();
//     if (!confirmed) return;
//
//     try {
//       await this.dripCampaignService.deleteDripCampaignTitle({
//         supplier_id: this.userData().supplier_id,
//         title_id: data.id,
//       });
//
//       if (this.selectedTitleId() === data.id) {
//         this.selectedTitle.set('');
//         this.selectedTitleId.set('');
//       }
//     } catch (error) {
//       Swal.fire("Error", error.message, "error");
//     }
//   }
//
//   handleEditDripCampaignTitle = (data: any, event: Event): void => {
//     event.stopPropagation();
//     this.dripCampaignService.setEditDripCampaignTitleItem(data);
//     this.openCreateDripCampaignTitleCanvas();
//   }
//
//   private showDeleteConfirmation = async (): Promise<boolean> => {
//     const result = await Swal.fire({
//       title: 'Are you sure?',
//       text: "You won't be able to revert this!",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#3085d6",
//       cancelButtonColor: "#d33",
//       confirmButtonText: "Yes, delete it!",
//     });
//     return result.isConfirmed;
//   }
//
//   openRightSideSlide = (component: any): void => {
//     this.ngbOffcanvas.open(component, {
//       panelClass: "attributes-bg edit-rep-canvas",
//       backdropClass: "edit-rep-canvas-backdrop",
//       position: "end",
//       scroll: false,
//     });
//   }
//
//   openCreateDripCampaignTitleCanvas = (): void => {
//     this.openRightSideSlide(CreateDripCampaignTitleComponent);
//   }
//
//   receivedPromotion = (data: any): void => {
//     this.promotionId.set(this.promotionId() === data.id ? '' : data.id);
//   }
//
//   receivedLimitNumber = async (limit: number): Promise<void> => {
//     this.limit.set(limit);
//     this.page.set(1);
//     this.isWaitingFlag.set(true);
//     await this.getListOfPromotion();
//     this.isWaitingFlag.set(false);
//   }
//
//   goToPage = async (pageNum: number): Promise<void> => {
//     if (pageNum === this.page() || pageNum > this.totalPageCounts() || pageNum === 0) return;
//
//     this.isWaitingFlag.set(true);
//     this.page.set(pageNum);
//     this.calculatePages();
//     await this.getListOfPromotion();
//     this.isWaitingFlag.set(false);
//   }
//
//   calculatePages = (): void => {
//     const pages = [];
//     for (let i = 1; i <= this.totalPageCounts(); i++) {
//       pages.push({
//         page: i,
//         isActive: i === this.page(),
//       });
//     }
//     this.totalPages.set(pages);
//   }
//
//   onChangeNumberOfEmail = (event: Event): void => {
//     if (this.numberOfEmail < 1) this.numberOfEmail = 1;
//   }
//
//   openAddCalendlyLinkCanvas = (): void => {
//     this.openRightSideSlide(AddCalendlyLinkContentComponent);
//   }
//
//   onCalendlyLinkSelect = (calendlyLink: any): void => {
//     this.selectedCalendlyLinkKey.set(calendlyLink.value);
//   }
//
//   openAddWebsiteCanvas = (): void => {
//     this.openRightSideSlide(AddWebsiteContentComponent);
//   }
//
//   onWebsiteSelect = (website: any): void => {
//     this.selectedWebsiteKey.set(website.value);
//   }
//
//   handleDeleteWebsite = async (data: any, event: Event): Promise<void> => {
//     event.stopPropagation();
//
//     const confirmed = await this.showDeleteConfirmation();
//     if (!confirmed) return;
//
//     this.prospectingService.deleteSpecificWebsite(data.value, this.userData().supplier_id);
//
//     if (this.selectedWebsiteKey() === data.value) {
//       this.selectedWebsiteKey.set('');
//     }
//   }
//
//   handleDeleteCalendlyLink = async (data: any, event: Event): Promise<void> => {
//     event.stopPropagation();
//
//     const confirmed = await this.showDeleteConfirmation();
//     if (!confirmed) return;
//
//     this.prospectingService.deleteSpecificCalendlyLink(data.value, this.userData().supplier_id);
//
//     if (this.selectedCalendlyLinkKey() === data.value) {
//       this.selectedCalendlyLinkKey.set('');
//     }
//   }
//
//   handleClickNextButton = async (): Promise<void> => {
//     this.submitted.set(true);
//
//     // Form validation
//     if (!this.selectedTitle() || !this.selectedEmailToneKey() ||
//       !this.numberOfEmail || !this.selectedWebsiteKey() || !this.targetAudience()) {
//       return;
//     }
//
//     const payload = {
//       drip_campaign_id: this.dripCampaignId() || "",
//       supplier_id: this.userData().supplier_id,
//       allowed_credit_limit: 1,
//       drip_campaign_title_id: this.selectedTitleId(),
//       number_of_emails: this.numberOfEmail,
//       email_tone: this.selectedEmailToneKey(),
//       email_length: this.selectedEmailLength().value,
//       website_url: this.selectedWebsiteKey(),
//       calendly_link: this.selectedCalendlyLinkKey(),
//       campaign_id: this.promotionId() || "",
//       supplier_side: this.userData().side,
//       status: "",
//       establishment_search_type: "",
//       establishment_search_value: "",
//       target_audience: this.targetAudience(),
//       email_about: this.whatDoYouCover(),
//       audience_type: this.selectedDripCampaignType(),
//       ...(this.dripCampaignDuplicate() && { drip_campaign_duplicate: true })
//     };
//
//     try {
//       const dripCampaign = await this.dripCampaignService.createOrUpdateDripCampaign(payload);
//       this.dripCampaignId.set(dripCampaign["id"]);
//
//       await this.dripCampaignService.getCampaign({
//         drip_campaign_id: this.dripCampaignId(),
//         supplier_id: this.userData().supplier_id
//       });
//
//       this.nextBtnClick(this.dripCampaignId(), true);
//     } catch (error) {
//       console.error('Error creating/updating drip campaign:', error);
//       Swal.fire('Error', 'Failed to save drip campaign', 'error');
//     }
//   }
// }
