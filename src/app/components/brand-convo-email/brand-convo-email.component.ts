import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'brand-convo-email',
  imports: [
    DatePipe,
    CommonModule,
  ],
  templateUrl: './brand-convo-email.component.html',
  styleUrl: './brand-convo-email.component.scss',
})
export class BrandConvoEmailComponent implements OnInit {
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
    if (!this.ignoreNextLoop && this.email.senderEmail !== this.userData.email) {
      this.message = this.email.messageContent;
      this.ignoreNextLoop = true;
    } else {
      this.message = this.email.messageContent;
    }
  }

  conversationPosition = () => {
    return this.email.senderEmail !== this.userData.email;
  };

  handleClickSentToUser = () => {
    this.forwardToCampaignUser(this.email);
  };
}
