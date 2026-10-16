import { Component, Input, OnInit } from '@angular/core';
import {
  DripEmail,
  EmailDelay,
  IDripEmailDeletePreview,
  IDripEmailDeleteResult,
} from '../../models/DripEmail';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { constants } from '../../helpers/constants';
import { CommonModule, NgClass } from '@angular/common';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { SendCountdownComponent } from '../send-countdown/send-countdown.component';
import { IEmailSendSchedule } from '../../models/EmailSendProgress';
import { scheduleProspectsFilter } from '../../helpers/send-schedule-label';
import {
  confirmDeleteEmail,
  showDeleteNotice,
  showEmailDeleted,
} from '../../helpers/drip-email-delete-dialogs';

@Component({
  selector: 'drip-campaign-card',
  imports: [
    NgClass,
    KexyButtonComponent,
    CommonModule,
    SendCountdownComponent,
  ],
  templateUrl: './drip-campaign-card.component.html',
  styleUrl: './drip-campaign-card.component.scss',
})
export class DripCampaignCardComponent implements OnInit {
  @Input() headerIcon;
  @Input() headerTitle;
  @Input() emailText;
  @Input() emailContacts = [];
  /** Delay cards: the soonest next send among `emailContacts`, from the API. */
  @Input() nextSend: IEmailSendSchedule | null = null;
  @Input() clockOffsetMs = 0;
  @Input() clickRate;
  @Input() showBlueBorder;
  @Input() isDelayCard = false;
  @Input() showDetailsBtnClick;
  @Input() previewBtnClick;
  @Input() insightsBtnClick;
  @Input() showDripCampaignContacts;
  @Input() deleteEmptyEmail;
  @Input() onDeleteUpdateEmail;
  @Input() email: DripEmail;
  userData;
  isLoading = false;
  dripCampaignStatusSubscription: Subscription;
  dripCampaignStatus: string = '';
  disableTitle: string = '';
  dripCampaign;

  constructor(
    private dripCampaignService: DripCampaignService,
    private _authService: AuthService,
  ) {
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    this.dripCampaignStatusSubscription = this.dripCampaignService.dripCampaignStatus.subscribe(status => {
      this.dripCampaignStatus = status;
      console.log(this.dripCampaignStatus);
    });
  }

  handleShowDetailsBtnClick = () => {
    this.showDetailsBtnClick(this.email);
  };

  handlePreviewEmailBtnClick = () => {
    this.previewBtnClick(this.email);
  };

  handleInsightsBtnClick = () => {
    this.insightsBtnClick(this.email);
  };

  /** The Delay card's countdown: Insights for this email, on the tab its prospect is in. */
  handleNextSendClick = () => {
    this.insightsBtnClick?.(this.email, scheduleProspectsFilter(this.nextSend));
  };

  deleteLoading = false;
  deleteItem = async () => {
    // Fast path; the API refuses it too. Sent and queued emails CAN be deleted: the API
    // shifts prospects with the renumber, and the dialog below asks about queued sends.
    if (this.dripCampaignStatus === 'active') {
      await this.__pauseFirstNotice('Pause the campaign before deleting an email.');
      return;
    }

    // If emailText is not present that means user created an empty email and delay field.
    // For that we need normal delete without any api call
    if (!this.emailText) {
      if (await confirmDeleteEmail({ label: this.headerTitle })) this.deleteEmptyEmail(this.email);
      return;
    }

    this.deleteLoading = true;
    try {
      await this.__confirmAndDelete();
    } finally {
      this.deleteLoading = false;
    }
  };

  /**
   * Asks the API what deleting would affect, confirms with the user in those terms, then
   * deletes. A 409 means the email was queued for more prospects after the dialog was
   * built, so it checks again and asks again rather than cancelling sends unseen.
   */
  private __confirmAndDelete = async (): Promise<void> => {
    let preview: IDripEmailDeletePreview;
    try {
      preview = await this.dripCampaignService.getDripEmailDeletePreview(
        this.dripCampaign.id,
        this.email.id,
      );
    } catch (e) {
      await this.__errorNotice(e?.message);
      return;
    }
    if (!preview.canDelete) {
      await this.__pauseFirstNotice(preview.blockedReason);
      return;
    }

    const confirmed = await confirmDeleteEmail({
      label: this.headerTitle,
      subject: this.emailText,
      sentCount: preview.sentCount,
      queuedCount: preview.queuedCount,
    });
    if (!confirmed) return;

    let result: IDripEmailDeleteResult;
    try {
      result = await this.dripCampaignService.deleteDripCampaignEmail({
        dripCampaignId: this.dripCampaign.id,
        drip_campaign_email_id: this.email.id,
        // The API cancels no more than this; if more were queued since, it answers 409.
        confirmedQueuedCount: preview.queuedCount,
      });
    } catch (e) {
      if (e?.statusCode === 409) {
        await showDeleteNotice({
          title: 'The queue changed',
          text: 'More prospects were queued for this email since you opened this. Please confirm again.',
          icon: 'fa-refresh',
          button: 'Review again',
        });
        return this.__confirmAndDelete();
      }
      if (e?.statusCode === 400) {
        await this.__pauseFirstNotice(e?.message);
        return;
      }
      await this.__errorNotice(e?.message);
      return;
    }

    showEmailDeleted({
      label: this.headerTitle,
      subject: this.emailText,
      remaining: result.emails.length,
      cancelled: result.cancelledQueueIds.length,
    });
    this.onDeleteUpdateEmail(result);
  };

  private __pauseFirstNotice = (text: string | null) =>
    showDeleteNotice({
      title: 'Pause the campaign first',
      text: text || 'Pause the campaign before deleting an email.',
      icon: 'fa-pause',
    });

  private __errorNotice = (text?: string) =>
    showDeleteNotice({
      title: "Couldn't delete this email",
      text: text || 'Something went wrong. Please try again.',
      icon: 'fa-exclamation',
    });

  deleteDisabled = () => {
    // this.disableTitle = "Email has been sent out to public and can not be changed";
    if (this.dripCampaignStatus === constants.COMPLETE) {
      return true;
    }
    // No `isEmailSent` check: nothing in the API sets it, and a sent email may now be
    // deleted (the API keeps every prospect on the right email).
    this.disableTitle = '';
    return this.deleteLoading;
  };

  protected readonly constants = constants;

}
