import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveOffcanvas, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { DripEmail } from '../../models/DripEmail';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { EMAIL_FRAME_IMAGE_CSS } from '../email-send-progress/email-send-progress.component';
import { AuthService } from '../../services/auth.service';
import { formatUSPhoneNumbers, inboxHtmlOptions, toInboxHtml } from '../../helpers/inbox-html';
import { emailHasContent } from '../../helpers/email-has-content';

@Component({
  selector: 'app-preview-drip-email-content',
  imports: [
    FormsModule,
    KexyButtonComponent,
    DatePipe,
    NgbTooltip,
  ],
  templateUrl: './preview-drip-email-content.component.html',
  styleUrl: './preview-drip-email-content.component.scss',
})
export class PreviewDripEmailContentComponent implements OnInit, AfterViewInit {
  @ViewChild('previewFrame') previewFrameRef!: ElementRef<HTMLIFrameElement>;

  public dripEmail: DripEmail;
  public emailContent: string;
  public emailSubject: string;

  // Inbox-style header (sender = the logged-in brand/user; recipient = "me").
  public senderName: string;
  public senderEmail: string;
  public senderInitials: string;
  public avatarColor: string;
  public sentDate: Date = new Date();

  /** No body to show: the template shows "This email has no content yet" instead of the iframe. */
  public isEmpty = false;

