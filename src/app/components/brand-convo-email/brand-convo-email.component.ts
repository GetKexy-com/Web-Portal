import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule, DatePipe, formatDate } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BrandConvoAvatarComponent } from '../brand-convo-avatar/brand-convo-avatar.component';

/** Elements that need the full bubble width — anything else is plain text and gets
 *  a bubble sized to its content. */
const RICH_CONTENT = 'table, img, video, picture, svg, iframe, pre';

/** Space between the bubble and the side bits (matches `.msg-side` offset in the SCSS). */
const SIDE_GAP_PX = 8;
/** Breathing room kept between the side bits and the thread's edge. */
const SIDE_MARGIN_PX = 8;

@Component({
  selector: 'brand-convo-email',
  imports: [
    DatePipe,
    CommonModule,
    FormsModule,
    BrandConvoAvatarComponent,
  ],
  templateUrl: './brand-convo-email.component.html',
  styleUrl: './brand-convo-email.component.scss',
})
export class BrandConvoEmailComponent implements OnInit, OnDestroy {
  @Input() email: any;
  @Input() forwardToCampaignUser;
  @Input() isLoading;
  /** The message above this one in the thread (null for the first) — for the day
   *  divider and for grouping a run from the same sender. */
  @Input() previous: any = null;
  /** The prospect, for the avatar and name on received messages. */
  @Input() contactName = '';
  @Input() contactInitials = '';
  @Input() contactSeed = '';
  /** The conversation's subject — the forward goes out as "RE: <subject>". */
  @Input() subject = '';
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

  // ── Derived once in ngOnInit ────────────────────────────────────────────
  received = false;
  /** Same sender, same day, within a few minutes of the message above — no avatar,
   *  name or time repeat; the header's time covers the run. */
  grouped = false;
  showDay = false;
  dayLabel = '';
  senderLabel = '';
  /** The hover tooltip: "10:43 PM" in bold, then "Sun, Jun 21" (year only if not this year). */
  whenTime = '';
  whenDate = '';
  /** "Sun, Jun 21, 2026, 10:43 PM" — the tooltip's own title, for the full stamp. */
  whenFull = '';
  /** Plain text: the bubble is sized to the text instead of the full measure. */
  compact = false;

