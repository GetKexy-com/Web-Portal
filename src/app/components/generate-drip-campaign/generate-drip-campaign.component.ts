import { AfterViewChecked, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { constants } from "../../helpers/constants";
import { NgbModal, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { AuthService } from "../../services/auth.service";
import { Subscription } from "rxjs";
import Swal from "sweetalert2";
import * as linkify from "linkifyjs";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { routeConstants } from "../../helpers/routeConstants";
import { ActivatedRoute, Router } from "@angular/router";
import { DripEmail } from "../../models/DripEmail";
import { SseService } from "../../services/sse.service";
import { ProspectingService } from "../../services/prospecting.service";
import { CampaignService } from "../../services/campaign.service";
import { DUMMY_PROSPECT } from "../../models/ProspectContact";
import { PageUiService } from "../../services/page-ui.service";
import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
import {ModalComponent} from '../modal/modal.component';
import {FormsModule} from '@angular/forms';
import {DripCampaignCardComponent} from '../drip-campaign-card/drip-campaign-card.component';
import {CampaignLayoutBottmBtnsComponent} from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import {KexyToastifyComponent} from '../kexy-toastify/kexy-toastify.component';
import {SendEmailDetailsContentComponent} from '../send-email-details-content/send-email-details-content.component';
import {EmailInsightsContentComponent} from '../email-insights-content/email-insights-content.component';
import {DelayDetailsContentComponent} from '../delay-details-content/delay-details-content.component';
import {ActiveContactsInCampaignComponent} from '../active-contacts-in-campaign/active-contacts-in-campaign.component';
import {EmailTimeSettingsContentComponent} from '../email-time-settings-content/email-time-settings-content.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'generate-drip-campaign',
  imports: [
    KexySelectDropdownComponent,
    KexyButtonComponent,
    ErrorMessageCardComponent,
    ModalComponent,
    FormsModule,
    DripCampaignCardComponent,
    CampaignLayoutBottmBtnsComponent,
    KexyToastifyComponent,
    CommonModule
  ],
  templateUrl: './generate-drip-campaign.component.html',
  styleUrl: './generate-drip-campaign.component.scss'
})
export class GenerateDripCampaignComponent {
  @Input() nextBtnClick;
  @Input() backBtnClick;
  userData;
  dripCampaignStatusSubscription: Subscription;
  dripCampaignProspectsSubscription: Subscription;
  emailsSubscription: Subscription;
  emailSubjectSubscription: Subscription;
  emailContentSubscription: Subscription;
  emailErrorSubscription: Subscription;
  emailContentLoadingSubscription: Subscription;
  productsSubscription: Subscription;
  products = [];
  isContentLoading: boolean;
  showToastifyMessage = false;
  disableScroll = true;
  emails = [];
  dripCampaignProspects: any = [];
  dripCampaignId;
  dripCampaign;
  dripCampaignStatus: string = "";
  numberOfEmail;
  numberOfEmailUpdateApiLoading: boolean = false;
  selectedPromotionsProductName: string = "";
  submittedTestEmailSend = false;
  isValidEmail = false;
  testEmailText;
  testEmailModalRef;
  isSendEmailLoading = false;
  emailShortener: boolean = false;
  emailLengthKeys = constants.EMAIL_LENGTH_KEYS;
  // Set first index which is "short" by default.
  selectedEmailLength;
  emailTones = constants.EMAIL_TONES;
  selectedEmailToneKey;

