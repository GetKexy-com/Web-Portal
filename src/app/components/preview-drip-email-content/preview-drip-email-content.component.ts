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
    console.log(this.dripEmail['emailContent']);
    this.spinEmail();
  }

  spinEmail() {
    this.emailSubject = this.expandSpintax(this.dripEmail['emailSubject']);

    const formatted = this.__formatEmailContent(this.dripEmail['aiRawData']);
    let newStr = formatted.split('$$');
    this.emailContent = this.expandAndWrapSpintax(newStr[1]);
  }

  __formatEmailContent: (content: string) => string = (content: string): string => {
    let paraArray = content.split('[[[PARA]]]');

    const lastPara = paraArray.pop()
      .replace(/^\n/, "")
      .replace(/\n/g, "<br>");

    paraArray = paraArray.map((para) => {
      return para.replace(/\n/g, "");
    });

    paraArray.push(lastPara);
    return paraArray.join('<p>');
  };

  expandAndWrapSpintax(text: string) {
    // Step 1: Wrap top-level { ... } blocks in <p>...</p> if not already inside one
    text = this.wrapTopLevelSpintax(text);

    // Step 2: Expand all spintax recursively
    text = this.expandSpintax(text);

    // Step 3: Format phone numbers (US)
    text = this.formatUSPhoneNumbers(text);

    // Step 4: Hyperlink URLs
    text = this.linkifyUrls(text);
    return text;

  }

  wrapTopLevelSpintax(text: string) {
    let result = '';
    let depth = 0;
    let start = -1;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '{') {
        if (depth === 0) start = i; // mark potential top-level start
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          // Found a top-level {...} block
          const spintax = text.slice(start, i + 1);

          // Check if it's already inside a <p>...</p>
          const before = text.slice(0, start);
          const after = text.slice(i + 1);

          const lastOpenP = before.lastIndexOf('<p>');
          const lastCloseP = before.lastIndexOf('</p>');

          const insideParagraph = lastOpenP > lastCloseP;

          // Append with or without wrapping
          if (!insideParagraph) {
            result += before + `<p>${spintax}</p>`;
          } else {
            result += before + spintax;
          }

          text = after;
          i = -1; // reset loop to process the remainder
          start = -1;
        }
      }
    }

    return result + text;
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
