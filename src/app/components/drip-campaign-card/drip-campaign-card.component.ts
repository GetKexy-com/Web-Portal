import { Component, Input, OnInit } from '@angular/core';
import { DripEmail, EmailDelay } from '../../models/DripEmail';
import Swal from 'sweetalert2';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { constants } from '../../helpers/constants';
import { CommonModule, NgClass } from '@angular/common';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';

@Component({
  selector: 'drip-campaign-card',
  imports: [
    NgClass,
    KexyButtonComponent,
    CommonModule,
  ],
  templateUrl: './drip-campaign-card.component.html',
  styleUrl: './drip-campaign-card.component.scss',
})
export class DripCampaignCardComponent implements OnInit {
  @Input() headerIcon;
  @Input() headerTitle;
  @Input() emailText;
  @Input() emailContacts = [];
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

  deleteLoading = false;
  deleteItem = async () => {
    if (!this.isDelayCard && this.email['isEmailSent']) {
      await Swal.fire({
        title: `Error`,
        text: 'This email has already been sent out to public and can not be deleted.',
        icon: 'warning',
      });
      return;
    }

    if(this.dripCampaignStatus === 'active') {
      await Swal.fire({
        title: `Error`,
        text: 'Emails from an active drip campaign cannot be deleted.',
        icon: 'warning',
      });
      return;
    }

    const confirmed = await this.__isConfirmed();
    if (!confirmed) return;

    this.deleteLoading = true;
    // If emailText is not present that means user created an empty email and delay field.
    // For that we need normal delete without any api call
    if (!this.emailText) {
      this.deleteEmptyEmail(this.email);
      return;
    }
    await this.__deleteEmail();

    this.deleteLoading = false;
    this.onDeleteUpdateEmail();
  };

  __deleteEmail = async () => {
    const postData = {
      dripCampaignId: this.dripCampaign.id,
      drip_campaign_email_id: this.email.id,
    };
    console.log('email', this.email);
    try {
      await this.dripCampaignService.deleteDripCampaignEmail(postData);
      Swal.fire({
        title: `Success`,
        text: 'Email has been deleted.',
        icon: 'success',
      });
    } catch (e) {
      await Swal.fire({
        title: `Error`,
        text: e.getMessages(),
        icon: 'warning',
      });
    }
  };

  __isConfirmed = async (text = 'This action can not be undone.') => {
    let isConfirm = await Swal.fire({
      title: `Are you sure?`,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Delete!',
    });

    return !isConfirm.dismiss;
  };

  deleteDisabled = () => {
    // this.disableTitle = "Email has been sent out to public and can not be changed";
    if (this.dripCampaignStatus === constants.COMPLETE) {
      return true;
    }
    if (this.email['isEmailSent']) {
      return true;
    }
    this.disableTitle = '';
    return this.deleteLoading;
  };

  protected readonly constants = constants;

}
