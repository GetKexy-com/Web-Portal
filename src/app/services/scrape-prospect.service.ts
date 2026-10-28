import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';

import { ProspectScrapeModalComponent } from '../components/prospect-scrape-modal/prospect-scrape-modal.component';
import { errorText, kxForm, kxNotice } from '../helpers/kx-dialogs';
import {
  IProspectScrapeOverview,
  IProspectScrapeRun,
  IProspectScrapeState,
  IProspectScrapeStartResult,
  ProspectingService,
  ProspectScrapeType,
} from './prospecting.service';

/**
 * "Scrape Prospect" (KexyApi `src/prospect-scrape/`), shared by Manage Contacts and a list's
 * Contacts page: see what research KEXY holds for selected contacts (website, location,
 * LinkedIn, sports) and scrape any of it again now. Every scrape is PAID, so:
 * - the tool is hidden (owner's call, 2026-10-28) until the page headline is clicked 5 times
 *   within 3 seconds (`onTitleClick`), and even then shows NOTHING until the KEXY master
 *   password (not the account's) is accepted (`prospect-scrape/unlock`). The password is then
 *   kept in memory only and sent with every overview / start, so there is no second prompt.
 *   Shared by both pages; "Hide", a reload, or another login puts it away (nothing is stored
 *   in the browser).
 * A root singleton, so both pages read the same `shown` and `runs`. Each page calls `load` on
 * init.
 *
 * Progress (`prospect-scrape-progress`, above both pages' toolbars): after Start, and on load
 * while the button is shown, `prospect-scrape/status` is polled every few seconds until every
 * scrape of the company's recent runs is done or failed. The server keeps a run for half an
 * hour after it ends; "Dismiss" hides a finished one in this tab.
 *
 * Last scraped (`contact-list-card`, under each name): the table reports the contacts it
 * shows (`setTableContacts`); while the button is shown, `prospect-scrape/last-scraped` is read
 * for them, again when the page of contacts changes and whenever a scrape finishes. `changes`
 * tells the (OnPush) table to redraw.
 */
@Injectable({ providedIn: 'root' })
export class ScrapeProspectService {
  /** At most this many contacts per click (KexyApi `PROSPECT_SCRAPE_MAX_CONTACTS`). */
  readonly maxContacts = 10;
  shown = false;
  /** The overview request is open. */
  opening = false;
  /** Accepted by `prospect-scrape/unlock`; memory only, cleared on Hide. */
  private masterPassword: string | null = null;

  /** This company's recent runs, newest first, minus dismissed ones. */
  runs: IProspectScrapeRun[] = [];
  /** Per contact on the table, per type: what it is scraped by and when it was last scraped. */
  lastScraped: Record<number, Record<ProspectScrapeType, IProspectScrapeState>> = {};
  /** Fires when `shown` or `lastScraped` changes. */
  readonly changes = new Subject<void>();
  private tableContactIds: number[] = [];
  private lastScrapedToken = 0;
  private doneJobs = 0;

  /** Server clock minus this browser's, so elapsed times don't drift with a skewed clock. */
  clockOffsetMs = 0;

  private userId: number | string = 'anon';
  private titleClicks: number[] = [];
  private companyId: number | null = null;
  private dismissed = new Set<string>();
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly POLL_MS = 4000;

  constructor(
    private prospectingService: ProspectingService,
    private modal: NgbModal,
  ) {}

  /**
   * Called by each page on init. Another login in the same tab locks the tool again; while it is
   * unlocked, picks up any scrape still running.
   */
  load(userId: number | string | null | undefined, companyId?: number | null): void {
    const user = userId ?? 'anon';
    if (user !== this.userId) this.setShown(false);
    this.userId = user;
    try {
      // Was "shown" remembered in this browser before the password came first (2026-10-28).
      localStorage.removeItem(this.__key());
    } catch {
      // Storage blocked: nothing to clear.
    }
    if (companyId && Number(companyId) !== this.companyId) {
      this.__stopPolling();
      this.runs = [];
      this.lastScraped = {};
      this.companyId = Number(companyId);
    }
    if (this.shown && this.companyId) this.refreshProgress();
  }

  /** The contacts the table shows now (any page, either page type). Read when shown. */
  setTableContacts(contactIds: number[]): void {
    this.tableContactIds = contactIds.filter(Boolean).map(Number);
    if (this.shown) this.loadLastScraped();
  }