  private viewReady = false;
  // True when emailContent is already a full <html> document (the editor's
  // getHtml() export) — such content must NOT be re-wrapped in the shell.
  private isFullDocument = false;
  // How KexyApi sends this email (`inboxHtmlOptions`): Plain Text unless it is a Template
  // email styled HTML (an AI-written one is always Plain Text), and user-written = Template.
  private inboxOptions = { plainText: true, userWritten: false };

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private dripCampaignService: DripCampaignService,
    private authService: AuthService,
  ) {
  }

  ngOnInit(): void {
    this.dripEmail = this.dripCampaignService.getEditEmail();
    this.inboxOptions = inboxHtmlOptions({
      emailStyle: this.dripEmail['emailStyle'],
      templateOptions: this.dripEmail['templateOptions'],
    });
    this.__initSenderInfo();
    this.spinEmail();
  }

  /** Build the "From" identity shown in the inbox header from the logged-in user. */
  private __initSenderInfo(): void {
    const user: any = this.authService.userTokenValue || {};
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    this.senderName = (user.supplier_name || fullName || 'Your Brand').trim();
    this.senderEmail = user.email || 'no-reply@getkexy.com';
    this.senderInitials = this.__initialsFrom(this.senderName);
    this.avatarColor = this.__colorFor(this.senderName);
  }

  private __initialsFrom(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** Deterministic avatar color from the name (Gmail-like tinted circle). */
  private __colorFor(seed: string): string {
    const palette = ['#0047cc', '#d93025', '#2847cc', '#e37400', '#9334e6', '#0047cc', '#a142f4'];
    let hash = 0;
    for (let i = 0; i < (seed || '').length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    // The iframe only exists after the view is initialized, so push the
    // first spun version now (ngOnInit runs before the ViewChild is bound).
    this.__renderPreview();
  }

  spinEmail() {
    this.emailSubject = this.__expandSpintax(this.dripEmail['emailSubject'] || '');

    // Prefer the SAVED editor content — what the recipient actually gets — and
    // expand spintax on top of it. `emailContent` (getHtml) is the fully
    // rendered email-shell document: styles inlined and media blocks
    // transformed to centered, email-safe tables — so it renders correctly in
    // a bare iframe. `rawEditorContent` (getRawHtml) is only the re-editable
    // fragment whose raw `.media-block` divs need the editor's own CSS to
    // center/lay out, so it's a fallback. Raw AI text is the last resort.
    //
    // A blank body — from either source — shows the empty state instead of a white pane.
    // An AI draft can be the subject alone (`^^subject$$` with nothing after), and with
    // neither source the AI fallback used to throw on `undefined.split`.
    const editorContent = this.dripEmail['emailContent'] || this.dripEmail['rawEditorContent'];
    const aiRawData = this.dripEmail['aiRawData'];
    if (editorContent) {
      this.emailContent = this.__expandSpintax(editorContent);
      this.isFullDocument = this.__looksLikeFullDocument(editorContent);
    } else {
      this.emailContent = aiRawData ? this.__formatEmailContent(aiRawData) : '';
      this.isFullDocument = false;
    }
    // Phone numbers are formatted by the send for every email, Template included.
    this.emailContent = formatUSPhoneNumbers(this.emailContent);
    this.isEmpty = !emailHasContent(this.emailContent);

    this.__renderPreview();
  }

  private __looksLikeFullDocument(html: string): boolean {
    return /<!doctype\b/i.test(html) || /<html[\s>]/i.test(html);
  }

  /**
   * Render the spun email into the preview <iframe>, wrapped in the same
   * table-based email shell the kexy-custom-rich-editor uses for its preview
   * mode (see editor-canvas.component.ts#generateEmailHtml). `<base
   * target="_blank">` forces links to open in a new tab rather than trying to
   * navigate the framed page (most sites refuse to be framed).
   */
  private __renderPreview(): void {
    if (!this.viewReady) return;
    const iframe = this.previewFrameRef?.nativeElement;
    if (!iframe) return;
    // The body goes through the same steps KexyApi runs on the way out (`toInboxHtml`), so
    // this shows what the inbox gets: a Plain Text email as a typed message, no editor padding.
    const sent = toInboxHtml(this.emailContent, this.inboxOptions);
    if (this.inboxOptions.plainText) {
      iframe.srcdoc = this.__buildInboxPreviewHtml(this.emailSubject, sent);
      return;
    }
    // HTML style (designed): a full email-shell document (getHtml) is rendered as-is (just
    // add the preview <base target>); a fragment (rawEditorContent) gets wrapped in the shell.
    iframe.srcdoc = this.isFullDocument
      ? this.__withPreviewLinkTarget(sent)
      : this.__buildPreviewHtml(this.emailSubject, sent);
  }

  /**
   * A Plain Text email as an inbox shows it: the typed message on the mail app's own default
   * text (Gmail's: Arial, "small", #222) — an AI-written email sets no font, so this is what a
   * prospect sees; a Template email's own styles override it. The side gutter lines the body
   * up with the subject row above, as a mail app's reading pane does; it is not the email's.
   */
  private __buildInboxPreviewHtml(subject: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <base target="_blank" rel="noopener noreferrer" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.__escapeHtml(subject || 'Email')}</title>
  <style>${EMAIL_FRAME_IMAGE_CSS}</style>
</head>
<body style="margin:0; padding:16px 28px; background:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:small; color:#222222;">
${(body || '').trim() || '<p>&nbsp;</p>'}
</body>
</html>`;
  }

  /**
   * Inject `<base target="_blank">` so links open in a new tab, not in-frame, plus the
   * image rule below — a full document can still carry a CKEditor image whose width and
   * height attributes are the file's intrinsic pixels.
   */
  private __withPreviewLinkTarget(html: string): string {
    const base = `<base target="_blank" rel="noopener noreferrer" /><style>${EMAIL_FRAME_IMAGE_CSS}</style>`;
    return /<head[\s>]/i.test(html)
      ? html.replace(/<head([\s>])/i, `<head$1\n  ${base}`)
      : `${base}${html}`;
  }

  private __buildPreviewHtml(subject: string, body: string): string {
    const safeBody = (body || '').trim() || '<p>&nbsp;</p>';
    const head = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <base target="_blank" rel="noopener noreferrer" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.__escapeHtml(subject || 'Email')}</title>
  <!-- Without this an image carrying its intrinsic size in width/height (anything
       written in the old CKEditor) renders thousands of px wide and tears the 600px
       shell apart — the same rule KexyApi applies to the email itself on the way out,
       so this preview matches the prospect's inbox. -->
  <style>${EMAIL_FRAME_IMAGE_CSS}</style>
</head>`;

    return `${head}
<body style="margin:0; padding:0; background:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse; background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:12px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:600px; border-collapse:collapse; background:#ffffff; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
          <tr>
            <td style="padding:24px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#1f2937;">
              ${safeBody}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private __escapeHtml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private __formatEmailContent: (content: string) => string = (content: string): string => {
    let paraArray = content.split('[[[PARA]]]');

    const lastPara = paraArray.pop()
      .replace(/^\n/, "")
      .replace(/\n/g, "<br>");

    paraArray = paraArray.map((para) => {
      return para.replace(/\n/g, "");
    });

    paraArray.push(lastPara);
    // The text after the `$$` marker; the whole paragraph if there is none (not "undefined").
    paraArray[0] = paraArray[0].split('$$')[1] ?? paraArray[0];
    paraArray = paraArray.map(p => `<p>${this.__expandAndWrapSpintax(p)}</p>`);
    return paraArray.join('');
  };

  private __expandAndWrapSpintax(text: string) {
    // Step 1: Expand all spintax recursively
    text = this.__expandSpintax(text);


    // Step 2: Hyperlink URLs (phone numbers are formatted over the whole email in spinEmail)
    text = this.__linkifyUrls(text);
    return text;

  }


  private __expandSpintax(text: string): string {
    const regex = /\{([^{}]*)\}/;

    while (regex.test(text)) {
      text = text.replace(regex, (_, group) => {
        const options = group.split('|');
        const randomChoice = options[Math.floor(Math.random() * options.length)];
        return this.__expandSpintax(randomChoice); // recursive
      });
    }

    return text;
  }


  private __linkifyUrls(text: string): string {
    const urlRegex = /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)\b/g;

    // Split the text by existing anchor tags to avoid double-linking
    const parts = text.split(/(<a\b[^>]*>.*?<\/a>)/g);

    return parts.map(part => {
      // If this part is already an anchor tag, return it as-is
      if (part.startsWith('<a ') && part.endsWith('</a>')) {
        return part;
      }

      // Otherwise, process this part for URLs
      return part.replace(urlRegex, (url) => {
        const href = url.startsWith('http') ? url : `https://${url}`;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      });
    }).join('');
  }


}
