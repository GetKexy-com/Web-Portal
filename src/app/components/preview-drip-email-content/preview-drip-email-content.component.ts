import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveOffcanvas, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { DripEmail } from '../../models/DripEmail';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';

@Component({
  selector: 'app-preview-drip-email-content',
  imports: [
    FormsModule,
    KexyButtonComponent,
  ],
  templateUrl: './preview-drip-email-content.component.html',
  styleUrl: './preview-drip-email-content.component.scss',
})
export class PreviewDripEmailContentComponent implements OnInit {
  public dripEmail: DripEmail;
  public emailContent: string;
  public emailSubject: string;

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
    this.emailSubject = this.__expandSpintax(this.dripEmail['emailSubject']);
    this.emailContent = this.__formatEmailContent(this.dripEmail['aiRawData']);
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
    text = this.formatUSPhoneNumbers(text);

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
