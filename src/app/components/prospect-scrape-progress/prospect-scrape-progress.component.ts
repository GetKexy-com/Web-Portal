import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';

import {
  IProspectScrapeJob,
  IProspectScrapeRun,
  ProspectScrapeType,
} from '../../services/prospecting.service';
import { ScrapeProspectService } from '../../services/scrape-prospect.service';

type StepState = 'done' | 'current' | 'failed' | 'todo';

const TYPES: Record<
  ProspectScrapeType,
  { title: string; icon: string; steps: string[]; items: string }
> = {
  web: {
    title: 'Website',
    icon: 'fa-globe',
    steps: ['Queued', 'Starting crawl', 'Crawling pages', 'Saved'],
    items: 'Pages',
  },
  location: {
    title: 'Location',
    icon: 'fa-map-marker',
    steps: ['Queued', 'Searching nearby places', 'Saved'],
    items: 'Places',
  },
  linkedin: {
    title: 'LinkedIn',
    icon: 'fa-linkedin',
    steps: ['Queued', 'Scraping profile & company', 'Saved'],
    items: 'Company posts',
  },
  sports: {
    title: 'Sports',
    icon: 'fa-trophy',
    steps: ['Queued', 'Checking home games', 'Saved'],
    items: 'Signals',
  },
};

/**
 * Progress of "Scrape Prospect" runs (`ScrapeProspectService.runs`, KexyApi
 * `prospect-scrape/status`), above the toolbar on Manage Contacts and a list's Contacts page.
 * Per run: a bar over all its scrapes, and a details section (open / close) listing every
 * contact's scrapes with their steps, timing, the scraper's own words and, once saved, what
 * was saved. Shown only while the hidden button is (`scrapeProspect.shown`, in the page).
 */
@Component({
  selector: 'prospect-scrape-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prospect-scrape-progress.component.html',
  styleUrl: './prospect-scrape-progress.component.scss',
})
export class ProspectScrapeProgressComponent implements OnInit, OnDestroy {
  readonly TYPES = TYPES;
  /** Re-read every second so running times tick. */
  now = Date.now();
  private clock: ReturnType<typeof setInterval> | null = null;
  /** Run ids whose details are open / closed by the user; otherwise the newest run is open. */
  private toggledRuns = new Map<string, boolean>();
  /** `runId|index` of scrapes whose "What was saved" is open. */
  private openSaved = new Set<string>();

  constructor(public scrapeProspect: ScrapeProspectService) {}

