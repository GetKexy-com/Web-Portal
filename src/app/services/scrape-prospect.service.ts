import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ProspectScrapeModalComponent } from '../components/prospect-scrape-modal/prospect-scrape-modal.component';
import { errorText, kxForm, kxNotice } from '../helpers/kx-dialogs';
import {
  IProspectScrapeOverview,
  IProspectScrapeStartResult,
  ProspectingService,
} from './prospecting.service';

/**
 * "Scrape Prospect" (KexyApi `src/prospect-scrape/`), shared by Manage Contacts and a list's
 * Contacts page: see what research KEXY holds for selected contacts (website, location,
 * LinkedIn, sports) and scrape any of it again now. Every scrape is PAID, so:
 * - the button is hidden (owner's call, 2026-10-28) until the page headline is clicked 5 times
 *   within 3 seconds (`onTitleClick`); "Hide" puts it away. Remembered in this browser per
 *   account (the key carries the user id), and shared by both pages;
 * - the real lock is the KEXY master password (not the account's), which KexyApi checks
 *   before showing anything and again before scraping.
 * A root singleton, so both pages read the same `shown`. Each page calls `load` on init.
 */
@Injectable({ providedIn: 'root' })
export class ScrapeProspectService {
  /** At most this many contacts per click (KexyApi `PROSPECT_SCRAPE_MAX_CONTACTS`). */
  readonly maxContacts = 10;
  shown = false;
  /** The password popup or the overview request is open. */
  opening = false;

  private userId: number | string = 'anon';
  private titleClicks: number[] = [];

  constructor(
    private prospectingService: ProspectingService,
    private modal: NgbModal,
  ) {}

  /** Reads this account's setting (another login in the same browser has its own). */
  load(userId: number | string | null | undefined): void {
    this.userId = userId ?? 'anon';
    try {
      this.shown = localStorage.getItem(this.__key()) === '1';
    } catch {
      this.shown = false;
    }
  }

  /** Five clicks on the page headline within 3 seconds shows the button. */
  onTitleClick(): void {
    const now = Date.now();
    this.titleClicks = [...this.titleClicks.filter((t) => now - t < 3000), now];
    if (this.titleClicks.length >= 5 && !this.shown) {
      this.titleClicks = [];
      this.setShown(true);
    }
  }

  setShown(shown: boolean): void {
    this.shown = shown;
    try {
      if (shown) localStorage.setItem(this.__key(), '1');
      else localStorage.removeItem(this.__key());
    } catch {
      // Storage blocked (private window): shown until the page is left, which is fine.
    }
  }

  /** Master password, then the popup for these contacts, then a summary of what started. */
  async open(contactIds: number[], companyId: number): Promise<void> {
    if (!contactIds.length || this.opening) return;
    if (contactIds.length > this.maxContacts) {
      await kxNotice({
        title: 'Too many contacts',
        text: `Pick up to ${this.maxContacts} contacts at a time.`,
        icon: 'fa-search',
      });
      return;
    }

    this.opening = true;
    let overview: IProspectScrapeOverview;
    let password: string;
    try {
      const form = await kxForm({
        title: 'Scrape Prospect',
        text: 'Enter the KEXY master password. It is not your account password.',
        icon: 'fa-lock',
        confirmText: 'Continue',
        fields: [{ key: 'password', label: 'Master password', type: 'password' }],
        validate: (v) => (v['password'] ? null : 'Enter the master password'),
      });
      if (!form) return;
      password = form['password'];
      overview = await this.prospectingService.prospectScrapeOverview({
        companyId,
        contactIds,
        masterPassword: password,
      });
    } catch (e) {
      await kxNotice({ title: 'Could not open Scrape Prospect', text: errorText(e), icon: 'fa-exclamation' });
      return;
    } finally {
      this.opening = false;
    }

    const ref = this.modal.open(ProspectScrapeModalComponent, {
      windowClass: 'kx-dialog-modal kx-prospect-scrape-modal',
      centered: true,
    });
    ref.componentInstance.overview = overview;
    ref.componentInstance.companyId = companyId;
    ref.componentInstance.masterPassword = password;
    let result: IProspectScrapeStartResult;
    try {
      result = await ref.result;
    } catch {
      return; // Cancel / × / Esc
    }
    await kxNotice({
      title: result.started.length ? 'Scraping started' : 'Nothing was scraped',
      text: this.__summary(result),
      icon: 'fa-search',
      tone: result.started.length ? 'success' : 'info',
      timerMs: 10000,
    });
  }

  private __key(): string {
    return `kx.contacts.scrapeProspect.${this.userId}`;
  }

  private __summary(result: IProspectScrapeStartResult): string {
    const title = { web: 'Website', location: 'Location', linkedin: 'LinkedIn', sports: 'Sports' };
    const why = {
      not_available: 'nothing to scrape',
      just_scraped: 'scraped in the last 10 minutes',
      duplicate: 'shared with another selected contact, scraped once',
      not_found: 'contact not found',
    };
    const lines: string[] = [];
    const n = result.started.length;
    if (n) {
      lines.push(
        `Started ${n} scrape${n === 1 ? '' : 's'}. LinkedIn and Location take about a minute, ` +
          'Website and Sports a few minutes; their next email uses the new data.',
      );
    }
    for (const s of result.skipped) {
      lines.push(`Skipped ${title[s.type]} for ${s.email ?? `#${s.contactId}`}: ${why[s.reason]}.`);
    }
    return lines.join(' ');
  }
}
