import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveOffcanvas, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { DripEmail } from '../../models/DripEmail';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { PageUiService } from '../../services/page-ui.service';

@Component({
  selector: 'app-preview-drip-email-content',
  imports: [
    FormsModule,
    KexyButtonComponent,
  ],
  templateUrl: './preview-drip-email-content.component.html',
  styleUrl: './preview-drip-email-content.component.scss',
})
export class PreviewDripEmailContentComponent implements OnInit, AfterViewInit {
  @ViewChild('previewFrame') previewFrameRef!: ElementRef<HTMLIFrameElement>;

  public dripEmail: DripEmail;
  public emailContent: string;
  public emailSubject: string;

  private viewReady = false;
  // True when emailContent is already a full <html> document (the editor's
  // getHtml() export) — such content must NOT be re-wrapped in the shell.
  private isFullDocument = false;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private pageUiService: PageUiService,
    private dripCampaignService: DripCampaignService,
  ) {
  }

  ngOnInit(): void {
    this.dripEmail = this.dripCampaignService.getEditEmail();
    this.spinEmail();
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
    const editorContent = this.dripEmail['emailContent'] || this.dripEmail['rawEditorContent'];
    if (editorContent) {
      this.emailContent = this.__expandSpintax(editorContent);
      this.isFullDocument = this.__looksLikeFullDocument(editorContent);
    } else {
      this.emailContent = this.__formatEmailContent(this.dripEmail['aiRawData']);
      this.isFullDocument = false;
    }

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
    // A full email-shell document (getHtml) is rendered as-is (just add the
    // preview <base target>); a fragment (rawEditorContent / aiRawData) gets
    // wrapped in the shell.
    iframe.srcdoc = this.isFullDocument
      ? this.__withPreviewLinkTarget(this.emailContent)
      : this.__buildPreviewHtml(this.emailSubject, this.emailContent);
  }

  /** Inject `<base target="_blank">` so links open in a new tab, not in-frame. */
  private __withPreviewLinkTarget(html: string): string {
    const base = '<base target="_blank" rel="noopener noreferrer" />';
    return /<head[\s>]/i.test(html)
      ? html.replace(/<head([\s>])/i, `<head$1\n  ${base}`)
      : `${base}${html}`;
  }

  private __buildPreviewHtml(subject: string, body: string): string {
    const safeBody = (body || '').trim() || '<p>&nbsp;</p>';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <base target="_blank" rel="noopener noreferrer" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.__escapeHtml(subject || 'Email')}</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse; background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
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
    paraArray[0] = paraArray[0].split('$$')[1];
    paraArray = paraArray.map(p => `<p>${this.__expandAndWrapSpintax(p)}</p>`);
    return paraArray.join('');
  };

  private __expandAndWrapSpintax(text: string) {
    // Step 1: Expand all spintax recursively
    text = this.__expandSpintax(text);

    // Step 2: Format phone numbers (US)
    text = this.pageUiService.formatUSPhoneNumbers(text);

    // Step 3: Hyperlink URLs
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
