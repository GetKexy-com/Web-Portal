// import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
// import { NgbActiveOffcanvas, NgbModal } from "@ng-bootstrap/ng-bootstrap";
// import { AuthService } from "src/app/services/auth.service";
// import { constants } from "../../helpers/constants";
// import { DripCampaignService } from "../../services/drip-campaign.service";
// import { DripEmail } from "../../models/DripEmail";
// import Swal from "sweetalert2";
// import { Subscription } from "rxjs";
// import { SseService } from "../../services/sse.service";
// import { PageUiService } from "../../services/page-ui.service";
// import {ModalComponent} from '../modal/modal.component';
// import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
// import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
// import {FormsModule} from '@angular/forms';
// import {KexyRichEditorComponent} from '../kexy-rich-editor/kexy-rich-editor.component';
//
// @Component({
//   selector: 'send-email-details-content',
//   imports: [
//     ModalComponent,
//     KexyButtonComponent,
//     ErrorMessageCardComponent,
//     KexySelectDropdownComponent,
//     FormsModule,
//     KexyRichEditorComponent
//   ],
//   templateUrl: './send-email-details-content.component.html',
//   styleUrl: './send-email-details-content.component.scss'
// })
// export class SendEmailDetailsContentComponent {
//   public userData;
//   public supplierId;
//   public isLoading: boolean = false;
//   public submitted: boolean = false;
//   public emailContent;
//   public emailSubject;
//   public dripEmail: DripEmail;
//   public selectedEmailToneKey;
//   public emailTones = constants.EMAIL_TONES;
//   public singleEmailContentSubscription: Subscription;
//   public singleEmailSubjectSubscription: Subscription;
//   public singleEmailLoadingSubscription: Subscription;
//   dripCampaignStatusSubscription: Subscription;
//   dripCampaignStatus: string = "";
//   disableTitle: string = "";
//   public emailLengthKeys = constants.EMAIL_LENGTH_KEYS;
//   // Set first index which is "short" by default.
//   public selectedEmailLength;
//   public hasPromotion;
//   public dripCampaign;
//
//
//   constructor(
//     public activeCanvas: NgbActiveOffcanvas,
//     private modal: NgbModal,
//     private _authService: AuthService,
//     private dripCampaignService: DripCampaignService,
//     private sseService: SseService,
//   ) {
//   }
//
//   ngOnInit(): void {
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//     this.dripEmail = this.dripCampaignService.getEditEmail();
//     this.hasPromotion = this.dripCampaignService.getHasPromotion();
//     console.log(this.dripEmail);
//     this.emailContent = this.dripEmail.email_content;
//     this.emailSubject = this.dripEmail.email_subject;
//
//     this.dripCampaignStatusSubscription = this.dripCampaignService.dripCampaignStatus.subscribe(status => {
//       this.dripCampaignStatus = status;
//     });
//
//     this.singleEmailLoadingSubscription = this.sseService.dripSingleEmailLoading.subscribe((loading) => {
//       this.isLoading = loading;
//     });
//
//     this.singleEmailContentSubscription = this.sseService.dripSingleEmailContent.subscribe((content) => {
//       if (content) {
//         this.emailContent = content;
//       }
//     });
//     this.singleEmailSubjectSubscription = this.sseService.dripSingleEmailSubject.subscribe((content) => {
//       if (content) {
//         this.emailSubject = content;
//       }
//     });
//
//     // Set email tone
//     const emailTone = this.dripEmail["email_tone"];
//     if (emailTone) {
//       const index = this.emailTones.findIndex(i => i.value === emailTone);
//       this.onEmailToneSelect(this.emailTones[index]);
//     } else {
//       this.onEmailToneSelect(this.emailTones[0]);
//     }
//
//     // Set email length
//     const emailLength = this.dripEmail["email_length"];
//     if (emailLength) {
//       const index = this.emailLengthKeys.findIndex(i => i.value === emailLength);
//       this.onEmailLengthSelect(this.emailLengthKeys[index]);
//     } else {
//       this.onEmailLengthSelect(this.emailLengthKeys[0]);
//     }
//   }
//
//   ngOnDestroy(): void {
//     if (this.singleEmailLoadingSubscription) this.singleEmailLoadingSubscription.unsubscribe();
//     if (this.singleEmailContentSubscription) this.singleEmailContentSubscription.unsubscribe();
//     if (this.singleEmailSubjectSubscription) this.singleEmailSubjectSubscription.unsubscribe();
//     this.sseService.removeSingleEmailData();
//   }
//
//   onEmailLengthSelect = (selectedValue, index = null, rowIndex = null) => {
//     console.log({ selectedValue });
//     this.selectedEmailLength = selectedValue;
//   };
//
//   generateEmailOrSaveDisabled = () => {
//     // this.disableTitle = "This email has already been sent out to public and can not be deleted.";
//     if (this.dripCampaignStatus === constants.COMPLETE) {
//       return true;
//     }
//     if (this.dripEmail.is_email_sent) {
//       return true;
//     }
//     this.disableTitle = "";
//     return this.isLoading;
//   };
//
//
//   updatedEmailContent;
//   onEmailContentChange = (editor) => {
//     setTimeout(() => {
//       this.updatedEmailContent = editor.getData();
//     }, 10);
//   };
//
//   onEmailToneSelect = (tone, index = null, rowIndex = null) => {
//     this.selectedEmailToneKey = tone.value;
//   };
//
//   handleSubmit = async () => {
//     this.submitted = true;
//     this.isLoading = true;
//     this.dripEmail.email_subject = this.emailSubject;
//     this.dripEmail.email_content = this.updatedEmailContent || this.emailContent;
//     this.dripEmail["email_tone"] = this.selectedEmailToneKey;
//     this.dripEmail["email_length"] = this.selectedEmailLength.value;
//     // If drip email does not have an ID, it means user did not save it yet.
//     // So we avoid calling the update api and only update local data and hide the canvas
//     if (!this.dripEmail.id) {
//       this.hideCanvas();
//       return;
//     }
//
//     const postData = {
//       supplier_id: "",
//       drip_campaign_id: this.dripEmail.drip_campaign_id,
//       drip_campaign_email_id: this.dripEmail.id,
//       email_subject: this.dripEmail.email_subject,
//       email_content: this.dripEmail.email_content,
//       email_tone: this.selectedEmailToneKey,
//       email_length: this.selectedEmailLength.value,
//       delay_between_previous_email: JSON.stringify(this.dripEmail.delay_between_previous_email),
//     };
//     try {
//       await this.dripCampaignService.updateDripCampaignEmail(postData);
//       this.hideCanvas();
//     } catch (e) {
//       await Swal.fire({
//         title: `Error`,
//         text: e.getMessages(),
//         icon: "warning",
//       });
//     }
//   };
//
//   hideCanvas = () => {
//     this.sseService.updateDripBulkEmail(this.dripEmail);
//     this.activeCanvas.dismiss("Cross click");
//   };
//
//   generateEmailContent = async () => {
//     const content = this.emailSubject + this.emailContent;
//     const data = {
//       email_tone: this.selectedEmailToneKey,
//       email_number: this.dripEmail.email_sequence,
//       email_length: this.selectedEmailLength.key,
//       promotion_info: this.hasPromotion,
//       content,
//     };
//     await this.sseService.getDripFollowUpEmailContentStream(data);
//   };
//
//   @ViewChild("personalizationTagsModal") private personalizationTagsModal;
//
//   showPersonalizationTagsInfoPopup = (ev) => {
//     ev.preventDefault();
//     this.modal.open(this.personalizationTagsModal);
//   };
// }