  ngOnInit(): void {
    this.clock = setInterval(() => (this.now = Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.clock) clearInterval(this.clock);
  }

  get runs(): IProspectScrapeRun[] {
    return this.scrapeProspect.runs;
  }

  // ── Run level ────────────────────────────────────────────────────────────

  isOpen(run: IProspectScrapeRun, index: number): boolean {
    return this.toggledRuns.get(run.id) ?? index === 0;
  }

  toggle(run: IProspectScrapeRun, index: number): void {
    this.toggledRuns.set(run.id, !this.isOpen(run, index));
  }

  count(run: IProspectScrapeRun, ...states: IProspectScrapeJob['state'][]): number {
    return run.jobs.filter((j) => states.includes(j.state)).length;
  }

  /** Each scrape weighs the same; one in flight counts by how far along its steps it is. */
  percent(run: IProspectScrapeRun): number {
    if (!run.jobs.length) return 100;
    const total = run.jobs.reduce((n, j) => {
      const steps = TYPES[j.type].steps.length - 1;
      return n + (j.state === 'done' || j.state === 'failed' ? 1 : this.__stepIndex(j) / steps);
    }, 0);
    return Math.round((total / run.jobs.length) * 100);
  }

  phase(run: IProspectScrapeRun): 'running' | 'done' | 'failed' | 'partial' {
    if (this.scrapeProspect.isActive(run)) return 'running';
    const failed = this.count(run, 'failed');
    if (!failed) return 'done';
    return failed === run.jobs.length ? 'failed' : 'partial';
  }

  title(run: IProspectScrapeRun): string {
    const contacts = new Set(run.jobs.map((j) => j.contactId)).size;
    const who = `${contacts} contact${contacts === 1 ? '' : 's'}`;
    switch (this.phase(run)) {
      case 'running':
        return `Scraping ${who}`;
      case 'done':
        return `Scrape finished for ${who}`;
      case 'failed':
        return `Scrape failed for ${who}`;
      default:
        return `Scrape finished with problems for ${who}`;
    }
  }

  /** Jobs grouped by contact, in the order they were asked for. */
  contacts(run: IProspectScrapeRun) {
    const groups = new Map<
      number,
      {
        contactId: number;
        name: string | null;
        email: string;
        jobs: { job: IProspectScrapeJob; index: number }[];
      }
    >();
    run.jobs.forEach((job, index) => {
      if (!groups.has(job.contactId)) {
        groups.set(job.contactId, {
          contactId: job.contactId,
          name: job.name,
          email: job.email,
          jobs: [],
        });
      }
      groups.get(job.contactId)!.jobs.push({ job, index });
    });
    return [...groups.values()];
  }

  // ── Scrape level ─────────────────────────────────────────────────────────

  steps(job: IProspectScrapeJob): { label: string; state: StepState }[] {
    const labels = TYPES[job.type].steps;
    const at = this.__stepIndex(job);
    return labels.map((label, i) => ({
      label,
      state:
        job.state === 'done' || i < at
          ? 'done'
          : i === at
            ? job.state === 'failed'
              ? 'failed'
              : 'current'
            : 'todo',
    }));
  }

  stateText(job: IProspectScrapeJob): string {
    switch (job.state) {
      case 'queued':
        return 'Waiting';
      case 'running':
        return 'Scraping';
      case 'saving':
        return 'Saving pages';
      case 'done':
        return 'Saved';
      default:
        return 'Failed';
    }
  }

  /** "Waiting · 3 ahead", "Running for 0:42", "Took 34s", "Failed after 1:05". */
  timing(job: IProspectScrapeJob, run: IProspectScrapeRun): string {
    const at = (iso: string | null) => (iso ? new Date(iso).getTime() : null);
    const now = this.now + this.scrapeProspect.clockOffsetMs;
    const started = at(job.startedAt);
    if (job.state === 'queued' || !started) {
      const ahead = run.jobs.filter(
        (j) => j.state === 'queued' && run.jobs.indexOf(j) < run.jobs.indexOf(job),
      ).length;
      return ahead ? `${ahead} ahead in line · 3 run at once` : 'Next in line';
    }
    const end = at(job.finishedAt);
    if (job.state === 'done') return `Took ${this.__duration((end ?? now) - started)}`;
    if (job.state === 'failed') return `Failed after ${this.__duration((end ?? now) - started)}`;
    if (job.state === 'saving') {
      const called = at(job.calledAt) ?? started;
      return `Crawl started ${this.__duration(called - started)} in · saving for ${this.__duration(now - called)} (usually a few minutes)`;
    }
    return `Running for ${this.__duration(now - started)}`;
  }

  savedOpen(run: IProspectScrapeRun, index: number): boolean {
    return this.openSaved.has(`${run.id}|${index}`);
  }

  toggleSaved(run: IProspectScrapeRun, index: number): void {
    const key = `${run.id}|${index}`;
    if (this.openSaved.has(key)) this.openSaved.delete(key);
    else this.openSaved.add(key);
  }

  trackRun = (_: number, run: IProspectScrapeRun) => run.id;
  trackContact = (_: number, c: { contactId: number }) => c.contactId;
  trackJob = (_: number, j: { index: number }) => j.index;

  /** Which step the job is on: 0 queued, 1 calling, 2 saving (web), last = saved. */
  private __stepIndex(job: IProspectScrapeJob): number {
    const last = TYPES[job.type].steps.length - 1;
    switch (job.state) {
      case 'queued':
        return 0;
      case 'running':
        return 1;
      case 'saving':
        return 2;
      case 'done':
        return last;
      default:
        // Failed: on the call, or (web) while the crawl was saving.
        return job.type === 'web' && job.calledAt ? 2 : 1;
    }
  }

  private __duration(ms: number): string {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }
}
