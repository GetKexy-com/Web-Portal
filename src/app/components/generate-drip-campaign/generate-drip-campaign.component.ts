import { AfterViewChecked, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { constants } from '../../helpers/constants';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { routeConstants } from '../../helpers/routeConstants';
import { ActivatedRoute, Router } from '@angular/router';
import { DripEmail } from '../../models/DripEmail';
import { SseService } from '../../services/sse.service';
import { ProspectingService } from '../../services/prospecting.service';
import { CampaignService } from '../../services/campaign.service';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { ModalComponent } from '../modal/modal.component';
import { FormsModule } from '@angular/forms';
import { DripCampaignCardComponent } from '../drip-campaign-card/drip-campaign-card.component';
import { CampaignLayoutBottmBtnsComponent } from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import { KexyToastifyComponent } from '../kexy-toastify/kexy-toastify.component';
import { SendEmailDetailsContentComponent } from '../send-email-details-content/send-email-details-content.component';
import { EmailInsightsContentComponent } from '../email-insights-content/email-insights-content.component';
import { DelayDetailsContentComponent } from '../delay-details-content/delay-details-content.component';
import {
  ActiveContactsInCampaignComponent,
} from '../active-contacts-in-campaign/active-contacts-in-campaign.component';
import {
  EmailTimeSettingsContentComponent,
} from '../email-time-settings-content/email-time-settings-content.component';
import { CommonModule } from '@angular/common';
import { PageUiService } from '../../services/page-ui.service';
import { ExportToCsv } from '../../helpers/CSVHelper';

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
    CommonModule,
  ],
  templateUrl: './generate-drip-campaign.component.html',
  styleUrl: './generate-drip-campaign.component.scss',
})
export class GenerateDripCampaignComponent implements OnInit {
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
  dripCampaignStatus: string = '';
  numberOfEmail;
  numberOfEmailUpdateApiLoading: boolean = false;
  selectedPromotionsProductName: string = '';
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
  contactList;
  contactListSubscription: Subscription;