  /** One `last-scraped` read for the table's contacts; an older answer never overwrites a newer. */
  async loadLastScraped(): Promise<void> {
    const ids = this.tableContactIds;
    const companyId = this.companyId;
    const token = ++this.lastScrapedToken;
    if (!ids.length || !companyId) {
      this.lastScraped = {};
      this.changes.next();
      return;
    }
    try {
      const res = await this.prospectingService.prospectScrapeLastScraped({ companyId, contactIds: ids });
      if (token !== this.lastScrapedToken) return;
      this.lastScraped = res.contacts ?? {};
      this.changes.next();
    } catch (e) {
      console.error('Could not read when contacts were last scraped', e);
    }
  }

  /** Whether any scrape of these runs is still queued, running or saving. */
  isActive(run: IProspectScrapeRun): boolean {
    return run.jobs.some((j) => j.state !== 'done' && j.state !== 'failed');
  }

  dismiss(runId: string): void {
    this.dismissed.add(runId);
    this.runs = this.runs.filter((r) => r.id !== runId);
  }

  /** One status read; keeps polling while anything is unfinished. Errors wait for the next tick. */
  async refreshProgress(): Promise<void> {
    if (!this.companyId) return;
    const companyId = this.companyId;
    this.__stopPolling();
    try {
      const status = await this.prospectingService.prospectScrapeStatus({ companyId });
      if (companyId !== this.companyId) return; // the page changed company meanwhile
      this.runs = status.runs.filter((r) => !this.dismissed.has(r.id));
      this.clockOffsetMs = new Date(status.serverTime).getTime() - Date.now();
      // A scrape just finished: the table's "last scraped" times moved.
      const done = this.runs.reduce((n, r) => n + r.jobs.filter((j) => j.state === 'done').length, 0);
      if (done !== this.doneJobs) {
        this.doneJobs = done;
        this.loadLastScraped();
      }
    } catch (e) {
      console.error('Could not read Scrape Prospect progress', e);
    }
    if (this.runs.some((r) => this.isActive(r))) {
      this.pollTimer = setTimeout(() => this.refreshProgress(), ScrapeProspectService.POLL_MS);
    }
  }

  private __stopPolling(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  /** Five clicks on the page headline within 3 seconds asks for the master password. */
  onTitleClick(): void {
    const now = Date.now();
    this.titleClicks = [...this.titleClicks.filter((t) => now - t < 3000), now];
    if (this.titleClicks.length >= 5 && !this.shown) {
      this.titleClicks = [];
      this.__unlock();
    }
  }

  /** The master password popup; the tool shows only once the server accepts it. */
  private async __unlock(): Promise<void> {
    const companyId = this.companyId;
    if (!companyId || this.opening) return;
    this.opening = true;
    try {
      const form = await kxForm({
        title: 'Scrape Prospect',
        text: 'Enter the KEXY master password. It is not your account password.',
        icon: 'fa-lock',
        confirmText: 'Unlock',
        fields: [{ key: 'password', label: 'Master password', type: 'password' }],
        validate: (v) => (v['password'] ? null : 'Enter the master password'),
        // Wrong password: the popup stays open with the server's reason (429 after 5 tries).
        submit: async (v) => {
          try {
            await this.prospectingService.prospectScrapeUnlock({ companyId, masterPassword: v['password'] });
            return null;
          } catch (e) {
            return errorText(e);
          }
        },
      });
      if (!form) return;
      this.masterPassword = form['password'];
      this.setShown(true);
    } finally {
      this.opening = false;
    }
  }

  setShown(shown: boolean): void {
    this.shown = shown;
    if (!shown) this.masterPassword = null;
    // The progress card and the "last scraped" line are part of the hidden tool: they go and
    // come back with the button.
    if (shown) {
      this.refreshProgress();
      this.loadLastScraped();
    } else {
      this.__stopPolling();
    }
    this.changes.next();
  }

  /** The popup for these contacts (with the password given at unlock), then a summary. */
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

    const password = this.masterPassword;
    if (!password) {
      this.setShown(false); // never unlocked in this tab
      return;
    }
    this.opening = true;
    let overview: IProspectScrapeOverview;
    try {
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
    // The progress card shows the run from here on.
    this.companyId = Number(companyId);
    if (result.runId) this.refreshProgress();
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
          'Website and Sports a few minutes; follow each one on the progress card above the ' +
          'contacts. Their next email uses the new data.',
      );
    }
    for (const s of result.skipped) {
      lines.push(`Skipped ${title[s.type]} for ${s.email ?? `#${s.contactId}`}: ${why[s.reason]}.`);
    }
    return lines.join(' ');
  }
}
