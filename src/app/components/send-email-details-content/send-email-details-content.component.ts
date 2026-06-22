import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgbActiveOffcanvas, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from 'src/app/services/auth.service';
import { constants } from '../../helpers/constants';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { DripEmail } from '../../models/DripEmail';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { SseService } from '../../services/sse.service';
import { PageUiService } from '../../services/page-ui.service';
import { ModalComponent } from '../modal/modal.component';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Contact } from '../../models/Contact';
import { KexyCustomRichEditorComponent } from '../kexy-custom-rich-editor/kexy-custom-rich-editor.component';

@Component({
  selector: 'send-email-details-content',
  imports: [
    ModalComponent,
    KexyButtonComponent,
    ErrorMessageCardComponent,
    KexySelectDropdownComponent,
    FormsModule,
    KexyCustomRichEditorComponent,
    CommonModule,
  ],
  templateUrl: './send-email-details-content.component.html',
  styleUrl: './send-email-details-content.component.scss',
})
export class SendEmailDetailsContentComponent implements OnInit, OnDestroy {
  public userData;
  public supplierId;
  public isLoading: boolean = false;
  public submitted: boolean = false;
  public emailContent;
  public emailSubject;
  public dripEmail: DripEmail;
  public selectedEmailToneKey;
  public isSpintax;
  public emailTones = constants.EMAIL_TONES;
  public singleEmailContentSubscription: Subscription;
  public singleEmailSubjectSubscription: Subscription;
  public singleEmailLoadingSubscription: Subscription;
  dripCampaignStatusSubscription: Subscription;
  dripCampaignStatus: string = '';
  disableTitle: string = '';
  public emailLengthKeys = constants.EMAIL_LENGTH_KEYS;
  // Set first index which is "short" by default.
  public selectedEmailLength;
  public hasPromotion;
  public dripCampaign;
  public isCheckedAddUnsubscribeLink = true;
  public contactList;

