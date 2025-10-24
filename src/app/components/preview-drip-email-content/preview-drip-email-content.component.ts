import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveOffcanvas, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { DripEmail } from '../../models/DripEmail';
import { BrandConvoAvatarComponent } from '../brand-convo-avatar/brand-convo-avatar.component';
import { NgIf } from '@angular/common';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';

@Component({
  selector: 'app-preview-drip-email-content',
  imports: [
    FormsModule,
    BrandConvoAvatarComponent,
    NgIf,
    KexyButtonComponent,
  ],
  templateUrl: './preview-drip-email-content.component.html',
  styleUrl: './preview-drip-email-content.component.scss',
})
export class PreviewDripEmailContentComponent implements OnInit {
  public dripEmail: DripEmail;
  public emailContent;
  public emailSubject;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private dripCampaignService: DripCampaignService,
  ) {
  }

  ngOnInit(): void {
    this.dripEmail = this.dripCampaignService.getEditEmail();
    this.spinEmail();
  }

  spinEmail() {
    this.emailContent = this.parseSpintax(this.wrapSpintaxInParagraphs(this.dripEmail['emailContent']));
    this.emailSubject = this.parseSpintax(this.dripEmail['emailSubject']);
  }

  private parseSpintax(text: string): string {
    // Step 1: Ensure every spintax block is wrapped in <p> tags if not already
    // text = this.wrapSpintaxInParagraphs(text);

    // Step 2: Expand spintax recursively
    text = this.expandSpintax(text);

    // Step 3: Format phone numbers (US)
    text = this.formatUSPhoneNumbers(text);

    // Step 4: Hyperlink URLs
    text = this.linkifyUrls(text);
    return text;
  }

  private wrapSpintaxInParagraphs(text: string): string {
    // Matches spintax not already inside <p>...</p>
    const spintaxRegex = /(?<!<p[^>]*>)\s*\{[^{}]+\}\s*(?![^<]*<\/p>)/g;

    return text.replace(spintaxRegex, (match) => {
      return `<p>${match.trim()}</p>`;
    });
  }

  private expandSpintax(text: string): string {
    const regex = /\{([^{}]*)\}/;

    while (regex.test(text)) {
      text = text.replace(regex, (_, group) => {
        const options = group.split('|');
        const randomChoice = options[Math.floor(Math.random() * options.length)];
        return this.expandSpintax(randomChoice); // recursive
      });
    }

    return text;
  }

  private formatUSPhoneNumbers(text: string): string {
    // Match various US-like number patterns
    const phoneRegex = /\+?\d[\d\s().-]{9,}\d/g;

    return text.replace(phoneRegex, (match) => {
      // Remove everything except digits
      let digits = match.replace(/\D/g, '');

      // Handle leading plus signs safely
      const hasPlus = match.trim().startsWith('+');

      // Remove redundant + or country code patterns
      if (digits.startsWith('1') && digits.length === 11) {
        digits = digits.slice(1);
      }

      // Only format if 10 digits
      if (digits.length === 10) {
        const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        return hasPlus ? `+1 ${formatted}` : `+1 ${formatted}`;
      }

      // Not a valid 10-digit US number → return unchanged
      return match;
    });
  }


  private linkifyUrls(text: string): string {
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
