import { AfterViewChecked, Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { constants } from '../../helpers/constants';
import {
  isSuperChargedSetting,
  linkedinUsername,
  readDripSetting,
  superchargeForAi,
} from '../../helpers/ai-email-payload';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { DashboardService } from '../../services/dashboard.service';
import { EmailSendFilter, IEmailSendSchedule, IEmailSendSummary } from '../../models/EmailSendProgress';
import { scheduleEventAt, schedulePollDelay, scheduleProspectsFilter } from '../../helpers/send-schedule-label';
import { SendCountdownComponent } from '../send-countdown/send-countdown.component';
import { routeConstants } from '../../helpers/routeConstants';
import { ActivatedRoute, Router } from '@angular/router';
import { DripEmail, EmailDelay } from '../../models/DripEmail';
import { SseService } from '../../services/sse.service';
import { ProspectingService } from '../../services/prospecting.service';
import { CampaignService } from '../../services/campaign.service';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { FormsModule } from '@angular/forms';
import { DripCampaignCardComponent } from '../drip-campaign-card/drip-campaign-card.component';
import { CampaignLayoutBottmBtnsComponent } from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import { KexyToastifyComponent } from '../kexy-toastify/kexy-toastify.component';
import { SendEmailDetailsContentComponent } from '../send-email-details-content/send-email-details-content.component';
import {
  CampaignInsightsContentComponent,
} from '../campaign-insights-content/campaign-insights-content.component';
import { DelayDetailsContentComponent } from '../delay-details-content/delay-details-content.component';
import {
  ActiveContactsInCampaignComponent,
} from '../active-contacts-in-campaign/active-contacts-in-campaign.component';
import {
  EmailTimeSettingsContentComponent,
} from '../email-time-settings-content/email-time-settings-content.component';
import { CommonModule } from '@angular/common';
import { PageUiService } from '../../services/page-ui.service';
import { Contact, IRawContact } from '../../models/Contact';
import { PreviewDripEmailContentComponent } from '../preview-drip-email-content/preview-drip-email-content.component';
import { ActivateDripModalComponent, IActivateDripResult } from '../activate-drip-modal/activate-drip-modal.component';
import { LeadMagnetService } from '../../services/lead-magnet.service';
import { CAMPAIGN_STATUS, DripCampaign, isResearchDone } from '../../models/DripCampaign';
import { StorageService } from '../../services/storage.service';
import { ScrapeProgressCardComponent } from '../scrape-progress-card/scrape-progress-card.component';

@Component({
  selector: 'generate-drip-campaign',
  imports: [
    KexySelectDropdownComponent,
    KexyButtonComponent,
    FormsModule,
    DripCampaignCardComponent,
    CampaignLayoutBottmBtnsComponent,
    KexyToastifyComponent,
    CommonModule,
    ScrapeProgressCardComponent,
    SendCountdownComponent,
  ],
  templateUrl: './generate-drip-campaign.component.html',
  styleUrl: './generate-drip-campaign.component.scss',
})
export class GenerateDripCampaignComponent implements OnInit, OnDestroy {
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
  spintaxOptions = [
    { key: constants.PROSPECT_INSIGHTS_KEY, value: constants.PROSPECT_INSIGHTS },
    { key: constants.SPINTAX_KEY, value: constants.SPINTAX },
    { key: constants.TEMPLATE_KEY, value: constants.TEMPLATE },
  ];
  selectedEmailTemplate;
  selectedEmailToneKey;
  contactList: Contact[];
  contactListSubscription: Subscription;

  constructor(
    private ngbOffcanvas: NgbOffcanvas,
    private storageService: StorageService,
    private modal: NgbModal,
    private sseService: SseService,
    private dripCampaignService: DripCampaignService,
    private dashboardService: DashboardService,
    private prospectingService: ProspectingService,
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
        if (this.dripCampaign.emails[0]) {
          this.selectedEmailTemplate = this.spintaxOptions.find(o => {
            return o.key === this.dripCampaign.emails[0].templateOptions;
          });
        } else {
          this.selectedEmailTemplate = this.spintaxOptions[0];
        }

        // Show the scrape card on a reload/return, not just right after clicking
        // Activate.
        this.__syncScrapeProgressVisibility();
        this.__syncCampaignLiveNotice();
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
        this.saveEmails('true').then(async () => {
          await this.__refreshDripCampaign();
        });
      }
    });
    this.emailsSubscription = this.sseService.dripBulkEmails.subscribe((emails: DripEmail[]) => {
      this.emails = emails;
      this.emails.forEach((e: DripEmail) => {
        const delay: EmailDelay = e.delayBetweenPreviousEmail;
        e.isSpintax = this.selectedEmailTemplate.key === constants.PROSPECT_INSIGHTS_KEY;
        e.templateOptions = this.selectedEmailTemplate.key;
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
      this.__syncProspectsPolling();
    });
    this.showAiEmailError();
    this.numberOfEmail = this.dripCampaign.details.numberOfEmails;

    // if (this.dripCampaign.details.campaignId) {
    //   this.getCampaignThenProductName();
    // }

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

    this.dripCampaignProspectsSubscription = this.dripCampaignService.dripCampaignProspects.subscribe(data => {
      this.dripCampaignProspects = data['prospects'] || [];
      const serverNow = Date.parse(data['serverTime']);
      if (!Number.isNaN(serverNow)) this.prospectsClockOffsetMs = serverNow - Date.now();
      this.__syncNextSendBySequence();
      // The next look depends on what these say (see `__prospectsPollDelay`).
      if (this.prospectsPolling) this.__scheduleProspectsPoll();
      // "Finishing up": every prospect is researched but the campaign row still reads the
      // scrapes as running. It flips on the backend's own schedule, and nothing else on
      // this page re-reads the campaign — so check it alongside the prospects until it has.
      if (this.showScrapeProgress && !this.scrapeCardVisible) this.__refreshDripCampaign().then();
    });
    this.getDripCampaignProspects().then(res => {
    });
  }


  getDripCampaignProspects = async (silent = false) => {
    const postData = {
      drip_campaign_id: this.dripCampaignId,
    };
    try {
      await this.dripCampaignService.getProspects(postData);
    } catch (e) {
      // A background refresh failing is not worth a dialog — the last list stays.
      if (silent) {
        console.error('Could not refresh the drip campaign prospects', e);
        return;
      }
      Swal.fire('Error', e.message).then();
    }
  };

  /**
   * Keeps the "contact(s) in actions" counts and the Delay card countdowns live while
   * the campaign is ACTIVE. A prospect's `emailSequence` advances when the send queue
   * delivers their email, but the API pushes nothing to the browser (sends run off
   * an external cron), so without this the contacts stayed under the old Delay
   * card until a reload.
   *
   * Paced by the countdowns themselves: the next look is just after the soonest one is
   * due to change stage (joins the queue, gets sent), and every few seconds while anyone
   * is queued or being sent — that is when things move. Otherwise every 30s.
   */
  private prospectsTimer: ReturnType<typeof setTimeout> | null = null;
  private prospectsPolling = false;

  private __syncProspectsPolling() {
    if (this.dripCampaignStatus !== constants.ACTIVE) {
      this.__stopProspectsPolling();
      return;
    }
    if (this.prospectsPolling) return;
    this.prospectsPolling = true;
    this.__scheduleProspectsPoll();
  }

  /** (Re)arms the one pending look. Called after every load, which may change the pace. */
  private __scheduleProspectsPoll() {
    if (this.prospectsTimer) clearTimeout(this.prospectsTimer);
    this.prospectsTimer = null;
    if (!this.prospectsPolling) return;
    this.prospectsTimer = setTimeout(async () => {
      this.prospectsTimer = null;
      // Don't poll a background tab; `onVisibilityChange` catches up on return.
      if (!document.hidden) await this.getDripCampaignProspects(true);
      // A successful load re-arms from the subscription; a failed or skipped one does not.
      if (!this.prospectsTimer) this.__scheduleProspectsPoll();
    }, this.__prospectsPollDelay());
  }

  /** The endpoint is one join on the campaign's prospects, so polling it is cheap. */
  private __prospectsPollDelay(): number {
    const schedules = this.dripCampaignProspects
      .filter((p) => p?.status === constants.ACTIVE)
      .map((p) => p?.nextSend as IEmailSendSchedule | null);
    return schedulePollDelay(schedules, Date.now() + this.prospectsClockOffsetMs);
  }

  private __stopProspectsPolling() {
    this.prospectsPolling = false;
    if (this.prospectsTimer) {
      clearTimeout(this.prospectsTimer);
      this.prospectsTimer = null;
    }
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (!document.hidden && this.prospectsPolling) {
      this.getDripCampaignProspects(true).then();
    }
  }

  /**
   * The countdown on each Delay card: the soonest `nextSend` among the prospects waiting
   * on that email — one being sent, then the first queued, then the first to join the
   * queue. Worked out by the API with the queue fill's own rules (KexyApi
   * `send-schedule.ts`). A field, rebuilt only when the prospects change — the template
   * reads it on every change-detection pass.
   *
   * With nothing to count down to, a blocked schedule is kept instead so the card can say
   * why ("After research", "Not sending").
   */
  nextSendBySequence: Record<number, IEmailSendSchedule | null> = {};
  /**
   * The campaign's next send, for the "This campaign is live" notice: the soonest of the
   * Delay cards above (same rule — moving first by time, else the first that says why it
   * is blocked), and which email it is. Rebuilt with `nextSendBySequence`.
   */
  campaignNextSend: { schedule: IEmailSendSchedule; emailSequence: number } | null = null;
  /** Server clock minus this browser's, from the prospects response's `serverTime`. */
  prospectsClockOffsetMs = 0;

  private __syncNextSendBySequence() {
    const bySequence: Record<number, IEmailSendSchedule | null> = {};
    for (const p of this.dripCampaignProspects) {
      const sc: IEmailSendSchedule | null = p?.nextSend ?? null;
      if (p?.status !== constants.ACTIVE || !sc) continue;
      const seq = parseInt(p.emailSequence);
      const best = bySequence[seq];
      const at = scheduleEventAt(sc);
      const bestAt = scheduleEventAt(best ?? null);
      const soonest = at !== null && (bestAt === null || at < bestAt);
      if (!best || soonest) bySequence[seq] = sc;
    }
    this.nextSendBySequence = bySequence;

    let next: { schedule: IEmailSendSchedule; emailSequence: number; at: number | null } | null = null;
    for (const [seq, sc] of Object.entries(bySequence)) {
      if (!sc || sc.state === 'unknown') continue;
      const at = scheduleEventAt(sc);
      const better = !next || (at !== null && (next.at === null || at < next.at));
      if (better) next = { schedule: sc, emailSequence: Number(seq), at };
    }
    this.campaignNextSend = next ? { schedule: next.schedule, emailSequence: next.emailSequence } : null;
  }

  /** The live notice's countdown: that email's Insights, on the tab its prospect is in. */
  campaignNextSendClick = () => {
    const next = this.campaignNextSend;
    const email = next && this.emails.find((e) => Number(e.emailSequence) === next.emailSequence);
    if (email) this.insightsBtnClick(email, scheduleProspectsFilter(next.schedule));
  };

  getEmailContactsInAction = (emailSequence) => {
    return this.dripCampaignProspects.filter(d => {
      return d.status === constants.ACTIVE && parseInt(d.emailSequence) === parseInt(emailSequence);
    });
  };

  onEmailLengthSelect = (selectedValue, index = null, rowIndex = null) => {
    console.log({ selectedValue });
    this.selectedEmailLength = selectedValue;
    this.dripCampaignService.setEmailLength(selectedValue.key);
  };


  hideToastify = () => {
    this.showToastifyMessage = false;
  };

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
    this.__stopSentCountPolling();
    this.__stopProspectsPolling();
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
      if (data.contacts.length < 1) {
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
    if (this.selectedEmailTemplate.key === constants.TEMPLATE_KEY) {
      this.sseService.setupEmptyDripEmailTemplate({
        count: this.dripCampaign.details.numberOfEmails,
      });
      return;
    }

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
      // If a proper list is found then show loading instead of old emails.
      this.isContentLoading = true;
      const emailBackup = [...this.emails];
      this.emails = [];
      await this.getContacts(listId);
      // If the selected list does not have contact in it then show old emails again
      if (!this.contactList?.length) {
        this.emails = emailBackup;
        this.isContentLoading = false;
        await Swal.fire({
          title: `Error`,
          text: 'No contacts are assigned to this drip yet.',
          icon: 'warning',
        });
        return;
      }
    }

    this.emails = [];
    this.isContentLoading = true;
    const contact: Contact = this.contactList[0];
    const linkedinUsername = this.getLinkedInUsername(contact?.details?.linkedinUrl);
    const linkedinData: any = await this.dripCampaignService.getLinkedinData({ contactId: contact.id });
    const websiteData: any = await this.dripCampaignService.getWebsiteData({ contactId: contact.id });
    const locationData: any = await this.dripCampaignService.getLocationData({ contactId: contact.id });
    // The activate dialog's "Super charged" toggle, behind `SUPERCHARGE_TO_AI_ENABLED` (off for now).
    const supercharge = superchargeForAi(this.dripCampaign?.settings);
    const data = {
      count: this.dripCampaign.details.numberOfEmails,
      email_tone: this.selectedEmailToneKey || this.dripCampaign.details.emailTone,
      sender_name: this.userData.firstName + ' ' + this.userData.lastName,
      sender_number: this.userData.phoneCountryCode + this.userData.phone,
      sender_website: this.dripCampaign.details.websiteUrl || '',
      sender_calendly_link: this.dripCampaign.details.calendlyLink || '',
      sender_company_name: this.dripCampaign.details.companyDescription.companyName,
      sender_company_details: this.dripCampaign.details.description,
      sender_product_name: this.selectedPromotionsProductName,
      sender_product_category: '',
      sender_product_description: '',
      email_length: this.selectedEmailLength.key,
      target_audience: this.dripCampaign.targetAudience,
      email_about: this.dripCampaign.emailAbout,
      platformPriority: this.dripCampaign.userPromptPriority,
      negative_prompt: this.userData.negative_prompts,
      isSpintax: this.selectedEmailTemplate.key === constants.PROSPECT_INSIGHTS_KEY,
      promotion_info: !!this.selectedPromotionsProductName,
      prospect_email_address: contact?.email,
      drip_campaign_id: this.dripCampaign.id,
      supercharge,
      lead_magnet: this.dripCampaign.leadMagnet,
      linkedin_scrapper: linkedinData,
      sports_scrapper: {},
      google_map_scrapper: locationData ? locationData.scrapedData : {},
      web_scrapper: websiteData ? websiteData.rawData : {},
      prospect: {
        name: contact?.contactName,
        company: contact?.companyName,
        industry: contact?.details?.organization?.industry,
        location: `${contact?.details?.city}, ${contact.details?.state}, ${contact.details?.country}`,
        website: '',
        linkedinUrl: contact?.details?.linkedinUrl,
        username: linkedinUsername,
      },
    };
    try {
      await this.sseService.dripBulkEmailContentStream(data, this.dripCampaign.userPromptPriority);
    } catch (e) {
      await Swal.fire('Error', e.message);
    }

  };

  getLinkedInUsername(url) {
    return linkedinUsername(url);
  }

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


  handlePreviewBtnClick = async (email) => {
    this.dripCampaignService.setEditEmail(email);
    this.dripCampaignService.setHasPromotion(!!this.selectedPromotionsProductName);
    this.__createRightSideSlide(PreviewDripEmailContentComponent, 'email-content');
  };

  /**
   * Insights for the WHOLE campaign, as opposed to `insightsBtnClick`'s one email.
   *
   * The campaign id goes on the instance rather than through the service the way the
   * per-email drawer does it: that pattern (`dripCampaignService.insightApiPostData`)
   * is a global handoff with no types on it, and there is no reason to add a second
   * user of it for a single number.
   */
  campaignInsightsBtnClick = () => {
    const ref = this.ngbOffcanvas.open(CampaignInsightsContentComponent, {
      panelClass: 'campaign-insights',
      position: 'end',
      scroll: false,
    });
    ref.componentInstance.campaignId = parseInt(this.dripCampaignId);
    // Seeds the header so it names the campaign on the first frame instead of
    // showing "Loading…" until the request lands.
    ref.componentInstance.campaignTitle = this.dripCampaign?.details?.title?.title || '';
  };

  /**
   * Insights for ONE email — the same drawer as `campaignInsightsBtnClick`, scoped by
   * `emailId`.
   *
   * It used to open a separate `EmailInsightsContentComponent` backed by
   * `GET drip-campaigns/:id/insights`, which 400'd on every call: that route reads the
   * insights table through the TypeORM repository, which `SELECT`s the entity's
   * `email_notification_sent` column, and the live table has no such column. The
   * analytics endpoint aggregates in scoped raw SQL and is immune to that drift.
   */
  insightsBtnClick = (email, prospectsFilter: EmailSendFilter | null = null) => {
    const ref = this.ngbOffcanvas.open(CampaignInsightsContentComponent, {
      panelClass: 'campaign-insights',
      position: 'end',
      scroll: false,
    });
    ref.componentInstance.campaignId = parseInt(this.dripCampaignId);
    ref.componentInstance.campaignTitle = this.dripCampaign?.details?.title?.title || '';
    ref.componentInstance.emailId = email.id;
    // Seeded so the summary names the email on the first frame rather than after the
    // request lands; the response confirms both.
    ref.componentInstance.emailSequence = email.emailSequence;
    ref.componentInstance.emailSubject = email.emailSubject || '';
    // Opened from a Delay card's countdown: land on the Prospects tab that prospect is in.
    ref.componentInstance.prospectsFilter = prospectsFilter;
  };

  showEmailDelayBtnClick = (email) => {
    this.dripCampaignService.setEditEmail(email);
    this.__createRightSideSlide(DelayDetailsContentComponent);
  };

  showDripCampaignContacts = (prospects) => {
    this.dripCampaignService.emailProspects = prospects;
    // So the panel can follow the live list: the prospects still waiting on this email.
    this.dripCampaignService.emailProspectsSequence = parseInt(prospects?.[0]?.emailSequence) || null;
    this.dripCampaignService.emailProspectsClockOffsetMs = this.prospectsClockOffsetMs;
    const ref = this.__createRightSideSlide(ActiveContactsInCampaignComponent, 'contact-slide-content');
    // Hand the panel the campaign it belongs to. It used to read `?id=` itself and got
    // nothing, so Un-enroll posted with no dripCampaignId and the API answered 400.
    ref.componentInstance.dripCampaignId = this.dripCampaign?.id ?? this.dripCampaignId;
  };

  __createRightSideSlide = (Component, panelClass = 'email-time-settings-slider') => {
    return this.ngbOffcanvas.open(Component, {
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
    this.submittedTestEmailSend = false;
    this.testEmailModalRef = this.modal.open(modalContent, { windowClass: 'kx-dialog-modal' });
  };

  getEnrolledList = () => {
    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    const enrollment = this.dripCampaign.lists;
    const enrollList = enrollment.filter(r => r.type === 'enroll_list');
    return enrollList;
  };

  showScrapeProgress = false; // 👈 mount the card

  /**
   * Whether the mounted scrape card is actually rendering anything, as reported
   * by its `(visibilityChange)`.
   *
   * `showScrapeProgress` only says the card is MOUNTED. The card then decides
   * for itself from per-prospect data, and can come up silent — every prospect
   * scraped while the campaign row still reads PENDING, which is exactly what
   * campaign 736 looked like. Without this report, gating the live notice on the
   * campaign-level scrape statuses hid that too and the page showed nothing at
   * all for an active campaign.
   */
  private scrapeCardVisible = false;

  onScrapeCardVisibilityChange(visible: boolean) {
    this.scrapeCardVisible = visible;
    this.__syncCampaignLiveNotice();
    // Research just finished. The card refreshed ITS copy of the campaign, not this page's
    // — which still reads the scrapes as RUNNING and would hold the notice at "Finishing
    // up" until a reload. Take the fresh campaign, and the prospects' schedules with it,
    // so the notice and its countdown move on now.
    if (!visible && this.showScrapeProgress) {
      this.__refreshDripCampaign().then();
      this.getDripCampaignProspects(true).then();
    }
  }

  /**
   * Decide whether the scrape card belongs on screen, from the CAMPAIGN rather
   * than from "did the user just click Activate in this tab".
   *
   * This used to be set in one place only — the activate handler — so a reload
   * or a navigation back to a campaign that was still being scraped showed
   * nothing at all, even though the scrape was very much still running and the
   * card is the only feedback that it is.
   *
   * Only TEMPLATE campaigns skip scraping — the backend marks both statuses
   * SUCCEEDED for them at activation and `start()` in both scrapers returns
   * early on `templateOptions === 'template'`. Prospect-insights AND spintax
   * campaigns both get scraped, so both get the card; gating on
   * prospect-insights alone left a scraping spintax campaign with no feedback
   * at all.
   */
  private __syncScrapeProgressVisibility() {
    const campaign = this.dripCampaign;

    // `DripCampaign.empty()` has id 0 / status inactive, so this also covers the
    // window before the campaign has loaded.
    if (!campaign?.id) {
      this.showScrapeProgress = false;
      return;
    }

    const templateOptions = campaign.emails?.[0]?.templateOptions;
    if (templateOptions === constants.TEMPLATE_KEY) {
      this.showScrapeProgress = false;
      return;
    }

    // Only an ACTIVE campaign is researched — the web, map and sports scrapers all skip
    // anything else — so a paused or inactive one has no progress to show. The card's own
    // poll hides on the same rule; showing it here for PAUSE made it flash for one poll.
    if (campaign.status !== constants.ACTIVE) {
      this.showScrapeProgress = false;
      return;
    }

    // Every pass the send waits for, LinkedIn and sports included: checking web and map
    // alone showed "This campaign is live" while LinkedIn/sports still held the first email.
    const scrapingDone = isResearchDone(campaign);

    // The card itself still decides what (and whether) to render from the
    // per-prospect data; this only governs whether it is mounted at all.
    const wasMounted = this.showScrapeProgress;
    this.showScrapeProgress = !scrapingDone;

    // A fresh mount has not reported yet. Assume it will render (it usually
    // does) so the live notice doesn't flash underneath it for the one poll it
    // takes the card to load its prospects.
    if (this.showScrapeProgress !== wasMounted) {
      this.scrapeCardVisible = this.showScrapeProgress;
    }
  }

  /**
   * "This campaign is live" notice.
   *
   * The scrape card only covers the research stage; once that finishes it
   * unmounts and the page goes completely quiet, even though the campaign is
   * now doing the thing the user actually activated it for. This notice covers
   * everything after research, so an active campaign is never silent about what
   * it is doing.
   *
   * Computed on refresh rather than in getters: the template renders these on
   * every change-detection pass, and `__readSetting` JSON-parses a settings row.
   */
  showLiveNotice = false;
  liveNoticeTitle = 'This campaign is live';
  liveNoticeStatus = '';
  /**
   * The sequence has run its course (every prospect reached, or nothing left to send).
   * Hides the "Next:" countdown chip — there is no next send once the sequence is done.
   * The API then marks the campaign `complete` (KexyApi `DripCampaignCompletionService`),
   * which hides this notice on the next load; until then this is what is on screen.
   */
  liveNoticeIsComplete = false;
  liveNoticeFacts: { icon: string; label: string }[] = [];

  /**
   * Emails this campaign has actually sent, or null while unknown (not fetched
   * yet, or the request failed).
   *
   * Read from the send records — `dashboard/campaigns/:id`'s `totals.sent`, which
   * counts `prospecting_conversations`, the one row the send sweep writes per
   * delivered email. It is NOT read off `campaign.emails[].isEmailSent`: that
   * column exists but nothing in the API ever sets it, so it is `false` forever
   * and the notice kept saying "queued" after the first emails had gone out.
   */
  private sentCount: number | null = null;
  private sentCountCampaignId: number | null = null;
  private sentCountTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Where the LAST email in the sequence stands across every enrolled prospect — the
   * send-progress summary for that one email. Null while unknown, or while nothing has
   * been sent (no point asking).
   *
   * Why the last email: prospects move through the sequence in order, so "the last
   * email reached everyone" is the sequence being complete. It is also the only
   * question the notice can answer honestly — `sent` totals alone can't say whether
   * anyone is still waiting, and a count against `prospects × emails` breaks on the first
   * unsubscribe or failure.
   */
  private sequenceState: IEmailSendSummary | null = null;

  /** The endpoint memoises for 60s server-side, so polling faster gains nothing. */
  private static readonly SENT_COUNT_POLL_MS = 60_000;
  /** The API's ceiling for `days`; widest window so a long-running campaign still counts. */
  private static readonly SENT_COUNT_WINDOW_DAYS = 180;

  private __syncCampaignLiveNotice() {
    const campaign = this.dripCampaign;

    // Only ACTIVE — a paused campaign has its own (louder) warning, and an
    // inactive one is still being edited.
    if (!campaign?.id || campaign.status !== constants.ACTIVE) {
      this.showLiveNotice = false;
      this.__stopSentCountPolling();
      return;
    }

    // The scrape card owns the research stage, so step aside while it is
    // actually on screen — two "in progress" cards stacked read as noise.
    //
    // Deliberately keyed to the card's OWN report rather than to
    // `webScrapeStatus`/`mapScrapeStatus`: a campaign whose prospects have all
    // been scraped while the campaign row is still PENDING (the backend can
    // leave it wedged there) makes the card hide itself, and a status-based gate
    // hid this notice at the same time — an active campaign with no banner at
    // all, which is the bug this replaced.
    if (this.showScrapeProgress && this.scrapeCardVisible) {
      this.showLiveNotice = false;
      this.__stopSentCountPolling();
      return;
    }

    this.showLiveNotice = true;

    // Honest sub-states — the notice must never claim more than is true.
    //
    // 1. The card is mounted but silent: research has finished for every
    //    prospect while the CAMPAIGN row still reads PENDING/RUNNING. Sending is
    //    gated on the web and map scrapes succeeding (not on the campaign being
    //    "complete"), so it begins right after this, but nothing has gone out
    //    yet — promising a specific send count here would be wrong.
    // 2. Send count not known yet (loading, or the request failed): say only
    //    what is true regardless — that sends follow the schedule.
    // 3. Known to be zero: the send window is frequently shut (7:00 AM – 8:00 PM
    //    is the common default), so "going out" would be a lie.
    // 4. Known to be non-zero: say how many have really gone out.
    // 5. The sequence has run its course: the last email is sent to EVERY enrolled
    //    prospect. The API marks the campaign `complete` once nothing is left to send,
    //    so say so — this page still holds the ACTIVE status it loaded with.
    // 6. Nothing is left to send but not everyone got the last email (failed/skipped):
    //    "sent to all" would be false, so say what did happen.
    const isFinalising = this.showScrapeProgress && !this.scrapeCardVisible;
    const sent = this.sentCount;
    const seq = this.sequenceState;
    const seqOpen = seq ? seq.scheduled + seq.queued + seq.generating + seq.generated + seq.sending : 0;
    const allSent = !isFinalising && !!seq && seq.totalProspects > 0 && seq.sent === seq.totalProspects;
    const finished = !isFinalising && !!seq && !allSent && seq.sent > 0 && seqOpen === 0;
    const emailCount = campaign.details.numberOfEmails;
    const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

    this.liveNoticeIsComplete = allSent || finished;
    this.liveNoticeTitle = 'This campaign is live';

    if (isFinalising) {
      this.__stopSentCountPolling();
      this.liveNoticeStatus =
        'Research complete for every prospect. Emails will start sending per the schedule below.';
    } else {
      this.__startSentCountPolling(campaign.id);
      if (allSent) {
        this.liveNoticeTitle = 'Emails sent to all prospects';
        this.liveNoticeStatus =
          `All ${plural(emailCount, 'email')} in the sequence have been sent to all ` +
          `${plural(seq.totalProspects, 'prospect')}. The campaign is now complete.`;
      } else if (finished) {
        this.liveNoticeTitle = 'Sequence finished';
        this.liveNoticeStatus =
          `Every email has been processed. The last email reached ${seq.sent.toLocaleString()} of ` +
          `${plural(seq.totalProspects, 'prospect')} — ${(seq.totalProspects - seq.sent).toLocaleString()} ` +
          `failed or ${seq.totalProspects - seq.sent === 1 ? 'was' : 'were'} skipped. Open that email's Insights to see why.`;
      } else if (sent === null) {
        this.liveNoticeStatus = 'Emails go out to your enrolled prospects, on the schedule below.';
      } else if (sent === 0) {
        this.liveNoticeStatus =
          'No emails have been sent yet — the first ones go out when the next send window opens.';
      } else {
        this.liveNoticeStatus = 'Emails are going out to your enrolled prospects, on the schedule below.';
      }
    }

    this.liveNoticeFacts = [];
    if (!isFinalising && sent) {
      this.liveNoticeFacts.push({
        icon: 'fa-paper-plane-o',
        label: `${plural(sent, 'email')} sent${this.liveNoticeIsComplete ? '' : ' so far'}`,
      });
    }
    this.liveNoticeFacts.push(
      {
        icon: 'fa-envelope-o',
        label: `${plural(emailCount, 'email')} in sequence`,
      },
      { icon: 'fa-clock-o', label: this.__sendWindowLabel() },
    );

    const endsOn = this.__readSetting('turn_off_time')[0]?.day;
    if (endsOn) {
      this.liveNoticeFacts.push({ icon: 'fa-calendar-o', label: `Stops ${endsOn}` });
    }
  }

  /**
   * Fetch the real send count now, then keep it fresh while the notice is on
   * screen. Idempotent — called on every sync, only starts once per campaign.
   */
  private __startSentCountPolling(campaignId: number) {
    if (this.sentCountCampaignId !== campaignId) {
      // Different campaign than the count we hold: drop it rather than show it.
      this.sentCount = null;
      this.sequenceState = null;
      this.sentCountCampaignId = campaignId;
      this.__stopSentCountPolling();
    }
    if (this.sentCountTimer) return;

    this.__loadSentCount(campaignId);
    this.sentCountTimer = setInterval(
      () => this.__loadSentCount(campaignId),
      GenerateDripCampaignComponent.SENT_COUNT_POLL_MS,
    );
  }

  private __stopSentCountPolling() {
    if (this.sentCountTimer) {
      clearInterval(this.sentCountTimer);
      this.sentCountTimer = null;
    }
  }

  private async __loadSentCount(campaignId: number) {
    try {
      const analytics = await this.dashboardService.getCampaignAnalytics(
        campaignId,
        GenerateDripCampaignComponent.SENT_COUNT_WINDOW_DAYS,
        1,
      );
      // The user may have moved to another campaign while this was in flight.
      if (this.sentCountCampaignId !== campaignId) return;
      this.sentCount = analytics?.totals?.sent ?? null;

      // Only worth asking once something has gone out. A failed lookup keeps the last
      // known state (or none), which falls back to the plain "going out" copy.
      if (this.sentCount) {
        const state = await this.__loadSequenceState(campaignId);
        if (this.sentCountCampaignId !== campaignId) return;
        this.sequenceState = state ?? this.sequenceState;
      } else {
        this.sequenceState = null;
      }
      this.__syncCampaignLiveNotice();
    } catch (e) {
      // Leave the last known value (or unknown) — the neutral copy stays true,
      // and a failed background check is not worth an error banner.
      console.error('Could not load the campaign send count', e);
    }
  }

  /** The last email in the sequence (highest `emailSequence`) that has been saved. */
  private __lastEmailId(): number | null {
    const emails = (this.dripCampaign?.emails || []).filter((e: any) => e.id);
    if (!emails.length) return null;
    return emails.reduce((a: any, b: any) => (b.emailSequence > a.emailSequence ? b : a)).id;
  }

  private async __loadSequenceState(campaignId: number): Promise<IEmailSendSummary | null> {
    const lastEmailId = this.__lastEmailId();
    if (!lastEmailId) return null;
    try {
      // limit 1: only the summary counts are wanted, not the rows.
      const res = await this.dripCampaignService.getEmailSendProgress(campaignId, lastEmailId, { limit: 1 });
      return res.summary;
    } catch (e) {
      console.error('Could not load the sequence send state', e);
      return null;
    }
  }

  /**
   * The saved send window, e.g. "Mon - Fri, 9:00 AM – 5:00 PM".
   *
   * `run_time` holds one row per window as `{ type, day, from, to }`, with the
   * DISPLAY strings already in `day`/`from`/`to` (see `onDaySelect` in
   * email-time-settings-content), so nothing here needs a lookup table.
   * `from`/`to` are null unless the type is `specific_time`.
   */
  private __sendWindowLabel(): string {
    const rows = this.__readSetting('run_time');
    if (!rows.length) return 'Sending any time';

    const [first] = rows;
    const day = first?.day || constants.EVERYDAY;
    const window = first?.from && first?.to ? `${first.from} – ${first.to}` : 'any time';
    const more = rows.length > 1 ? ` (+${rows.length - 1} more)` : '';
    return `${day}, ${window}${more}`;
  }

  /**
   * Whether the campaign was activated "Super charged" — the `super_charged` setting
   * (`[{ value: boolean }]`), written by KexyApi on activate. Drives the card at the top
   * of the page and the activate dialog's starting toggle.
   */
  isSuperCharged = (): boolean => isSuperChargedSetting(this.dripCampaign?.settings);

  /**
   * One `drip_campaign_settings` row's value as an array.
   *
   * Defensive about the string form for the same reason `__getSelectedSmtpId` is:
   * the backend stores `settingsValue` as a JSON string and not every path
   * through the app hands it over already parsed.
   */
  private __readSetting(settingsType: string): any[] {
    return readDripSetting(this.dripCampaign?.settings, settingsType);
  }

  handleClickNextButton = async () => {
    // Shared with reactivating a completed drip (see `getActivationBlocker`). A missing
    // list or SMTP opens the settings canvas — both are on its Enrollment Triggers tab.
    const blocker = this.dripCampaignService.getActivationBlocker({
      emailCount: this.emails.length,
      enrollListCount: this.getEnrolledList()?.length ?? 0,
      smtpId: this.__getSelectedSmtpId(),
    });
    if (blocker) {
      if (blocker.reason !== 'emails') this.openSettingsCanvas();
      await Swal.fire({ title: `Error`, text: blocker.message, icon: 'warning' });
      return;
    }

    const confirmed = await this.__isConfirmed();
    if (!confirmed) return;

    // Both steps below are called `silent` (see their own comments), so neither
    // touches the shared `loading` subject that drives the full-page skeleton — the
    // campaign is already fully rendered on screen and the user just confirmed this
    // via a modal, so blanking the whole page reads as a glitch, not a load. The
    // Activate button gets its own "please wait" state instead, for the whole
    // sequence, via `setActivating` — a single call site around both steps rather
    // than inside either one, since it must stay true across BOTH the activate POST
    // and the campaign refetch that follows it, not toggle off in between.
    this.dripCampaignService.setActivating(true);
    try {
      const isSuccess = await this.__launchDripCampaign(confirmed.superCharged);
      if (isSuccess) {
        await Swal.fire({
          title: `Congratulations!`,
          text: 'Drip campaign is now active.',
          icon: 'success',
        });

        await this.__refreshDripCampaign();
      }
    } finally {
      this.dripCampaignService.setActivating(false);
    }
  };

  /**
   * Called after activation AND after AI email generation finishes — an in-page
   * refresh in both cases, never a fresh navigation, so it's always `silent`
   * (skips the full-page skeleton). The email-generation path already has its own
   * "Generating your emails…" indicator (`isContentLoading`); stacking the page
   * skeleton on top of that would be the same kind of glitch this was written to
   * remove from the activate flow.
   */
  __refreshDripCampaign = async () => {
    const postData = {
      drip_campaign_id: this.dripCampaignId,
      supplier_id: this.userData.supplier_id,
    };
    await this.dripCampaignService.getCampaign(postData, true);
    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    // Covers both directions: mount the card once a campaign is activated, and
    // drop it once both scrapes report SUCCEEDED.
    this.__syncScrapeProgressVisibility();
    // Picks up where the scrape card leaves off.
    this.__syncCampaignLiveNotice();
  };


  __launchDripCampaign = async (superCharged: boolean) => {
    try {
      const postData = {
        drip_campaign_id: this.dripCampaignId,
        companyId: this.userData.supplier_id,
        // Saved by KexyApi as the `super_charged` setting (see `isSuperCharged`).
        superCharged,
        // notify: "true",
      };
      // silent: see `setActivating` above — the button carries the feedback instead.
      await this.dripCampaignService.activateDripCampaign(postData, true);
      return true;

    } catch (e) {
      await Swal.fire('Error', e.message);
      return false;
    }
  };

  public saveEmails = async (save = 'false') => {
    const formattedEmails = [];
    this.emails.forEach((e: DripEmail, index) => {
      const email = {
        emailSequence: e.emailSequence,
        emailSubject: e.emailSubject,
        emailContent: e.emailContent,
        aiRawData: e.aiRawData,
        rawEditorContent: e.rawEditorContent,
        delayBetweenPreviousEmail: JSON.stringify(e.delayBetweenPreviousEmail),
        emailLength: this.selectedEmailLength.value,
        emailTone: this.selectedEmailToneKey,
        templateOptions: this.selectedEmailTemplate.key,
        isSpintax: e.isSpintax,
      };
      formattedEmails.push(email);
    });
    console.log(this.selectedEmailTemplate);
    console.log({ formattedEmails });
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

  /**
   * The "Ready to activate?" dialog. Resolves with the user's choices, or null when it
   * was cancelled.
   */
  __isConfirmed = async (): Promise<IActivateDripResult | null> => {
    const ref = this.modal.open(ActivateDripModalComponent, { windowClass: 'kx-dialog-modal', centered: true });
    const modal = ref.componentInstance as ActivateDripModalComponent;
    modal.campaignTitle = this.dripCampaign?.details?.title?.title ?? '';
    modal.emailCount = this.emails.length;
    modal.listCount = this.getEnrolledList()?.length ?? 0;
    // Re-activating a super-charged campaign starts with the toggle on.
    modal.superCharged = this.isSuperCharged();

    try {
      return (await ref.result) as IActivateDripResult;
    } catch {
      return null; // dismissed
    }
  };


  handleClickBackButton = () => {
    // Navigate to the previous page
    this.backBtnClick();
  };
  handleClickSaveDraft = async () => {
    // this.saveEmails('true').then(() => {
    //   this.onDeleteUpdateEmail();
    // });

    // isSpintax travels with the option: it was left out, so switching a campaign to
    // Prospect Insights and saving kept is_spintax = false, and the live send passed
    // that to the AI.
    const isSpintax = this.selectedEmailTemplate.key === constants.PROSPECT_INSIGHTS_KEY;
    for (const email of this.emails) {
      email.templateOptions = this.selectedEmailTemplate.key;
      email.isSpintax = isSpintax;
      this.dripCampaignService.updateDripCampaignEmail({
        drip_campaign_email_id: email.id,
        templateOptions: this.selectedEmailTemplate.key,
        isSpintax,
      });
    }

    // Show sweet alert popup immediately
    await Swal.fire({
      title: `Saved!`,
      text: 'Save as draft successfully.',
      icon: 'success',
    });
  };

  onDeleteUpdateEmail = async () => {
    const postData = {
      drip_campaign_id: this.dripCampaign.id,
      supplier_id: this.userData.supplier_id,
    };
    const drip: any = await this.dripCampaignService.getCampaign(postData);

    for (const email of drip.emails) {
      const index = drip.emails.indexOf(email);
      email.emailSequence = index + 1;
      email.delayBetweenPreviousEmail = JSON.parse(email.delayBetweenPreviousEmail);
      await this.dripCampaignService.updateDripCampaignEmail({
        drip_campaign_email_id: email.id,
        emailSequence: email.emailSequence,
      });
      const delay: EmailDelay = email.delayBetweenPreviousEmail;
      email.isSpintax = this.selectedEmailTemplate.key === constants.PROSPECT_INSIGHTS_KEY;
      email.templateOptions = this.selectedEmailTemplate.key;
      email['emailText'] = `${delay.days} day(s) ${delay.hours} hour(s) ${delay.minutes} minute(s)`;
    }

    this.emails = drip.emails;
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

  // Resume a paused drip campaign — mirrors the pause/resume flow in
  // brand-list-of-drip-campaigns: confirm, then re-save the campaign with an
  // ACTIVE status. Updates the local status so the paused warning hides.
  isResuming = false;
  resumeDripCampaign = async () => {
    if (this.isResuming) return;
    if (!this.dripCampaign || this.dripCampaign.status !== constants.PAUSE) return;

    const isConfirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will resume the drip campaign and its scheduled emails.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Resume!',
    });
    if (isConfirm.dismiss) return;

    const payload = {
      dripCampaignId: this.dripCampaign.id,
      companyId: this.userData.supplier_id,
      dripCampaignTitleId: this.dripCampaign.details.title?.id,
      numberOfEmails: this.dripCampaign.details.numberOfEmails,
      emailTone: this.dripCampaign.details.emailTone,
      emailLength: this.dripCampaign.details.emailLength || '',
      websiteUrl: this.dripCampaign.details.websiteUrl,
      calendlyLink: this.dripCampaign.details.calendlyLink,
      campaignId: this.dripCampaign.details.campaignId,
      status: constants.ACTIVE,
      targetAudience: this.dripCampaign.targetAudience,
      emailAbout: this.dripCampaign.emailAbout,
      audienceType: this.dripCampaign.audienceType,
    };

    this.isResuming = true;
    const swal = this.pageUiService.showSweetAlertLoading();
    try {
      swal.showLoading();
      await this.dripCampaignService.createOrUpdateDripCampaign(payload);
      this.dripCampaign.status = constants.ACTIVE;
      // The paused warning goes away here, so the research card (if research is
      // unfinished) or the live notice has to take its place immediately —
      // otherwise resuming leaves the page with no status until the next reload.
      this.__syncScrapeProgressVisibility();
      this.__syncCampaignLiveNotice();
    } catch (e) {
      Swal.fire('Error', e.message);
      console.error(e);
    } finally {
      this.isResuming = false;
      swal.close();
    }
  };


  numberOfEmailsInputShow = false;
  handleShowHideNumberOfEmailsInput = () => {
    this.numberOfEmailsInputShow = !this.numberOfEmailsInputShow;
  };

  /**
   * Close the email-count popover on an outside click.
   *
   * `closest('.count-anchor')` covers BOTH the pencil and the popover itself, since
   * they share that wrapper — so this can't fight the pencil's own toggle (that click
   * returns early) and clicks inside the popover don't dismiss it.
   *
   * Bound on `document` rather than the host, because a click anywhere on the page
   * should dismiss it, not just one inside this component.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClickCloseCountPopover(event: MouseEvent): void {
    if (!this.numberOfEmailsInputShow) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.count-anchor')) return;
    this.numberOfEmailsInputShow = false;
  }

  /** Escape closes it too, from anywhere — matching the editor's popover. */
  @HostListener('document:keydown.escape')
  onEscapeCloseCountPopover(): void {
    if (this.numberOfEmailsInputShow) this.numberOfEmailsInputShow = false;
  }

  handleUpdateNumberOfEmail = async () => {
    this.numberOfEmailUpdateApiLoading = true;
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

  /**
   * The campaign's saved send-from SMTP id, or null when none is selected.
   *
   * Reads the `smtp_account` entry of `drip_campaign_settings`, whose value shape is
   * `[{ smtpId }]`. Mirrors how `email-time-settings-content` reads it on load, and
   * for the same reasons: `settingsValue` can arrive JSON-STRINGIFIED (the backend
   * stores it as a string), older rows use `value` instead of `smtpId`, and
   * detaching an SMTP writes `smtpId: null` rather than deleting the row — so the
   * setting EXISTING is not enough, the id inside it has to be non-empty.
   */
  __getSelectedSmtpId = (): any => {
    // RE-READ from the service first, exactly like getEnrolledList does. Saving in
    // the settings canvas goes through updateDripCampaignWithLatestSettings, which
    // constructs a NEW DripCampaign and swaps it into the service — so this
    // component's `this.dripCampaign` reference is stale afterwards. Without this,
    // picking an SMTP, saving, and clicking Activate again would still be blocked.
    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    return this.dripCampaignService.getSelectedSmtpId(this.dripCampaign);
  };

  onEmailToneSelect = (tone, index = null, rowIndex = null) => {
    this.selectedEmailToneKey = tone.value;
  };

  onSpintaxSelect = async (spintax, index = null, rowIndex = null) => {
    this.selectedEmailTemplate = spintax;
  };

  deleteEmptyEmail = (emptyEmailObj: object) => {
    const index = this.emails.indexOf(emptyEmailObj);
    if (index > -1) {
      this.emails.splice(index, 1);
    }
  };

  // NOTE: `exportInsights` and its helpers (`processInsights`, `categorizeInsights`,
  // `aggregateContacts`, `mergeContacts`, `exportCSV`) were removed along with the
  // "Export Insights" button in the sequence header. Per-email contact exports now
  // come from the Insights drawer, which exports the same list from an endpoint that
  // aggregates server-side — see `insightsBtnClick`.
  protected readonly CAMPAIGN_STATUS = CAMPAIGN_STATUS;
}