import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { constants } from '../../helpers/constants';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { DripEmail } from '../../models/DripEmail';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { SseService } from '../../services/sse.service';
import { ModalComponent } from '../modal/modal.component';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { FormsModule } from '@angular/forms';
import { KexyRichEditorComponent } from '../kexy-rich-editor/kexy-rich-editor.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'send-email-details-content',
  standalone: true,
  imports: [
    ModalComponent,
    KexyButtonComponent,
    ErrorMessageCardComponent,
    KexySelectDropdownComponent,
    FormsModule,
    KexyRichEditorComponent
  ],
  templateUrl: './send-email-details-content.component.html',
  styleUrl: './send-email-details-content.component.scss'
})
export class SendEmailDetailsContentComponent implements OnInit, OnDestroy {
  // Services
  private authService = inject(AuthService);
  private dripCampaignService = inject(DripCampaignService);
  private sseService = inject(SseService);
  private modalService = inject(NgbModal);

  // State signals
  userData = signal<any>(null);
  supplierId = signal<string>('');
  isLoading = signal(false);
  submitted = signal(false);
  emailContent = signal<string>('');
  emailSubject = signal<string>('');
  dripEmail = signal<DripEmail | null>(null);
  selectedEmailToneKey = signal<string>('');
  emailTones = constants.EMAIL_TONES;
  dripCampaignStatus = signal<string>('');
  disableTitle = signal<string>('');
  emailLengthKeys = constants.EMAIL_LENGTH_KEYS;
  selectedEmailLength = signal<any>(null);
  hasPromotion = signal<boolean>(false);
  updatedEmailContent = signal<string>('');
  personalizationTagsModal = signal<boolean>(false);