  constructor(
    private ngbOffcanvas: NgbOffcanvas,
    private router: Router,
    private modal: NgbModal,
    private sseService: SseService,
    private dripCampaignService: DripCampaignService,
    private prospectingService: ProspectingService,
    private campaignService: CampaignService,
    private pageUiService: PageUiService,
    private _authService: AuthService,
    private route: ActivatedRoute,
  ) {
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        this.dripCampaignId = params['id'];
        this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
        console.log('dripCampaign', this.dripCampaign);
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
        this.__saveEmails('true').then(async () => {
          const postData = {
            drip_campaign_id: this.dripCampaignId,
            supplier_id: this.userData.supplier_id,
          };
          this.dripCampaign = await this.dripCampaignService.getCampaign(postData);
        });
      }
    });
    this.emailsSubscription = this.sseService.dripBulkEmails.subscribe((emails: DripEmail[]) => {
      console.log('emails', emails);
      this.emails = emails;
      this.emails.forEach(e => {
        const delay = e.delayBetweenPreviousEmail;
        e['emailText'] = `${delay.days} day(s) ${delay.hours} hour(s) ${delay.minutes} minute(s)`;
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
    this.numberOfEmail = this.dripCampaign.details.numberOfEmails;

    if (this.dripCampaign.details.campaignId) {
      this.getCampaignThenProductName();
    }

    // Set 1st index as the default which is 'short' if not find anything in service for this field
    // const emailLength = this.dripCampaignService.getEmailLength();
    const emailLength = this.dripCampaign?.details?.emailLength;
    if (emailLength) {
      const index = this.emailLengthKeys.findIndex(i => i.value === emailLength);
      this.onEmailLengthSelect(this.emailLengthKeys[index]);
    } else {
      this.onEmailLengthSelect(this.emailLengthKeys[0]);
    }

    // Set 1st index as the default which is 'Friendly' if not find anything in service for this field
    // const emailTone = this.dripCampaignService.selectedEmailTone;
    const emailTone = this.dripCampaign?.details?.emailTone;
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
      this.dripCampaignProspectsSubscription = this.dripCampaignService.dripCampaignProspects.subscribe(data => {
        this.dripCampaignProspects = data['prospects'];
        console.log('prospects', this.dripCampaignProspects);
      });

    } catch (e) {
      Swal.fire('Error', e.message);
    }
  };

  getEmailContactsInAction = (emailSequence) => {
    return this.dripCampaignProspects.filter(d => d.emailSequence === emailSequence);
  };

  onEmailLengthSelect = (selectedValue, index = null, rowIndex = null) => {
    console.log({ selectedValue });
    this.selectedEmailLength = selectedValue;
    this.dripCampaignService.setEmailLength(selectedValue.key);
  };

  getCampaignThenProductName = async () => {
    // Get campaign api call
    const postData = {
      campaign_id: this.dripCampaign.details.campaignId,
      supplier_id: this.userData.supplier_id,
    };
    const campaign = await this.campaignService.getCampaign(postData);

    // Get products api call
    await this.prospectingService.getProducts({
      supplier_id: this.userData.supplier_id,
      page: 1,
      limit: 1000,
      get_total_count: 'false',
    });

    // Set subscription to get up to date products
    this.productsSubscription = this.prospectingService.allProduct.subscribe((products) => {
      this.products = products;

      const index = this.products.findIndex(p => p.id === campaign['campaign_detail'].prospecting_product_id);
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
    if (this.contactListSubscription) this.contactListSubscription.unsubscribe();
    if (this.dripCampaignStatus !== constants.ACTIVE) {
      this.sseService.removeDripBulkEmailData();
    }
  }

  getContacts = async (listId) => {
    const postData = {
      companyId: this.userData.supplier_id,
      dripCampaignId: '',
      listIds: [parseInt(listId)],
      contactName: '',
      companyName: '',
      jobTitle: '',
      emailStatus: '',
      marketingStatus: '',
      city: '',
      state: '',
      country: '',
      page: 1,
      limit: 1,
      sortBy: '',
      sortType: '',
    };

    try {
      await this.prospectingService.getContacts(postData, false);
    } catch (e) {
      await Swal.fire('Error', e.message);
    }

    this.contactListSubscription = this.prospectingService.contactRes.subscribe(async (data) => {
      if(data.contacts.length < 1) {
        await Swal.fire({
          title: `Error`,
          text: 'Please add contact(s) to your selected list(s).',
          icon: 'warning',
        });
        return;
      }
      this.contactList = this.prospectingService.setLabelsInContactsList(data.contacts);
    });
  };

  generateEmailContent = async () => {
    console.log(this.contactList);
    if (!this.contactList?.length) {
      const enrollList = this.getEnrolledList();
      if (!enrollList?.length) {
        this.openSettingsCanvas();
        await Swal.fire({
          title: `Error`,
          text: 'Please select list(s) from enrollment triggers',
          icon: 'warning',
        });
        return;
      }
      const listId = enrollList[0].list.id;
      this.isContentLoading = true;
      await this.getContacts(listId);
      this.isContentLoading = false;
    }

    this.emails = [];
    const data = {
      count: this.dripCampaign.details.numberOfEmails,
      email_tone: this.selectedEmailToneKey || this.dripCampaign.details.emailTone,
      sender_name: this.userData.firstName + ' ' + this.userData.lastName,
      sender_number: this.userData.phoneCountryCode + this.userData.phone,
      sender_company_name: this.userData.supplier_name,
      sender_website: this.dripCampaign.details.websiteUrl || '',
      sender_calendly_link: this.dripCampaign.details.calendlyLink || '',
      sender_company_details: this.userData.company_description,
      sender_product_name: this.selectedPromotionsProductName,
      sender_product_category: '',
      sender_product_description: '',
      email_length: this.selectedEmailLength.key,
      target_audience: this.dripCampaign.targetAudience,
      email_about: this.dripCampaign.emailAbout,
      promotion_info: !!this.selectedPromotionsProductName,
      prospect: {
        name: this.contactList[0]?.contactName,
        company: this.contactList[0]?.companyName,
        industry: this.contactList[0]?.details?.organization?.industry,
        location: `${this.contactList[0]?.details?.city}, ${this.contactList[0].details?.state}, ${this.contactList[0].details?.country}`,
        website: '',
        linkedinUrl: this.contactList[0]?.details?.linkedinUrl,
      },
    };

    try {
      await this.sseService.dripBulkEmailContentStream(data);
    } catch (e) {
      await Swal.fire('Error', e.message);
    }

  };

  showAiEmailError = () => {
    this.emailErrorSubscription = this.sseService.dripBulkEmailError.subscribe((content) => {
      if (content) {
        content = content.replaceAll(this.sseService.emailErrorSign, '');
        Swal.fire({
          title: `Error`,
          text: content,
          icon: 'warning',
        });
      }
    });
  };

  showEmailDetailsBtnClick = async (email) => {
    this.dripCampaignService.setEditEmail(email);
    this.dripCampaignService.setHasPromotion(!!this.selectedPromotionsProductName);
    this.__createRightSideSlide(SendEmailDetailsContentComponent, 'email-content');

    if (!this.contactList?.length) {
      const enrollList = this.getEnrolledList();
      const listId = enrollList[0].list.id;
      await this.getContacts(listId);
    }

    this.dripCampaignService.generateDripCampaignListContact = this.contactList;
  };

  insightsBtnClick = (email) => {
    const insightApiPostData = {
      drip_campaign_id: parseInt(this.dripCampaignId),
      drip_campaign_email_id: email.id,
      supplier_id: this.userData.supplier_id,
      email,
    };
    this.dripCampaignService.insightApiPostData = insightApiPostData;
    this.__createRightSideSlide(EmailInsightsContentComponent, 'email-insights');
  };

  showEmailDelayBtnClick = (email) => {
    this.dripCampaignService.setEditEmail(email);
    this.__createRightSideSlide(DelayDetailsContentComponent);
  };

  showDripCampaignContacts = (prospects) => {
    this.dripCampaignService.emailProspects = prospects;
    this.__createRightSideSlide(ActiveContactsInCampaignComponent, 'email-content');
  };

  __createRightSideSlide = (Component, panelClass = 'attributes-bg') => {
    this.ngbOffcanvas.open(Component, {
      panelClass: `${panelClass} edit-rep-canvas`,
      backdropClass: 'edit-rep-canvas-backdrop',
      position: 'end',
      scroll: false,
      beforeDismiss: async () => {
        return true;
      },
    });
  };

  openTestEmailPopUp = async (modalContent) => {
    this.testEmailModalRef = this.modal.open(modalContent);
  };

  getEnrolledList = () => {
    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    const enrollment = this.dripCampaign.lists;
    const enrollList = enrollment.filter(r => r.type === 'enroll_list');
    return enrollList;
  };

  handleClickNextButton = async () => {
    if (!this.emails.length) {
      await Swal.fire({
        title: `Error`,
        text: 'Please generate emails to active.',
        icon: 'warning',
      });
      return;
    }

    // this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    // const enrollment = this.dripCampaign.lists;
    // const enrollList = enrollment.filter(r => r.type === "enroll_list");

    const enrollList = this.getEnrolledList();
    if (!enrollList?.length) {
      this.openSettingsCanvas();
      await Swal.fire({
        title: `Error`,
        text: 'Please select list(s) from enrollment triggers',
        icon: 'warning',
      });
      return;
    }

    const confirmed = await this.__isConfirmed();
    if (!confirmed) return;

    const isSuccess = await this.__launchDripCampaign();
    if (isSuccess) {
      await Swal.fire({
        title: `Congratulations!`,
        text: 'Drip campaign is now active.',
        icon: 'success',
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
        companyId: this.userData.supplier_id,
        // notify: "true",
      };
      await this.dripCampaignService.activateDripCampaign(postData);
      return true;

    } catch (e) {
      await Swal.fire('Error', e.message);
      return false;
    }
  };

  __saveEmails = async (save = 'false') => {
    const formattedEmails = [];
    this.emails.forEach((e, index) => {
      const email = {
        emailSequence: e.emailSequence,
        emailSubject: e.emailSubject,
        emailContent: e.emailContent,
        delayBetweenPreviousEmail: JSON.stringify(e.delayBetweenPreviousEmail),
        emailLength: this.selectedEmailLength.value,
        emailTone: this.selectedEmailToneKey,
      };
      formattedEmails.push(email);
    });

    try {
      const postData = {
        dripCampaignId: this.dripCampaignId,
        saveEmails: save === 'true' ? 'true' : 'false',
        emails: formattedEmails,
      };
      await this.dripCampaignService.publishDripCampaign(postData);

    } catch (e) {
      await Swal.fire('Error', e.message);
    }
  };

  __isConfirmed = async () => {
    let isConfirm = await Swal.fire({
      title: `Ready to active?`,
      text: 'Make sure all emails are in good shape.',
      icon: 'success',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Active It!',
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
      text: 'Save as draft successfully.',
      icon: 'success',
    });
  };

  @ViewChild('emailSmoothScroll') private emailSmoothScroll: ElementRef;

  scroll = false;
  scrollToBottom = () => {
    if (!this.scroll) return;
    try {
      this.emailSmoothScroll.nativeElement.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        this.scroll = false;
      }, 5);
    } catch (err) {
    }
  };

  protected readonly constants = constants;

  // pauseOrResumeDripCampaign = async () => {
  //   let isConfirm = await Swal.fire({
  //     title: "Are you sure?",
  //     icon: "warning",
  //     showCancelButton: true,
  //     confirmButtonColor: "#3085d6",
  //     cancelButtonColor: "#d33",
  //     confirmButtonText: this.dripCampaign.status === constants.ACTIVE ? "Yes, Pause!" : "Yes, Resume!",
  //   });
  //
  //   if (isConfirm.dismiss) {
  //     return;
  //   }
  //
  //   this.isContentLoading = true;
  //   const payload = {
  //     drip_campaign_id: this.dripCampaign.id,
  //     supplier_id: this.userData.supplier_id,
  //     allowed_credit_limit: 1,
  //     drip_campaign_title_id: this.dripCampaign.details.title.id,
  //     number_of_emails: this.dripCampaign.details.numberOfEmails,
  //     website_url: this.dripCampaign.details.websiteUrl || "",
  //     calendly_link: this.dripCampaign.details.calendlyLink || "",
  //     campaign_id: this.dripCampaign.details.campaignId,
  //     status: this.dripCampaign.status === constants.ACTIVE ? constants.PAUSE : constants.ACTIVE,
  //     target_audience: this.dripCampaign.targetAudience,
  //     email_about: this.dripCampaign.emailAbout,
  //     audience_type: this.dripCampaign.audienceType,
  //     email_tone: this.selectedEmailToneKey,
  //     email_length: this.selectedEmailLength.value,
  //   };
  //
  //   try {
  //     await this.dripCampaignService.createOrUpdateDripCampaign(payload);
  //     const postData = {
  //       drip_campaign_id: this.dripCampaignId,
  //       supplier_id: this.userData.supplier_id,
  //     };
  //     this.dripCampaign = await this.dripCampaignService.getCampaign(postData);
  //
  //     this.isContentLoading = false;
  //
  //   } catch (e) {
  //     console.log(e);
  //     this.isContentLoading = false;
  //   }
  // };

  numberOfEmailsInputShow = false;
  handleShowHideNumberOfEmailsInput = () => {
    this.numberOfEmailsInputShow = !this.numberOfEmailsInputShow;
  };

  handleUpdateNumberOfEmail = async () => {
    this.numberOfEmailUpdateApiLoading = true;
    console.log(this.userData);
    const payload = {
      dripCampaignId: this.dripCampaign.id,
      companyId: this.dripCampaign.company.id,
      dripCampaignTitleId: this.dripCampaign.details.title.id,
      numberOfEmails: this.numberOfEmail,
      emailTone: this.dripCampaign.details.emailTone,
      websiteUrl: this.dripCampaign.details.websiteUrl || '',
      campaignId: this.dripCampaign.details.campaignId,
      status: this.dripCampaign.status,
      targetAudience: this.dripCampaign.targetAudience,
      emailAbout: this.dripCampaign.emailAbout,
      audienceType: this.dripCampaign.audienceType,
      emailLength: this.selectedEmailLength.value,
    };
    if (this.dripCampaign.details.calendlyLink) {
      payload['calendlyLink'] = this.dripCampaign.details.calendlyLink;
    }

    try {
      await this.dripCampaignService.createOrUpdateDripCampaign(payload);
      const postData = {
        drip_campaign_id: this.dripCampaignId,
      };
      this.dripCampaign = await this.dripCampaignService.getCampaign(postData);
      this.numberOfEmailsInputShow = false;
      this.numberOfEmailUpdateApiLoading = false;
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
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
      // prospect: DUMMY_PROSPECT,
    };
    try {
      await this.dripCampaignService.testDripCampaignEmail(postData);
      await Swal.fire({
        title: `Sent!`,
        text: 'Emails sent successfully.',
        icon: 'success',
      });
    } catch (e) {
      await Swal.fire({
        title: `Error`,
        text: e.getMessages(),
        icon: 'warning',
      });
    } finally {
      this.isSendEmailLoading = false;
    }
  };

  openSettingsCanvas = () => {
    this.__createRightSideSlide(EmailTimeSettingsContentComponent, 'email-time-settings-slider');
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

  exportInsights = async () => {
    const swal = this.pageUiService.showSweetAlertLoading();
    try {
      const insightsPromises = this.emails.map(async (email) => {
        const postData = {
          drip_campaign_id: parseInt(this.dripCampaignId),
          drip_campaign_email_id: email.id,
          supplier_id: this.userData.supplier_id,
        };

        const insightsData = await this.dripCampaignService.insights(postData);
        return insightsData['insights'] || [];
      });

      const allInsights = await Promise.all(insightsPromises);
      const insightsArray = allInsights
        .filter(insights => insights.length > 0)
        .map((insights, index) =>
          this.processInsights(insights, this.emails[index]),
        );

      await this.exportCSV(insightsArray);

    } finally {
      swal.close();
    }
  };

  processInsights = (insights, email: any) => {
    const { clickedInsights, openedInsights } = this.categorizeInsights(insights, email);

    const topClickedContacts = this.aggregateContacts(clickedInsights);
    const topOpenedContacts = this.aggregateContacts(openedInsights);

    return this.mergeContacts(topOpenedContacts, topClickedContacts);
  };

  categorizeInsights = (insights, email: any) => {
    const clickedInsights = [];
    const openedInsights = [];
    const repliedInsights = [];

    insights.forEach(insight => {
      const enrichedInsight = {
        ...insight,
        emailSequence: email.emailSequence,
        emailSubject: email.emailSubject,
      };

      switch (insight.insightType) {
        case constants.CLICK:
          clickedInsights.push(enrichedInsight);
          break;
        case constants.OPEN:
          openedInsights.push(enrichedInsight);
          break;
        case constants.REPLY:
          repliedInsights.push(enrichedInsight);
          break;
      }
    });

    return { clickedInsights, openedInsights, repliedInsights };
  };

  aggregateContacts = (insights) => {
    const contactsMap = {};

    insights.forEach(insight => {
      const contact = insight.contact;
      if (!contact) return;

      const contactId = contact.id;
      if (contactsMap[contactId]) {
        contactsMap[contactId].count += 1;
      } else {
        contactsMap[contactId] = {
          ...contact,
          emailSequence: insight.emailSequence!,
          emailSubject: insight.emailSubject!,
          createdAt: insight.createdAt,
          count: 1,
        };
      }
    });

    return Object.values(contactsMap).sort((a, b) => b['count'] - a['count']);
  };

  mergeContacts = (
    openedContacts,
    clickedContacts,
  ) => {
    const mergedContacts = {};

    openedContacts.forEach(contact => {
      mergedContacts[contact.id] = {
        ...contact,
        openCount: contact.count,
        clickCount: 0,
      };
    });

    clickedContacts.forEach(contact => {
      if (mergedContacts[contact.id]) {
        mergedContacts[contact.id].clickCount = contact.count;
      } else {
        mergedContacts[contact.id] = {
          ...contact,
          clickCount: contact.count,
          openCount: 0,
        };
      }
    });

    return mergedContacts;
  };

  exportCSV = async (contactsData) => {
    const headers = [
      'First Name', 'Last Name', 'Email Number in Campaign',
      'Email Subject Line', 'Number of Opens', 'Number of Clicks',
      'Email', 'Job Title', 'Company Name', 'Phone Number',
      'Linkedin Url', 'City', 'State', 'Country', 'Date/Time Clicked',
    ].join(',');

    const rows = contactsData.flatMap(contacts =>
      Object.values(contacts).map(contact => {
        const details = JSON.parse(contact['details']) as {
          first_name?: string;
          last_name?: string;
          email?: string;
          organization?: { phone?: string };
          linkedin_url?: string;
          city?: string;
          state?: string;
          country?: string;
        };

        const escapeCsv = (value: any) =>
          value?.toString().replace(/,/g, ' ') || '';

        return [
          escapeCsv(details['first_name']),
          escapeCsv(details['last_name']),
          escapeCsv(contact['emailSequence']),
          escapeCsv(contact['emailSubject']),
          escapeCsv(contact['openCount']),
          escapeCsv(contact['clickCount']),
          escapeCsv(details.email),
          escapeCsv(contact['jobTitle']),
          escapeCsv(contact['companyName']),
          escapeCsv(details.organization?.phone),
          escapeCsv(details.linkedin_url),
          escapeCsv(details.city),
          escapeCsv(details.state),
          escapeCsv(details.country),
          escapeCsv(contact['createdAt']),
        ].join(',');
      }),
    ).join('\n');

    await ExportToCsv.download('insights.csv', `${headers}\n${rows}`);
  };
}
