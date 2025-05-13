import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import { ModalComponent } from '../modal/modal.component';
import { FormsModule } from '@angular/forms';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'brand-convo-email',
  imports: [
    DatePipe,
    CommonModule,
    ModalComponent,
    FormsModule,
    ErrorMessageCardComponent,
    KexyButtonComponent,
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
  emailAddress;
  submitted = false;
  isValidEmail = false;

  constructor(
    private _authService: AuthService,
    private modal: NgbModal,
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
    this.emailAddress = localStorage.getItem('forwardEmail');
  }

  conversationPosition = () => {
    return this.email.senderEmail !== this.userData.email;
  };

  modalRef;
  handleClickSentToUser = (modalContent) => {
    this.modalRef = this.modal.open(modalContent);
  };

  sendEmail = async () => {
    this.submitted = true;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    this.isValidEmail = emailPattern.test(this.emailAddress);
    if (!this.isValidEmail || !this.emailAddress) return;

    localStorage.setItem('forwardEmail', this.emailAddress);

    this.isValidEmail = true;
    await this.forwardToCampaignUser(this.email);
    this.modalRef.close();
  };
}