  constructor(
    private ngbOffcanvas: NgbOffcanvas,
    private router: Router,
    private modal: NgbModal,
    private sseService: SseService,
    private dripCampaignService: DripCampaignService,
    private prospectingService: ProspectingService,
    private campaignService: CampaignService,
    private _authService: AuthService,
    private route: ActivatedRoute,
  ) {
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params["id"]) {
        this.dripCampaignId = params["id"];
        this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
        console.log("dripCampaign", this.dripCampaign);
      }
    });

    this.userData = this._authService.userTokenValue;
    // Setting test email sending url if any
    this.testEmailText = localStorage.getItem(constants.TEST_EMAIL_URL);

    this.emailContentLoadingSubscription = this.sseService.dripBulkEmailLoading.subscribe((loading) => {
      this.isContentLoading = loading;
      // We have to set scroll false as when editing email content and
      // update the delay, we don't want to auto scroll
      this.disableScroll = !this.isContentLoading;

      if (!this.isContentLoading && this.emails.length) {
        this.showToastifyMessage = true;
        // Save the emails in DB
        this.__saveEmails("true").then(async () => {
          const postData = {
            drip_campaign_id: this.dripCampaignId,
            supplier_id: this.userData.supplier_id,
          };
          this.dripCampaign = await this.dripCampaignService.getCampaign(postData);
        });
      }
    });
    this.emailsSubscription = this.sseService.dripBulkEmails.subscribe((emails: DripEmail[]) => {
      this.emails = emails;
      this.emails.forEach(e => {
        const delay = e.delay_between_previous_email;
        e["emailText"] = `${delay.days} day(s) ${delay.hours} hour(s) ${delay.minutes} minute(s)`;
      });
      this.scroll = true;
      if (!this.disableScroll) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 10);
      }
    });
    this.dripCampaignStatusSubscription = this.dripCampaignService.dripCampaignStatus.subscribe(status => {
      this.dripCampaignStatus = status;
    });
    this.showAiEmailError();
    this.numberOfEmail = this.dripCampaign.drip_campaign_detail.number_of_emails;

    if (this.dripCampaign.drip_campaign_detail.campaign_id) {
      this.getCampaignThenProductName();
    }

    // Set 1st index as the default which is 'short' if not find anything in service for this field
    // const emailLength = this.dripCampaignService.getEmailLength();
    const emailLength = this.dripCampaign?.drip_campaign_detail?.email_length;
    if (emailLength) {
      const index = this.emailLengthKeys.findIndex(i => i.value === emailLength);
      this.onEmailLengthSelect(this.emailLengthKeys[index]);
    } else {
      this.onEmailLengthSelect(this.emailLengthKeys[0]);
    }

    // Set 1st index as the default which is 'Friendly' if not find anything in service for this field
    // const emailTone = this.dripCampaignService.selectedEmailTone;
    const emailTone = this.dripCampaign?.drip_campaign_detail?.email_tone;
    if (emailTone) {
      const index = this.emailTones.findIndex(i => i.value === emailTone);
      this.onEmailToneSelect(this.emailTones[index]);
    } else {
      this.onEmailToneSelect(this.emailTones[0]);
    }

    this.getDripCampaignProspects();
  }

  getDripCampaignProspects = async () => {
    const postData = {
      drip_campaign_id: this.dripCampaignId,
    };
    try {
      await this.dripCampaignService.getProspects(postData);
      this.dripCampaignProspectsSubscription = this.dripCampaignService.dripCampaignProspects.subscribe(prospects => {
        this.dripCampaignProspects = prospects;
      });

    } catch (e) {
      Swal.fire("Error", e.message);
    }
  };

  getEmailContactsInAction = (emailSequence) => {
    return this.dripCampaignProspects.filter(d => d.email_sequence === emailSequence);
  };

  onEmailLengthSelect = (selectedValue, index = null, rowIndex = null) => {
    console.log({ selectedValue });
    this.selectedEmailLength = selectedValue;
    this.dripCampaignService.setEmailLength(selectedValue.key);
  };

  getCampaignThenProductName = async () => {
    // Get campaign api call
    const postData = {
      campaign_id: this.dripCampaign.drip_campaign_detail.campaign_id,
      supplier_id: this.userData.supplier_id,
    };
    const campaign = await this.campaignService.getCampaign(postData);

    // Get products api call
    await this.prospectingService.getProducts({
      supplier_id: this.userData.supplier_id,
      page: 1,
      limit: 1000,
      get_total_count: "false",
    });

    // Set subscription to get up to date products
    this.productsSubscription = this.prospectingService.allProduct.subscribe((products) => {
      this.products = products;

      const index = this.products.findIndex(p => p.id === campaign["campaign_detail"].prospecting_product_id);
      if (index > -1) {
        this.selectedPromotionsProductName = this.products[index].name;
      }
    });
  };

  hideToastify = () => {
    this.showToastifyMessage = false;
  };

  // changeKexyBoostOption = (e) => {
  //   this.emailShortener = e.target.checked;
  // };

  ngAfterViewChecked() {
    if (!this.disableScroll)
      this.scrollToBottom();
  }

  ngOnDestroy(): void {
    if (this.emailErrorSubscription) this.emailErrorSubscription.unsubscribe();
    if (this.emailsSubscription) this.emailsSubscription.unsubscribe();
    if (this.emailContentSubscription) this.emailContentSubscription.unsubscribe();
    if (this.emailSubjectSubscription) this.emailSubjectSubscription.unsubscribe();
    if (this.emailContentLoadingSubscription) this.emailContentLoadingSubscription.unsubscribe();
    if (this.dripCampaignStatusSubscription) this.dripCampaignStatusSubscription.unsubscribe();
    if (this.productsSubscription) this.productsSubscription.unsubscribe();
    if (this.dripCampaignProspectsSubscription) this.dripCampaignProspectsSubscription.unsubscribe();
    if (this.dripCampaignStatus !== constants.ACTIVE) {
      this.sseService.removeDripBulkEmailData();
    }
  }

  generateEmailContent = async () => {
    this.emails = [];
    const data = {
      count: this.dripCampaign.drip_campaign_detail.number_of_emails,
      email_tone: this.selectedEmailToneKey || this.dripCampaign.drip_campaign_detail.email_tone,
      sender_name: this.userData.first_name + " " + this.userData.last_name,
      sender_number: this.userData.phone_country_code + this.userData.phone,
      sender_company_name: this.userData.supplier_name,
      sender_website: this.dripCampaign.drip_campaign_detail.website_url || "",
      sender_calendly_link: this.dripCampaign.drip_campaign_detail.calendly_link || "",
      sender_company_details: this.userData.company_description,
      sender_product_name: this.selectedPromotionsProductName,
      sender_product_category: "",
      sender_product_description: "",
      email_length: this.selectedEmailLength.key,
      target_audience: this.dripCampaign.target_audience,
      email_about: this.dripCampaign.email_about,
      promotion_info: !!this.selectedPromotionsProductName,
    };
    await this.sseService.dripBulkEmailContentStream(data);
  };

  showAiEmailError = () => {
    this.emailErrorSubscription = this.sseService.dripBulkEmailError.subscribe((content) => {
      if (content) {
        content = content.replaceAll(this.sseService.emailErrorSign, "");
        Swal.fire({
          title: `Error`,
          text: content,
          icon: "warning",
        });
      }
    });
  };

  showEmailDetailsBtnClick = (email) => {
    this.dripCampaignService.setEditEmail(email);
    this.dripCampaignService.setHasPromotion(!!this.selectedPromotionsProductName);
    this.__createRightSideSlide(SendEmailDetailsContentComponent, "email-content");
  };

  insightsBtnClick = (email) => {
    const insightApiPostData = {
      drip_campaign_id: parseInt(this.dripCampaignId),
      drip_campaign_email_id: email.id,
      supplier_id: this.userData.supplier_id,
    };
    this.dripCampaignService.insightApiPostData = insightApiPostData;
    this.__createRightSideSlide(EmailInsightsContentComponent, "email-insights");
  };

  showEmailDelayBtnClick = (email) => {
    this.dripCampaignService.setEditEmail(email);
    this.__createRightSideSlide(DelayDetailsContentComponent);
  };

  showDripCampaignContacts = (prospects) => {
    this.dripCampaignService.emailProspects = prospects;
    this.__createRightSideSlide(ActiveContactsInCampaignComponent, "email-content");
  };

  __createRightSideSlide = (Component, panelClass = "attributes-bg") => {
    this.ngbOffcanvas.open(Component, {
      panelClass: `${panelClass} edit-rep-canvas`,
      backdropClass: "edit-rep-canvas-backdrop",
      position: "end",
      scroll: false,
      beforeDismiss: async () => {
        return true;
      },
    });
  };

  openTestEmailPopUp = async (modalContent) => {
    this.testEmailModalRef = this.modal.open(modalContent);
  };

  getSettings = async () => {
    const postData = {
      supplier_id: this.userData.supplier_id,
      drip_campaign_id: this.dripCampaignId,
    };
    const data = await this.dripCampaignService.getSettings(postData);
    let enrollList;
    if (data && data["enrollment_triggers"]) {
      const enrollment = data["enrollment_triggers"];
      if (enrollment?.length) {
        enrollList = enrollment.filter(r => r.type === "enroll_list");
      }
    }
    return enrollList;
  };

  handleClickNextButton = async () => {
    if (!this.emails.length) {
      await Swal.fire({
        title: `Error`,
        text: "Please generate emails to active.",
        icon: "warning",
      });
      return;
    }

    const enrollList = await this.getSettings();
    if (!enrollList?.length) {
      this.openSettingsCanvas();
      await Swal.fire({
        title: `Error`,
        text: "Please select list(s) from enrollment triggers",
        icon: "warning",
      });
      return;
    }

    const confirmed = await this.__isConfirmed();
    if (!confirmed) return;

    const isSuccess = await this.__launchDripCampaign();
    if (isSuccess) {
      await Swal.fire({
        title: `Congratulations!`,
        text: "Drip campaign is now active.",
        icon: "success",
      });
      await this.router.navigate([routeConstants.BRAND.LIST_DRIP_CAMPAIGN]);
    }
  };

  __launchDripCampaign = async () => {
    try {
      // const assignContactPostData = {
      //   drip_campaign_id: this.dripCampaignId,
      //   supplier_id: this.userData.supplier_id,
      //   contacts: [],
      //   label_ids: [],
      //   notify: "true",
      // };
      // await this.dripCampaignService.assignContactsAndLabelsInCampaign(assignContactPostData);

      const postData = {
        drip_campaign_id: this.dripCampaignId,
        supplier_id: this.userData.supplier_id,
        notify: "true",
      };
      await this.dripCampaignService.activateDripCampaign(postData);
      return true;

    } catch (e) {
      await Swal.fire("Error", e.message);
      return false;
    }
  };

  __saveEmails = async (save = "false") => {
    const formattedEmails = [];
    this.emails.forEach((e, index) => {
      const email = {
        ...e,
        delay_between_previous_email: JSON.stringify(e.delay_between_previous_email),
        email_length: this.selectedEmailLength.value,
        email_tone: this.selectedEmailToneKey,
      };
      formattedEmails.push(email);
    });

    try {
      const postData = {
        drip_campaign_id: this.dripCampaignId,
        save_emails: "false",
        emails: formattedEmails,
      };
      if (save === "true") {
        postData["save_emails"] = "true";
      }
      await this.dripCampaignService.publishDripCampaign(postData);

    } catch (e) {
      await Swal.fire("Error", e.message);
    }

  };

  __isConfirmed = async () => {
    let isConfirm = await Swal.fire({
      title: `Ready to active?`,
      text: "Make sure all emails are in good shape.",
      icon: "success",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Active It!",
    });

    return !isConfirm.dismiss;
  };


  handleClickBackButton = () => {
    // Navigate to the previous page
    this.backBtnClick();
  };
  handleClickSaveDraft = async () => {
    // SHow sweet alert popup
    await Swal.fire({
      title: `Saved!`,
      text: "Save as draft successfully.",
      icon: "success",
    });
  };

  @ViewChild("emailSmoothScroll") private emailSmoothScroll: ElementRef;

  scroll = false;
  scrollToBottom = () => {
    if (!this.scroll) return;
    try {
      this.emailSmoothScroll.nativeElement.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        this.scroll = false;
      }, 5);
    } catch (err) {
    }
  };

  protected readonly constants = constants;

  pauseOrResumeDripCampaign = async () => {
    let isConfirm = await Swal.fire({
      title: "Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: this.dripCampaign.status === constants.ACTIVE ? "Yes, Pause!" : "Yes, Resume!",
    });

    if (isConfirm.dismiss) {
      return;
    }

    this.isContentLoading = true;
    const payload = {
      drip_campaign_id: this.dripCampaign.id,
      supplier_id: this.userData.supplier_id,
      allowed_credit_limit: this.dripCampaign.allowed_credit_limit,
      drip_campaign_title_id: this.dripCampaign.drip_campaign_detail.drip_campaign_title_id,
      number_of_emails: this.dripCampaign.drip_campaign_detail.number_of_emails,
      website_url: this.dripCampaign.drip_campaign_detail.website_url || "",
      calendly_link: this.dripCampaign.drip_campaign_detail.calendly_link || "",
      campaign_id: this.dripCampaign.drip_campaign_detail.campaign_id,
      supplier_side: this.dripCampaign.supplier_side,
      status: this.dripCampaign.status === constants.ACTIVE ? constants.PAUSE : constants.ACTIVE,
      establishment_search_type: this.dripCampaign.establishment_search_type,
      establishment_search_value: this.dripCampaign.establishment_search_value,
      target_audience: this.dripCampaign.target_audience,
      email_about: this.dripCampaign.email_about,
      audience_type: this.dripCampaign.audience_type,
      email_tone: this.selectedEmailToneKey,
      email_length: this.selectedEmailLength.value,
    };

    try {
      await this.dripCampaignService.createOrUpdateDripCampaign(payload);
      const postData = {
        drip_campaign_id: this.dripCampaignId,
        supplier_id: this.userData.supplier_id,
      };
      this.dripCampaign = await this.dripCampaignService.getCampaign(postData);

      this.isContentLoading = false;

    } catch (e) {
      console.log(e);
      this.isContentLoading = false;
    }
  };

  numberOfEmailsInputShow = false;
  handleShowHideNumberOfEmailsInput = () => {
    this.numberOfEmailsInputShow = !this.numberOfEmailsInputShow;
  };

  handleUpdateNumberOfEmail = async () => {
    this.numberOfEmailUpdateApiLoading = true;

    const payload = {
      drip_campaign_id: this.dripCampaign.id,
      supplier_id: this.dripCampaign.supplier_id,
      allowed_credit_limit: this.dripCampaign.allowed_credit_limit,
      drip_campaign_title_id: this.dripCampaign.drip_campaign_detail.drip_campaign_title_id,
      number_of_emails: this.numberOfEmail,
      email_tone: this.dripCampaign.drip_campaign_detail.email_tone,
      website_url: this.dripCampaign.drip_campaign_detail.website_url || "",
      calendly_link: this.dripCampaign.drip_campaign_detail.calendly_link || "",
      campaign_id: this.dripCampaign.drip_campaign_detail.campaign_id,
      supplier_side: this.dripCampaign.supplier_side,
      status: this.dripCampaign.status,
      establishment_search_type: this.dripCampaign.establishment_search_type,
      establishment_search_value: this.dripCampaign.establishment_search_value,
      target_audience: this.dripCampaign.target_audience,
      email_about: this.dripCampaign.email_about,
      audience_type: this.dripCampaign.audience_type,
      email_length: this.selectedEmailLength.value,
    };

    try {
      await this.dripCampaignService.createOrUpdateDripCampaign(payload);
      const postData = {
        drip_campaign_id: this.dripCampaignId,
        supplier_id: this.userData.supplier_id,
      };
      this.dripCampaign = await this.dripCampaignService.getCampaign(postData);
      this.numberOfEmailsInputShow = false;
      this.numberOfEmailUpdateApiLoading = false;
    } catch (e) {
      Swal.fire("Error", e.message, "error");
      this.numberOfEmailUpdateApiLoading = false;
    }
  };

  onChangeNumberOfEmail = (e) => {
    if (this.numberOfEmail < 1) this.numberOfEmail = 1;
  };

  handleSendTestEmail = async () => {
    this.submittedTestEmailSend = true;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    this.isValidEmail = emailPattern.test(this.testEmailText);
    if (!this.isValidEmail) return;

    this.isValidEmail = true;
    localStorage.setItem(constants.TEST_EMAIL_URL, this.testEmailText);

    this.isSendEmailLoading = true;
    setTimeout(() => {
      this.testEmailModalRef.close();
    }, 2000);

    const postData = {
      drip_campaign_id: this.dripCampaignId,
      email: this.testEmailText,
      prospect: DUMMY_PROSPECT,
    };
    try {
      await this.dripCampaignService.testDripCampaignEmail(postData);
      await Swal.fire({
        title: `Sent!`,
        text: "Emails sent successfully.",
        icon: "success",
      });
    } catch (e) {
      await Swal.fire({
        title: `Error`,
        text: e.getMessages(),
        icon: "warning",
      });
    } finally {
      this.isSendEmailLoading = false;
    }
  };

  openSettingsCanvas = () => {
    this.__createRightSideSlide(EmailTimeSettingsContentComponent, "email-time-settings-slider");
  };

  // openEnrollmentTriggerCanvas = () => {
  //   this.__createRightSideSlide(EnrollmentTriggerContentComponent, "email-time-settings-slider");
  // };

  onEmailToneSelect = (tone, index = null, rowIndex = null) => {
    this.selectedEmailToneKey = tone.value;
  };

  // handleClickPlusBtn = (email: object, isFromDelayCard: boolean, emailIndex: number): void => {
  //   console.log(this.emails);
  //   const emailObject = {
  //     delay_between_previous_email: { days: 0, hours: 1, minutes: 0 },
  //     emailText: "0 day(s) 1 hour(s) 0 minute(s)",
  //     isNewBox: true,
  //   };
  //   this.emails.splice(emailIndex + 1, 0, emailObject);
  // };

  deleteEmptyEmail = (emptyEmailObj: object) => {
    const index = this.emails.indexOf(emptyEmailObj);
    if (index > -1) {
      this.emails.splice(index, 1);
    }
  };
}