  /** Reference to the editor so we can push new content on demand. */
  @ViewChild(KexyCustomRichEditorComponent) editor!: KexyCustomRichEditorComponent;


  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private modal: NgbModal,
    private _authService: AuthService,
    private dripCampaignService: DripCampaignService,
    private sseService: SseService,
  ) {}

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;
    this.dripEmail = this.dripCampaignService.getEditEmail();
    this.hasPromotion = this.dripCampaignService.getHasPromotion();
    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    console.log(this.dripEmail);
    this.emailContent = this.dripEmail['rawEditorContent'] || this.dripEmail['emailContent'];
    this.emailSubject = this.dripEmail['emailSubject'];
    // Initial content reaches the editor via the [content] input binding in the template.
    // Do NOT call this.editor.loadContent() here — @ViewChild isn't resolved until ngAfterViewInit.

    this.dripCampaignStatusSubscription = this.dripCampaignService.dripCampaignStatus.subscribe(
      (status) => {
        this.dripCampaignStatus = status;
      },
    );

    this.singleEmailLoadingSubscription = this.sseService.dripSingleEmailLoading.subscribe(
      (loading) => {
        this.isLoading = loading;
      },
    );

    this.singleEmailContentSubscription = this.sseService.dripSingleEmailContent.subscribe(
      (content) => {
        if (content) {
          this.emailContent = content;
          this.editor?.loadContent(this.emailContent);
        }
      },
    );
    this.singleEmailSubjectSubscription = this.sseService.dripSingleEmailSubject.subscribe(
      (content) => {
        if (content) {
          this.emailSubject = content;
        }
      },
    );

    this.isSpintax = this.dripEmail.isSpintax;

    // Set email tone
    const emailTone = this.dripEmail['emailTone'];
    if (emailTone) {
      const index = this.emailTones.findIndex((i) => i.value === emailTone);
      this.onEmailToneSelect(this.emailTones[index]);
    } else {
      this.onEmailToneSelect(this.emailTones[0]);
    }

    // Set email length
    const emailLength = this.dripEmail['emailLength'];
    if (emailLength) {
      const index = this.emailLengthKeys.findIndex((i) => i.value === emailLength);
      this.onEmailLengthSelect(this.emailLengthKeys[index]);
    } else {
      this.onEmailLengthSelect(this.emailLengthKeys[0]);
    }

    const isAddUnsubscribeLink = this.dripEmail['isAddUnsubscribeLink'];
    console.log('isAddUnsubscribeLink', isAddUnsubscribeLink);
    if (isAddUnsubscribeLink) {
      this.isCheckedAddUnsubscribeLink = true;
    } else {
      this.isCheckedAddUnsubscribeLink = false;
    }
  }

  ngOnDestroy(): void {
    if (this.singleEmailLoadingSubscription) this.singleEmailLoadingSubscription.unsubscribe();
    if (this.singleEmailContentSubscription) this.singleEmailContentSubscription.unsubscribe();
    if (this.singleEmailSubjectSubscription) this.singleEmailSubjectSubscription.unsubscribe();
    this.sseService.removeSingleEmailData();
  }

  onEmailLengthSelect = (selectedValue, index = null, rowIndex = null) => {
    console.log({ selectedValue });
    this.selectedEmailLength = selectedValue;
  };

  generateEmailOrSaveDisabled = () => {
    // this.disableTitle = "This email has already been sent out to public and can not be deleted.";
    if (this.dripCampaignStatus === constants.COMPLETE) {
      return true;
    }
    if (this.dripEmail.is_email_sent) {
      return true;
    }
    this.disableTitle = '';
    return this.isLoading;
  };

  onEmailToneSelect = (tone, index = null, rowIndex = null) => {
    this.selectedEmailToneKey = tone.value;
  };

  handleSubmit = async () => {
    this.submitted = true;
    this.isLoading = true;
    // One source of truth = the raw editor HTML (rawEditorContent). That is what
    // the editor loads back into design mode and round-trips perfectly.
    // emailContent is a derived, one-way export: getHtml() inlines styles + wraps
    // the email shell so the styling survives in the recipient's inbox. It is sent
    // / previewed, never loaded back into the editor.
    const rawEditorContent = this.editor?.getRawHtml() || this.emailContent;
    const emailContent = this.editor?.getHtml() || this.emailContent;
    this.dripEmail['emailSubject'] = this.emailSubject;
    this.dripEmail['emailContent'] = emailContent;
    this.dripEmail['rawEditorContent'] = rawEditorContent;
    this.dripEmail['emailTone'] = this.selectedEmailToneKey;
    this.dripEmail['emailLength'] = this.selectedEmailLength.value;
    this.dripEmail['isAddUnsubscribeLink'] = this.isCheckedAddUnsubscribeLink ? 1 : 0;
    // If drip email does not have an ID, it means user did not save it yet.
    // So we avoid calling the update api and only update local data and hide the canvas
    if (!this.dripEmail.id) {
      this.hideCanvas();
      return;
    }
    const postData = {
      drip_campaign_email_id: this.dripEmail.id,
      emailSubject: this.dripEmail.emailSubject,
      emailContent,
      rawEditorContent,
      emailTone: this.selectedEmailToneKey,
      emailLength: this.selectedEmailLength.value,
      delayBetweenPreviousEmail: JSON.stringify(this.dripEmail.delayBetweenPreviousEmail),
      isAddUnsubscribeLink: this.isCheckedAddUnsubscribeLink,
    };
    try {
      await this.dripCampaignService.updateDripCampaignEmail(postData);
      this.hideCanvas();
    } catch (e) {
      await Swal.fire({
        title: `Error`,
        text: e.getMessages(),
        icon: 'warning',
      });
    }
  };

  hideCanvas = () => {
    this.sseService.updateDripBulkEmail(this.dripEmail);
    this.activeCanvas.dismiss('Cross click');
  };

  generateEmailContent = async () => {
    this.isLoading = true;
    this.contactList = this.dripCampaignService.generateDripCampaignListContact;
    const contact: Contact = this.contactList[0];
    const linkedinData: any = await this.dripCampaignService.getLinkedinData({ contactId: contact.id });
    const websiteData: any = await this.dripCampaignService.getWebsiteData({ contactId: contact.id });
    const locationData: any = await this.dripCampaignService.getLocationData({ contactId: contact.id });

    const content = this.emailSubject + (this.editor?.getRawHtml() || this.emailContent);
    const data = {
      email_tone: this.selectedEmailToneKey,
      email_number: this.dripEmail.emailSequence,
      email_length: this.selectedEmailLength.key,
      promotion_info: this.hasPromotion,
      isSpintax: this.isSpintax,
      content,
      lead_magnet: this.dripCampaign.leadMagnet,
      linkedin_scrapper: linkedinData,
      sports_scrapper: {},
      google_map_scrapper: locationData ? locationData.scrapedData : {},
      web_scrapper: websiteData ? websiteData.rawData : {},
      prospect: {
        name: this.contactList[0]?.contactName,
        company: this.contactList[0]?.companyName,
        industry: this.contactList[0]?.details?.organization?.industry,
        location: `${this.contactList[0]?.details?.city}, ${this.contactList[0].details?.state}, ${this.contactList[0].details?.country}`,
        website: "",
        linkedinUrl: this.contactList[0]?.details?.linkedinUrl,
      }
    };
    await this.sseService.getDripFollowUpEmailContentStream(data);
  };

  @ViewChild('personalizationTagsModal') private personalizationTagsModal;

  showPersonalizationTagsInfoPopup = (ev) => {
    ev.preventDefault();
    this.modal.open(this.personalizationTagsModal);
  };

  handleCheckboxClick = () => {
    this.isCheckedAddUnsubscribeLink = !this.isCheckedAddUnsubscribeLink;
  };
}