  constructor(
    private _authService: AuthService,
    private modal: NgbModal,
    private sanitizer: DomSanitizer,
  ) {
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.received = this.conversationPosition();
    this.senderLabel = this.received ? this.contactName || this.email.senderEmail : 'You';

    const day = this.__dayKey(this.email.messageSentAt);
    const prev = this.previous;
    this.showDay = !prev || this.__dayKey(prev.messageSentAt) !== day;
    this.dayLabel = this.showDay ? this.__dayLabel(this.email.messageSentAt) : '';
    const sentAt = new Date(this.email.messageSentAt);
    if (!isNaN(sentAt.getTime())) {
      const thisYear = sentAt.getFullYear() === new Date().getFullYear();
      this.whenTime = formatDate(sentAt, 'h:mm a', 'en-US');
      this.whenDate = formatDate(sentAt, thisYear ? 'EEE, MMM d' : 'MMM d, y', 'en-US');
      this.whenFull = formatDate(sentAt, 'EEE, MMM d, y, h:mm a', 'en-US');
    }
    this.grouped = BrandConvoEmailComponent.continues(prev, this.email);
    // No delivery/read status: `messageStatus` flips to "opened" when WE open the
    // conversation (KexyApi messages.update), so it says nothing about the prospect.
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
   * most sites' X-Frame-Options) and the text styling the app CSS can no longer
   * reach inside the isolated frame. The body is transparent: the bubble colour is
   * painted by the component SCSS behind the frame, so there's one place for it.
   * Works for full documents and fragments alike (DOMParser wraps a fragment in
   * html/body).
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

    // Plain text gets a bubble sized to it (see onFrameLoad); anything with layout of
    // its own keeps the full measure.
    this.compact = !doc.body?.querySelector(RICH_CONTENT);

    // Our own (sent) HTML comes from the email editor, which bakes an inline white
    // background into paragraphs, spans and cells. On the tinted sent bubble those
    // read as white patches behind the text, so clear exactly-white backgrounds —
    // any other colour was chosen on purpose and stays. Received replies are left
    // alone: they sit on a white bubble anyway.
    if (!received) {
      const isWhite = (v: string | null) =>
        !!v && /^\s*(#fff|#ffffff|white|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(,\s*1(\.0+)?\s*)?\))\s*$/i.test(v);
      doc.body?.querySelectorAll<HTMLElement>('*').forEach((el) => {
        // Covers `background:#fff` shorthand too (it sets backgroundColor), without
        // touching a background image.
        if (isWhite(el.style.backgroundColor)) el.style.backgroundColor = 'transparent';
        if (isWhite(el.getAttribute('bgcolor'))) el.removeAttribute('bgcolor');
      });
    }

    const base = doc.createElement('base');
    base.setAttribute('target', '_blank');
    base.setAttribute('rel', 'noopener noreferrer');

    // ── Flatten OUR email shell (sent messages only) ──────────────────────────
    // The editor's getHtml() export wraps the body in a 100%-wide grey "page" table
    // holding a centred 600px white card (see editor-canvas.generateEmailHtml).
    // Inside a chat bubble that shell is redundant — the bubble already IS the card
    // — and it rendered as a thick grey band with the message floating in the
    // middle, which is why only SOME messages looked over-padded: plain fragments
    // have no shell. Keyed on the shell's own width attributes, and applied only to
    // SENT messages: a received reply is arbitrary third-party HTML, and its own
    // card already sits on a white bubble.
    const shellReset = received
      ? ''
      : `body>table[width="100%"]{background:transparent !important;width:100% !important;}` +
        `body>table[width="100%"]>tbody>tr>td{padding:0 !important;background:transparent !important;}` +
        `body table[width="600"]{width:100% !important;max-width:100% !important;background:transparent !important;}` +
        `body table[width="600"]>tbody>tr>td{padding:0 !important;}`;

    const style = doc.createElement('style');
    style.textContent =
      `html,body{margin:0 !important;}` +
      // `!important` on background/padding is REQUIRED: a full email-shell document
      // (the editor's getHtml export) carries its own INLINE
      // `<body style="background:#f3f4f6;padding:0">`, and an inline style beats a
      // stylesheet — so without it the bubble showed the shell's grey page and threw
      // away the padding below. `color` deliberately stays non-important so an
      // email's own text colours still apply.
      `body{padding:10px 14px !important;background:transparent !important;color:#0f172a;` +
      `font-family:Lato,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;` +
      `font-size:13.5px;line-height:1.55;overflow-wrap:anywhere;}` +
      // Plain text: the body shrink-wraps its text so onFrameLoad can size the
      // bubble to it.
      (this.compact ? `body{display:inline-block;}` : '') +
      `body a{color:#095dd1;}` +
      `p{margin:.35rem 0;}` +
      `body>:first-child{margin-top:0 !important;}` +
      `body>:last-child{margin-bottom:0 !important;}` +
      `img{max-width:100%;height:auto;}` +
      shellReset +
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
      const wrap = iframe.closest('.msg-bubble-wrap');
      const apply = () => {
        // Plain text: the body is inline-block (see prepareFrameHtml), so its width is
        // the text's own, capped by the full-width frame it was first laid out in.
        // Size the frame to it and let the bubble shrink around it.
        if (this.compact) {
          const w = Math.ceil(doc.body.getBoundingClientRect().width);
          if (w) {
            iframe.style.width = `${w}px`;
            wrap?.classList.add('is-sized');
          }
        }
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

  /**
   * The forward button + time sit beside the bubble, vertically centred. Beside a wide
   * email the gap can be narrow, so on each hover measure and take the first layout
   * that fits: one row, then stacked (`is-stacked`), then — no room at all — overlaid
   * on the bubble's inner edge (`is-inside`), still centred. Never past the thread
   * (that used to make it scroll sideways). Plain DOM, no change detection: it only
   * toggles classes.
   */
  placeSide = (event: MouseEvent): void => {
    const row = event.currentTarget as HTMLElement;
    const side = row.querySelector<HTMLElement>('.msg-side');
    const wrap = row.querySelector<HTMLElement>('.msg-bubble-wrap');
    const pane = row.closest<HTMLElement>('.pane-thread');
    if (!side || !wrap || !pane) return;
    const w = wrap.getBoundingClientRect();
    const p = pane.getBoundingClientRect();
    const room = (this.received ? p.right - w.right : w.left - p.left) - SIDE_GAP_PX - SIDE_MARGIN_PX;

    side.classList.remove('is-inside', 'is-stacked');
    if (side.offsetWidth <= room) return;
    side.classList.add('is-stacked');
    if (side.offsetWidth <= room) return;
    side.classList.remove('is-stacked');
    side.classList.add('is-inside');
  };

  /** How close two messages from one sender must be to share a name/time header. */
  private static readonly GROUP_WINDOW_MS = 10 * 60 * 1000;

  /** Does `b` continue `a`'s run — same sender, same day, within the window? */
  static continues(a: any, b: any): boolean {
    if (!a || !b || a.senderEmail !== b.senderEmail) return false;
    const ta = new Date(a.messageSentAt);
    const tb = new Date(b.messageSentAt);
    if (isNaN(ta.getTime()) || isNaN(tb.getTime()) || ta.toDateString() !== tb.toDateString()) return false;
    return Math.abs(tb.getTime() - ta.getTime()) <= BrandConvoEmailComponent.GROUP_WINDOW_MS;
  }

  /** Local calendar day, for comparing two messages. */
  private __dayKey(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  /** "Today", "Yesterday", "Mon, Jun 22" — the year only when it isn't this one. */
  private __dayLabel(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const key = this.__dayKey(iso);
    if (key === this.__dayKey(today.toISOString())) return 'Today';
    if (key === this.__dayKey(yesterday.toISOString())) return 'Yesterday';
    const format = d.getFullYear() === today.getFullYear() ? 'EEE, MMM d' : 'EEE, MMM d, y';
    return formatDate(d, format, 'en-US');
  }

  conversationPosition = () => {
    return this.email.senderEmail !== this.userData.email;
  };

  modalRef;
  /** The reply as plain text, without the quoted thread — shown in the forward modal. */
  replyPreview = '';

  handleClickSentToUser = (modalContent) => {
    this.submitted = false;
    this.isValidEmail = false;
    this.replyPreview = this.__replyText(this.email.messageContent);
    // Same rounded shell as the compose modal, narrower (styles.scss).
    this.modalRef = this.modal.open(modalContent, { windowClass: 'kx-forward-modal', centered: true });
  };

  /** Plain text of the reply itself — quoted history (gmail_quote/blockquote) dropped,
   *  same cut as the page's `extractUserReply` makes for what is actually sent. */
  private __replyText(html: string): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('.gmail_quote, blockquote, style, script').forEach((n) => n.remove());
    // A parsed (never rendered) document has no layout, so textContent runs lines
    // together — put the breaks back for <br> and block elements.
    doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    doc.querySelectorAll('p, div, li, tr, h1, h2, h3, h4, h5, h6').forEach((el) => el.append('\n'));
    return (doc.body?.textContent || '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  sendEmail = async () => {
    this.submitted = true;
    this.emailAddress = (this.emailAddress || '').trim();
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    this.isValidEmail = emailPattern.test(this.emailAddress);
    if (!this.isValidEmail || !this.emailAddress) return;

    localStorage.setItem('forwardEmail', this.emailAddress);

    this.isValidEmail = true;
    await this.forwardToCampaignUser(this.email);
    this.modalRef.close();
  };
}
