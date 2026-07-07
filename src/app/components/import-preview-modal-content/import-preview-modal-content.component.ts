import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';

// EXPERIMENTAL: spreadsheet-style preview shown BEFORE a CSV import starts.
// Highlights rows whose email or URL columns are invalid, shows a summary, lets
// the user drop/fix bad rows, then hands the cleaned Papa-parse result back to
// the page's import routine via startImport().
interface PreviewItem {
  row: any;
  invalidCols: string[];
  invalidSet: Set<string>; // O(1) per-cell lookup in the template (hot path)
  invalid: boolean;
}

@Component({
  selector: 'import-preview-modal-content',
  imports: [CommonModule, FormsModule, KexyButtonComponent],
  templateUrl: './import-preview-modal-content.component.html',
  styleUrl: './import-preview-modal-content.component.scss',
  // OnPush + precomputed summary fields keep editing/scrolling smooth on large
  // files (no per-CD getters recomputing over every row).
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportPreviewModalContentComponent implements OnInit {
  // The raw Papa-parse result ({ data, meta: { fields }, errors }).
  @Input() parsedData: any;
  @Input() closeModal: () => void = () => {};
  // Called with a Papa-like result ({ ...parsedData, data: keptRows }) when the
  // user confirms. The page runs the actual (async) import and closes this modal
  // on success; it should reject/throw on failure so the button can reset.
  @Input() startImport: (data: any) => any = () => {};

  columns: string[] = [];
  items: PreviewItem[] = [];
  importing = false;
  // Validating + rendering a large CSV can take a moment; show a spinner first.
  loading = true;
  // Re-rendering the grid on filter/remove also blocks briefly on big files —
  // show a lightweight overlay while it happens.
  tableBusy = false;
  // Show-only-invalid filter + "next issue" stepper state.
  showOnlyInvalid = false;
  pulseKey: number | null = null;
  private invalidCursor = -1;
  // Inline cell editing (double-click a cell to fix a bad email/URL in place).
  editing: { item: PreviewItem; col: string } | null = null;
  // Single-click selection (Google-Sheets-style) — highlights the cell and lets
  // the user copy its value with Ctrl/Cmd+C.
  selected: { item: PreviewItem; col: string } | null = null;
  copiedKey: string | null = null;

  // Rows currently shown (respects the "show only invalid" filter).
  displayed: PreviewItem[] = [];
  // ── Virtual scrolling ──────────────────────────────────────────────────────
  // Only the visible window of `displayed` is rendered; spacer rows above/below
  // preserve the scroll height so a 1000s-row grid scrolls smoothly.
  @ViewChild('scroll') scrollRef?: ElementRef<HTMLElement>;
  visibleItems: PreviewItem[] = [];
  viewStart = 0;
  topPad = 0;
  bottomPad = 0;
  private rowHeight = 34;
  private readonly BUFFER = 8;
  // Fixed column widths so the grid uses table-layout: fixed — column widths must
  // NOT depend on the currently-rendered (virtualized) rows, or they blink while
  // scrolling. `#` = 52px, remove = 44px.
  colWidths: Record<string, number> = {};
  tableWidth = 0;
  private readonly IDX_W = 52;
  private readonly REMOVE_W = 44;
  // Precomputed summary (recomputed only when data/filter changes, never per-CD).
  validCount = 0;
  invalidCount = 0;
  invalidEmailCount = 0;
  invalidUrlCount = 0;
  validPct = 0;
  invalidPct = 0;
  colInvalidCount: Record<string, number> = {};

  // Preferred left-to-right column order; the rest keep their original order.
  private readonly COLUMN_ORDER = ['First Name', 'Last Name', 'Email', 'Website', 'Linkedin'];

  // Loose validators — an empty URL is allowed (the importer fills defaults), but
  // a present-yet-malformed one is flagged. Email is always required.
  private readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Host (after stripping scheme + optional leading "www.") must still look like
  // domain.tld — so "www.healthsourcechiro" is invalid, "www.healthsourcechiro.com" ok.
  private readonly HOST_RE = /^([a-z0-9-]+\.)+[a-z]{2,24}$/i;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Defer the heavy validation + first table render one tick so the spinner
    // paints first (feels responsive on large files).
    setTimeout(() => {
      const fields = this.parsedData?.meta?.fields?.length
        ? [...this.parsedData.meta.fields]
        : Object.keys(this.parsedData?.data?.[0] || {});
      this.columns = this.orderColumns(fields);
      this.computeColumnWidths();
      this.buildItems(this.parsedData?.data || []);
      this.recompute();
      this.loading = false;
      this.cdr.markForCheck();
      // Once the grid is in the DOM, measure the real row height and recompute
      // the window so spacer paddings line up exactly with the scrollbar.
      setTimeout(() => this.measureRow());
    });
  }

  // ── Virtual scroll window ───────────────────────────────────────────────────
  onScroll = () => {
    this.updateWindow();
    // (scroll) is a template event binding, so OnPush CD runs after this handler.
  };

  private measureRow = () => {
    const tr = this.scrollRef?.nativeElement.querySelector(
      'tbody tr.ip-data-row',
    ) as HTMLElement | null;
    if (tr?.offsetHeight) this.rowHeight = tr.offsetHeight;
    this.updateWindow();
    this.cdr.markForCheck();
  };

  // Recompute which slice of `displayed` is rendered from the current scrollTop.
  private updateWindow = () => {
    const el = this.scrollRef?.nativeElement;
    const scrollTop = el ? el.scrollTop : 0;
    const viewport = el?.clientHeight || 640;
    const total = this.displayed.length;
    const start = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.BUFFER);
    const count = Math.ceil(viewport / this.rowHeight) + this.BUFFER * 2;
    const end = Math.min(total, start + count);
    this.viewStart = start;
    this.topPad = start * this.rowHeight;
    this.bottomPad = Math.max(0, (total - end) * this.rowHeight);
    this.visibleItems = this.displayed.slice(start, end);
  };

  // Stable identity for *ngFor so filtering/removing doesn't re-render every row.
  trackByItem = (_: number, item: PreviewItem) => item;

  // Put the key identity columns first (First Name, Last Name, Email, Website,
  // Linkedin — matched case-insensitively to the CSV's actual headers), then the
  // remaining columns in their original order.
  private orderColumns = (fields: string[]): string[] => {
    const norm = (s: string) => (s || '').toLowerCase().trim();
    const preferred: string[] = [];
    this.COLUMN_ORDER.forEach((p) => {
      const match = fields.find((f) => norm(f) === norm(p));
      if (match) preferred.push(match);
    });
    const rest = fields.filter((f) => !preferred.includes(f));
    return [...preferred, ...rest];
  };

  // Assign a stable width per column (by header meaning) so table-layout: fixed
  // keeps columns rock-steady while virtual-scrolling.
  private computeColumnWidths = () => {
    let sum = 0;
    for (const col of this.columns) {
      const w = this.widthForColumn(col);
      this.colWidths[col] = w;
      sum += w;
    }
    this.tableWidth = this.IDX_W + sum + this.REMOVE_W;
  };

  private widthForColumn = (col: string): number => {
    const c = (col || '').toLowerCase();
    if (c.includes('email') || c.includes('website') || c.includes('linkedin') || c.includes('url')) return 240;
    if (c.includes('title') || c.includes('company')) return 200;
    if (c.includes('name')) return 150;
    return 150;
  };

  private buildItems = (rows: any[]) => {
    this.items = rows.map((row) => this.makeItem(row));
  };

  private makeItem = (row: any): PreviewItem => {
    const invalidCols = this.columns.filter((c) => this.isCellInvalid(c, row[c]));
    return { row, invalidCols, invalidSet: new Set(invalidCols), invalid: invalidCols.length > 0 };
  };

  isEmailColumn = (c: string) => (c || '').toLowerCase().trim() === 'email';
  isUrlColumn = (c: string) => /linkedin|website|url/i.test(c || '');

  private isCellInvalid = (col: string, value: any): boolean => {
    const v = (value ?? '').toString().trim();
    if (this.isEmailColumn(col)) return !this.EMAIL_RE.test(v);
    if (this.isUrlColumn(col)) return !!v && !this.isValidUrl(v);
    return false;
  };

  private isValidUrl = (value: string): boolean => {
    if (/\s/.test(value)) return false;
    // Strip scheme, then path/query/hash, then a leading "www.".
    let host = value.replace(/^https?:\/\//i, '').split(/[\/?#]/)[0].replace(/^www\./i, '');
    return this.HOST_RE.test(host);
  };

  invalidReason = (col: string) =>
    this.isEmailColumn(col) ? 'Invalid email address' : 'Invalid URL';

  // Recompute the summary counts, per-column badges and the visible list. Called
  // only when data or the filter changes — NOT on every change-detection cycle.
  private recompute = () => {
    const colCounts: Record<string, number> = {};
    let valid = 0;
    let badEmail = 0;
    let badUrl = 0;
    for (const it of this.items) {
      if (!it.invalid) {
        valid++;
        continue;
      }
      let hasEmail = false;
      let hasUrl = false;
      for (const c of it.invalidCols) {
        colCounts[c] = (colCounts[c] || 0) + 1;
        if (this.isEmailColumn(c)) hasEmail = true;
        else if (this.isUrlColumn(c)) hasUrl = true;
      }
      if (hasEmail) badEmail++;
      if (hasUrl) badUrl++;
    }
    const total = this.items.length;
    this.validCount = valid;
    this.invalidCount = total - valid;
    this.invalidEmailCount = badEmail;
    this.invalidUrlCount = badUrl;
    this.validPct = total ? Math.round((valid / total) * 100) : 0;
    this.invalidPct = total ? 100 - this.validPct : 0;
    this.colInvalidCount = colCounts;
    this.displayed = this.showOnlyInvalid ? this.items.filter((i) => i.invalid) : this.items;
    this.updateWindow();
  };

  // Run a grid-changing update behind a loader: paint the overlay first, do the
  // work (which triggers the heavy re-render) on the next tick, then hide it.
  private runTableUpdate = (fn: () => void) => {
    this.tableBusy = true;
    this.invalidCursor = -1;
    this.pulseKey = null;
    this.cdr.markForCheck();
    setTimeout(() => {
      fn();
      // Reset to the top so the visible window starts fresh after a filter/remove.
      if (this.scrollRef) this.scrollRef.nativeElement.scrollTop = 0;
      this.recompute();
      this.cdr.markForCheck();
      setTimeout(() => {
        this.tableBusy = false;
        this.cdr.markForCheck();
      });
    });
  };

  toggleShowOnlyInvalid = () => {
    this.runTableUpdate(() => (this.showOnlyInvalid = !this.showOnlyInvalid));
  };

  // Step through invalid rows one at a time: scroll the next one into view and
  // pulse it. Cycles back to the first after the last.
  jumpToNextInvalid = () => {
    const invalidIdx: number[] = [];
    this.displayed.forEach((it, idx) => {
      if (it.invalid) invalidIdx.push(idx);
    });
    if (!invalidIdx.length) return;
    this.invalidCursor = (this.invalidCursor + 1) % invalidIdx.length;
    const target = invalidIdx[this.invalidCursor];
    // Row may not be rendered (virtualized) — scroll to its computed position,
    // which re-renders the window around it; then pulse by absolute index.
    const el = this.scrollRef?.nativeElement;
    if (el) {
      el.scrollTop = Math.max(0, target * this.rowHeight - el.clientHeight / 2);
      this.updateWindow();
    }
    this.pulseKey = target;
    this.cdr.markForCheck();
  };

  // ── Cell selection + keyboard copy ──────────────────────────────────────────
  isSelected = (item: PreviewItem, col: string) =>
    this.selected?.item === item && this.selected?.col === col;

  selectCell = (item: PreviewItem, col: string) => {
    this.selected = { item, col };
  };

  // Ctrl/Cmd+C copies the selected cell's value (when not editing). Enter/F2 begins
  // editing, mirroring spreadsheet keyboard behaviour.
  onCellKeydown = (event: KeyboardEvent, item: PreviewItem, col: string) => {
    if (this.isEditing(item, col)) return; // let the input handle its own keys
    if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C')) {
      const value = (item.row[col] ?? '').toString();
      navigator.clipboard?.writeText(value);
      this.copiedKey = this.cellKey(item, col);
      // Clear the "Copied" hint shortly after.
      setTimeout(() => {
        this.copiedKey = null;
        this.cdr.markForCheck();
      }, 900);
    } else if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      this.startEdit(item, col);
    }
  };

  cellKey = (item: PreviewItem, col: string) => `${this.items.indexOf(item)}:${col}`;

  // ── Inline editing ────────────────────────────────────────────────────────
  isEditing = (item: PreviewItem, col: string) =>
    this.editing?.item === item && this.editing?.col === col;

  startEdit = (item: PreviewItem, col: string) => {
    if (this.isEditing(item, col)) return;
    this.editing = { item, col };
    // Focus the input once Angular has rendered it (without selecting the text).
    setTimeout(() => {
      const el = document.querySelector('.ip-table .cell-input') as HTMLInputElement | null;
      el?.focus();
    });
  };

  stopEdit = () => {
    if (this.editing) {
      this.revalidate(this.editing.item);
      this.editing = null;
      this.recompute();
      this.cdr.markForCheck();
    }
  };

  // Recompute a single row's validity after an inline edit.
  private revalidate = (item: PreviewItem) => {
    item.invalidCols = this.columns.filter((c) => this.isCellInvalid(c, item.row[c]));
    item.invalidSet = new Set(item.invalidCols);
    item.invalid = item.invalidCols.length > 0;
  };

  // ── Row actions ───────────────────────────────────────────────────────────
  removeRow = (index: number) => {
    // index is into the displayed list; map back to the real items array.
    const item = this.displayed[index];
    const real = this.items.indexOf(item);
    if (real > -1) this.items.splice(real, 1);
    this.invalidCursor = -1;
    this.pulseKey = null;
    this.recompute();
    this.cdr.markForCheck();
  };

  removeInvalid = () => {
    this.runTableUpdate(() => {
      this.items = this.items.filter((i) => !i.invalid);
      this.showOnlyInvalid = false;
    });
  };

  handleImport = async () => {
    if (!this.items.length || this.importing) return;
    this.importing = true;
    this.cdr.markForCheck();
    const keptRows = this.items.map((i) => i.row);
    try {
      // Preserve the original Papa shape (meta/errors) so parseCsvDataToContact
      // keeps working; only the rows change. Stay open (button shows "Importing…")
      // until the API responds; the page closes this modal on success.
      await this.startImport({ ...this.parsedData, data: keptRows });
    } catch {
      // Import failed — keep the modal open so the user can retry.
      this.importing = false;
      this.cdr.markForCheck();
    }
  };
}
