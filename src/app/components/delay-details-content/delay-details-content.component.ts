import { Component } from '@angular/core';
import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { AuthService } from "src/app/services/auth.service";
import { DripEmail, EmailDelay } from "../../models/DripEmail";
import { DripCampaignService } from "../../services/drip-campaign.service";
import Swal from "sweetalert2";
import { SseService } from "../../services/sse.service";
import {FormsModule} from '@angular/forms';
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'delay-details-content',
  imports: [
    FormsModule,
    ErrorMessageCardComponent,
    CommonModule,
  ],
  templateUrl: './delay-details-content.component.html',
  styleUrl: './delay-details-content.component.scss'
})
export class DelayDetailsContentComponent {
  userData;
  supplierId;
  isLoading: boolean = false;
  submitted: boolean = false;
  dripEmail: DripEmail;
  delay: EmailDelay;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private dripCampaignService: DripCampaignService,
    private sseService: SseService,
    private _authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;
    this.dripEmail = this.dripCampaignService.getEditEmail();
    console.log(this.dripEmail);
    this.delay = this.dripEmail.delay_between_previous_email;
  }

  onDelayDaysChange = () => {
    if (this.delay.days < 0) this.delay.days = 0;
  }

  onDelayHoursChange = () => {
    if (this.delay.hours < 0) this.delay.hours = 0;
    if (this.delay.hours > 24) this.delay.hours = 24;
  }

  onDelayMinuteChange = () => {
    if (this.delay.minutes < 0) this.delay.minutes = 0;
    if (this.delay.minutes > 60) this.delay.minutes = 60;
  }

  handleSubmit = async () => {
    this.submitted = true;

    if (this.delay.days === 0 && this.delay.hours === 0 && this.delay.minutes === 0) {
      return;
    }

    this.isLoading = true;
    this.dripEmail.delay_between_previous_email = this.delay;
    // If drip email does not have an ID, it means user did not save it yet.
    // So we avoid calling the update api and only update local data and hide the canvas
    if (!this.dripEmail.id) {
      await this.hideCanvas();
      return;
    }
    const postData = {
      supplier_id: "",
      drip_campaign_id: this.dripEmail.drip_campaign_id,
      drip_campaign_email_id: this.dripEmail.id,
      email_subject: this.dripEmail.email_subject,
      email_content: this.dripEmail.email_content,
      delay_between_previous_email: JSON.stringify(this.dripEmail.delay_between_previous_email),
    };
    try {
      await this.dripCampaignService.updateDripCampaignEmail(postData);
      await this.hideCanvas();
    } catch (e) {
      await Swal.fire({
        title: `Error`,
        text: e.getMessages(),
        icon: "warning",
      });
    }

  };

  hideCanvas = async () => {
    console.log(this.dripEmail);
    this.sseService.updateDripBulkEmail(this.dripEmail);
    this.activeCanvas.dismiss("Cross click");
  };
}
