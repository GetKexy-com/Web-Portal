import { Component, Input, OnInit } from "@angular/core";
import { AuthService } from "../../services/auth.service";
import {CommonModule, DatePipe} from '@angular/common';

@Component({
  selector: 'brand-convo-email',
  imports: [
    DatePipe,
    CommonModule,
  ],
  templateUrl: './brand-convo-email.component.html',
  styleUrl: './brand-convo-email.component.scss'
})
export class BrandConvoEmailComponent {
  @Input() email: any;
  @Input() forwardToCampaignUser;
  @Input() isLoading;
  userData;
  ignoreNextLoop = false;
  message;

  constructor(
    private _authService: AuthService,
  ) {
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    console.log(this.email);
    if (!this.ignoreNextLoop && this.email.sender_email !== this.userData.email) {
      this.message = this.email.message_content;
      this.ignoreNextLoop = true;
    } else {
      this.message = this.email.message_content;
    }
  }

  conversationPosition = () => {
    return this.email.sender_email !== this.userData.email;
  };

  handleClickSentToUser = () => {
    this.forwardToCampaignUser(this.email);
  };
}