  // Subscriptions
  private subscriptions: Subscription = new Subscription();

  constructor(public activeCanvas: NgbActiveOffcanvas) {}

  ngOnInit(): void {
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);
    this.dripEmail.set(this.dripCampaignService.getEditEmail());
    this.hasPromotion.set(this.dripCampaignService.getHasPromotion());

    this.emailContent.set(this.dripEmail()?.email_content || '');
    this.emailSubject.set(this.dripEmail()?.email_subject || '');

    this.setupSubscriptions();
    this.initializeEmailSettings();
  }

  private setupSubscriptions(): void {
    this.subscriptions.add(
      this.dripCampaignService.dripCampaignStatus.subscribe(status => {
        this.dripCampaignStatus.set(status);
      })
    );

    this.subscriptions.add(
      this.sseService.dripSingleEmailLoading.subscribe(loading => {
        this.isLoading.set(loading);
      })
    );

    this.subscriptions.add(
      this.sseService.dripSingleEmailContent.subscribe(content => {
        if (content) {
          this.emailContent.set(content);
        }
      })
    );

    this.subscriptions.add(
      this.sseService.dripSingleEmailSubject.subscribe(content => {
        if (content) {
          this.emailSubject.set(content);
        }
      })
    );
  }

  private initializeEmailSettings(): void {
    // Set email tone
    const emailTone = this.dripEmail()?.['email_tone'];
    const toneIndex = emailTone
      ? this.emailTones.findIndex(i => i.value === emailTone)
      : 0;
    this.onEmailToneSelect(this.emailTones[toneIndex]);

    // Set email length
    const emailLength = this.dripEmail()?.['email_length'];
    const lengthIndex = emailLength
      ? this.emailLengthKeys.findIndex(i => i.value === emailLength)
      : 0;
    this.onEmailLengthSelect(this.emailLengthKeys[lengthIndex]);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.sseService.removeSingleEmailData();
  }

  onEmailLengthSelect(selectedValue: any): void {
    this.selectedEmailLength.set(selectedValue);
  }

  generateEmailOrSaveDisabled(): boolean {
    if (this.dripCampaignStatus() === constants.COMPLETE) {
      this.disableTitle.set('Campaign is completed and cannot be modified');
      return true;
    }
    if (this.dripEmail()?.is_email_sent) {
      this.disableTitle.set('Email has been sent and cannot be changed');
      return true;
    }
    this.disableTitle.set('');
    return this.isLoading();
  }

  onEmailContentChange(editor: any): void {
    setTimeout(() => {
      this.updatedEmailContent.set(editor.getData());
    }, 10);
  }

  onEmailToneSelect(tone: any): void {
    this.selectedEmailToneKey.set(tone.value);
  }

  async handleSubmit(): Promise<void> {
    this.submitted.set(true);
    this.isLoading.set(true);

    const currentDripEmail = this.dripEmail();
    if (!currentDripEmail) return;

    currentDripEmail.email_subject = this.emailSubject();
    currentDripEmail.email_content = this.updatedEmailContent() || this.emailContent();
    currentDripEmail['email_tone'] = this.selectedEmailToneKey();
    currentDripEmail['email_length'] = this.selectedEmailLength().value;

    if (!currentDripEmail.id) {
      this.hideCanvas();
      return;
    }

    try {
      await this.dripCampaignService.updateDripCampaignEmail({
        supplier_id: this.supplierId(),
        drip_campaign_id: currentDripEmail.drip_campaign_id,
        drip_campaign_email_id: currentDripEmail.id,
        email_subject: currentDripEmail.email_subject,
        email_content: currentDripEmail.email_content,
        email_tone: this.selectedEmailToneKey(),
        email_length: this.selectedEmailLength().value,
        delay_between_previous_email: JSON.stringify(currentDripEmail.delay_between_previous_email),
      });
      this.hideCanvas();
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: error.message || 'Failed to update email',
        icon: 'warning',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  hideCanvas(): void {
    this.sseService.updateDripBulkEmail(this.dripEmail()!);
    this.activeCanvas.dismiss('Cross click');
  }

  async generateEmailContent(): Promise<void> {
    const data = {
      email_tone: this.selectedEmailToneKey(),
      email_number: this.dripEmail()?.email_sequence || 0,
      email_length: this.selectedEmailLength().key,
      promotion_info: this.hasPromotion(),
      content: this.emailSubject() + this.emailContent(),
    };
    await this.sseService.getDripFollowUpEmailContentStream(data);
  }

  showPersonalizationTagsInfoPopup(event: Event): void {
    event.preventDefault();
    this.personalizationTagsModal.set(true);
  }

  closePersonalizationModal(): void {
    this.personalizationTagsModal.set(false);
  }
}
