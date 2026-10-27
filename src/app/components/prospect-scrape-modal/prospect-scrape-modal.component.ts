import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { errorText } from '../../helpers/kx-dialogs';
import {
  IProspectScrapeOverview,
  IProspectScrapeStartResult,
  IProspectScrapeState,
  ProspectingService,
  ProspectScrapeType,
} from '../../services/prospecting.service';

/** One research type as a row of the popup. */
interface ScrapeRow {
  type: ProspectScrapeType;
  title: string;
  state: IProspectScrapeState;
  /** Why it can't be ticked, in plain words; null when it can. */
  blocked: string | null;
  checked: boolean;
}

const TITLES: Record<ProspectScrapeType, string> = {
  web: 'Website',
  location: 'Location',
  linkedin: 'LinkedIn',
  sports: 'Sports',
};

const UNAVAILABLE: Record<string, string> = {
  no_website: 'No website on this contact',
  no_location: 'No city / state on this contact',
  no_linkedin: 'No LinkedIn profile or company page',
  no_sports_city: 'Not in a city with a pro team',
};

/**
 * "Scrape Prospect" (Manage Contacts; KexyApi `src/prospect-scrape/`): for each selected
 * contact, what research KEXY holds (website, location, LinkedIn, sports) and when it was
 * scraped, with a tick box per type to scrape it again now. Opened only after the KEXY master
 * password was accepted; that password is passed in and sent again with Start (the server
 * checks it on every call). Closes with the start result; Cancel / × / Esc dismiss.
 * windowClass `kx-dialog-modal kx-prospect-scrape-modal` (frame and width in styles.scss).
 */
@Component({
  selector: 'prospect-scrape-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prospect-scrape-modal.component.html',
  styleUrl: './prospect-scrape-modal.component.scss',
})
export class ProspectScrapeModalComponent implements OnInit {
  @Input() overview!: IProspectScrapeOverview;
  @Input() companyId!: number;
  @Input() masterPassword = '';

  contacts: { contactId: number; email: string; name: string | null; rows: ScrapeRow[] }[] = [];
  starting = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private prospectingService: ProspectingService,
  ) {}

  ngOnInit(): void {
    this.contacts = this.overview.contacts.map((c) => ({
      contactId: c.contactId,
      email: c.email,
      name: c.name,
      rows: (Object.keys(TITLES) as ProspectScrapeType[]).map((type) => {
        const state = c.scrapes[type];
        return { type, title: TITLES[type], state, blocked: this.__blocked(type, state), checked: false };
      }),
    }));
  }

  get tickedCount(): number {
    return this.contacts.reduce((n, c) => n + c.rows.filter((r) => r.checked).length, 0);
  }

  /** Ticks (or clears) one type for every contact that has it. */
  tickAll(type: ProspectScrapeType, checked: boolean): void {
    for (const c of this.contacts) {
      const row = c.rows.find((r) => r.type === type);
      if (row && !row.blocked) row.checked = checked;
    }
  }

  allTicked(type: ProspectScrapeType): boolean {
    const rows = this.contacts.map((c) => c.rows.find((r) => r.type === type)!).filter((r) => !r.blocked);
    return rows.length > 0 && rows.every((r) => r.checked);
  }

  canTickAll(type: ProspectScrapeType): boolean {
    return this.contacts.some((c) => c.rows.some((r) => r.type === type && !r.blocked));
  }

  async start(): Promise<void> {
    if (!this.tickedCount || this.starting) return;
    this.starting = true;
    this.error = '';
    try {
      const result: IProspectScrapeStartResult = await this.prospectingService.prospectScrapeStart({
        companyId: this.companyId,
        masterPassword: this.masterPassword,
        items: this.contacts
          .map((c) => ({ contactId: c.contactId, types: c.rows.filter((r) => r.checked).map((r) => r.type) }))
          .filter((i) => i.types.length),
      });
      this.activeModal.close(result);
    } catch (e) {
      this.error = errorText(e);
      this.starting = false;
    }
  }

  /** "Scraped 3 days ago" / "Never scraped" / "Running now". */
  when(state: IProspectScrapeState): string {
    if (!state.available) return '';
    if (state.running) return 'Running now';
    if (!state.lastScrapedAt) return 'Never scraped';
    const ms = Date.now() - new Date(state.lastScrapedAt).getTime();
    const minutes = Math.max(0, Math.round(ms / 60_000));
    if (minutes < 1) return 'Scraped just now';
    if (minutes < 60) return `Scraped ${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Scraped ${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `Scraped ${days} day${days === 1 ? '' : 's'} ago`;
  }

  private __blocked(type: ProspectScrapeType, state: IProspectScrapeState): string | null {
    if ('reason' in state) return UNAVAILABLE[state.reason] ?? 'Nothing to scrape';
    if (type === 'sports' && !this.overview.sportsEnabled) return 'The sports scraper is switched off';
    if (state.running) return 'Being scraped right now';
    return null;
  }
}
