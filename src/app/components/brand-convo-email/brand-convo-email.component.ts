import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import {ModalComponent} from '../modal/modal.component';
import {FormsModule} from '@angular/forms';
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';

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
  }

  conversationPosition = () => {
    return this.email.senderEmail !== this.userData.email;
  };

  modalRef;
  handleClickSentToUser = (modalContent) => {
    this.modalRef = this.modal.open(modalContent);
  };

  extractUserReply(emailHtml: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(emailHtml, "text/html");

    // Remove quoted reply sections (e.g., previous emails)
    const quotes = doc.querySelectorAll(".gmail_quote, blockquote");
    quotes.forEach(q => q.remove());

    // Remove Gmail signature
    const signatures = doc.querySelectorAll(".gmail_signature");
    signatures.forEach(s => s.remove());

    // Remove invisible tracking images (e.g., width/height 0)
    const invisibleImgs = doc.querySelectorAll("img[width=\"0\"][height=\"0\"]");
    invisibleImgs.forEach(img => img.remove());

    // Remove all HTML tables
    const tables = doc.querySelectorAll("table");
    tables.forEach(table => table.remove());

    // Extract the cleaned inner text or HTML
    const body = doc.body;
    return body?.innerHTML.trim() || "";
  }

  sendEmail = async () => {
    this.submitted = true;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    this.isValidEmail = emailPattern.test(this.emailAddress);
    if (!this.isValidEmail || !this.emailAddress) return;

    this.isValidEmail = true;
    const messageContent = this.extractUserReply(this.message);
    await this.forwardToCampaignUser(this.email, this.emailAddress, messageContent);
    this.modalRef.close();
  };
}
