import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
  /** Email HTML for the iframe srcdoc (bypassed — rendered in a sandboxed frame). */
  message: SafeHtml;
  emailAddress;
  submitted = false;
  isValidEmail = false;

  constructor(
    private _authService: AuthService,
    private modal: NgbModal,
    private sanitizer: DomSanitizer,
  ) {
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    // Render the message in a sandboxed <iframe srcdoc> (like the editor's Preview)
    // instead of [innerHTML]: [innerHTML] drops the <html>/<head>/<body> wrapper and
    // strips inline styles, so full-HTML emails render broken. The iframe shows them
    // faithfully. bypassSecurityTrustHtml is required for srcdoc to keep the full
    // document; safe because the frame's `sandbox` (see template) forbids scripts.
    this.message = this.sanitizer.bypassSecurityTrustHtml(
      this.prepareFrameHtml(this.email.messageContent, this.conversationPosition()),
    );
    this.emailAddress = localStorage.getItem('forwardEmail');
  }

  /**
   * Prep message HTML for the iframe. Injects `<base target="_blank">` (links open
   * externally — in-frame nav is blocked by most sites' X-Frame-Options) and the
   * chat-bubble styling the app CSS can no longer reach inside the isolated frame:
   * received (left) messages get a blue background + white text, sent (right) get
   * white + black. Also keeps the `.gmail_quote` hide. Works for full documents and
   * fragments alike (the browser wraps a fragment in html/body).
   */
  private prepareFrameHtml(html: string, received: boolean): string {
    if (!html) return '';
    const bubble = received ? 'background:#0d50cd;color:#fff;' : 'background:#fff;color:#000;';
    const linkColor = received ? '#ffffff' : '#0d50cd';
    const head =
      '<base target="_blank" rel="noopener noreferrer" />' +
      '<style>' +
      `html,body{margin:0;padding:0;}` +
      `body{padding:10px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;${bubble}}` +
      `body a{color:${linkColor};}` +
      `p{margin:.4rem 0;}` +
      `img{max-width:100%;height:auto;}` +
      `.gmail_quote{display:none !important;}` +
      '</style>';
    return /<head[\s>]/i.test(html)
      ? html.replace(/<head([^>]*)>/i, `<head$1>${head}`)
      : head + html;
  }

  /** Auto-size the message iframe to exactly fit its content once loaded. */
  onFrameLoad(event: Event): void {
    const iframe = event.target as HTMLIFrameElement;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc?.body) return;
      const resize = () => {
        // Use body.scrollHeight (the real content height). documentElement.scrollHeight
        // is clamped to the iframe's current rendered height (~150px default), so it
        // over-reports for short content and leaves empty space below.
        const h = doc.body.scrollHeight;
        if (h) iframe.style.height = `${h}px`;
      };
      resize();
      // Images/fonts can change the height after the initial paint — re-measure.
      requestAnimationFrame(resize);
    } catch {
      /* cross-origin (shouldn't happen with srcdoc + allow-same-origin) */
    }
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
