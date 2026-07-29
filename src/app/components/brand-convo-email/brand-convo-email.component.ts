import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
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
export class BrandConvoEmailComponent implements OnInit, OnDestroy {
  @Input() email: any;
  @Input() forwardToCampaignUser;
  @Input() isLoading;
  /** Fires once the message iframe has loaded + been sized, so a parent can hold
   *  the whole thread hidden until every message is ready (avoids reflow jumps). */
  @Output() frameReady = new EventEmitter<void>();
  private reported = false;
  userData;
  ignoreNextLoop = false;
  /** Email HTML for the iframe srcdoc (bypassed — rendered in a sandboxed frame). */
  message: SafeHtml;
  private resizeObserver?: ResizeObserver;
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
   * Prep message HTML for the iframe. Strips every script vector so the sandbox
   * (no allow-scripts) doesn't log "Blocked script execution in about:srcdoc" for
   * each message: <script>/<noscript> elements, inline on* event handlers (email
   * tracking pixels love onload/onerror), and javascript: URLs. Then injects
   * `<base target="_blank">` (links open externally — in-frame nav is blocked by
   * most sites' X-Frame-Options) and the chat-bubble styling the app CSS can no
   * longer reach inside the isolated frame: received (left) = blue bg + white text,
   * sent (right) = white + black. Works for full documents and fragments alike
   * (DOMParser wraps a fragment in html/body).
   */
  private prepareFrameHtml(html: string, received: boolean): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('script, noscript').forEach((n) => n.remove());
    doc.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
        } else if (
          (name === 'href' || name === 'src' || name === 'xlink:href') &&
          /^\s*javascript:/i.test(attr.value)
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // These MUST match the bubble colours in the component SCSS — the CSS colour
    // shows through the transparent frame until the content paints, so a mismatch
    // flashes the wrong colour. Both now use the app's token blue ($kx-primary-deep
    // #095dd1) and ink (#0f172a) instead of the old #0d50cd / #000.
    const bubble = received ? 'background:#095dd1;color:#fff;' : 'background:#fff;color:#0f172a;';
    const linkColor = received ? '#ffffff' : '#095dd1';

    const base = doc.createElement('base');
    base.setAttribute('target', '_blank');
    base.setAttribute('rel', 'noopener noreferrer');

    const style = doc.createElement('style');
    style.textContent =
      `html,body{margin:0;padding:0;}` +
      `body{padding:10px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;${bubble}}` +
      `body a{color:${linkColor};}` +
      `p{margin:.4rem 0;}` +
      `img{max-width:100%;height:auto;}` +
      `.gmail_quote{display:none !important;}`;

    const head = doc.head || doc.documentElement;
    head.insertBefore(style, head.firstChild);
    head.insertBefore(base, head.firstChild);

    return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  }

  /** Auto-size the message iframe to exactly fit its content once loaded, and only
   *  report ready after the height has settled (so the parent holds the loader
   *  until every message has taken its full height — no reveal-then-grow jump). */
  onFrameLoad(event: Event): void {
    const iframe = event.target as HTMLIFrameElement;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc?.body) { this.markReady(); return; }
      const apply = () => {
        // Use body.scrollHeight (the real content height). documentElement.scrollHeight
        // is clamped to the iframe's current rendered height (~150px default), so it
        // over-reports for short content and leaves empty space below.
        const h = doc.body.scrollHeight;
        if (h) iframe.style.height = `${h}px`;
      };
      apply();
      // Keep the height in sync as the content reflows (images/fonts finishing,
      // late layout) — even after reveal, so a frame never ends up clipped/short.
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => apply());
        this.resizeObserver.observe(doc.body);
      }
      // Report ready only after a frame has settled with its final height.
      requestAnimationFrame(() => {
        apply();
        this.markReady();
      });
    } catch {
      /* cross-origin (shouldn't happen with srcdoc + allow-same-origin) */
      this.markReady();
    }
  }

  /** Tell the parent this message is fully sized (once). */
  private markReady(): void {
    if (this.reported) return;
    this.reported = true;
    this.frameReady.emit();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
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
