import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';

// EXPERIMENTAL: spreadsheet-style preview shown BEFORE a CSV import starts.
// Highlights rows whose email or URL columns are invalid, shows a summary, lets
// the user drop bad rows, then hands the cleaned Papa-parse result back to the
// page's import routine via startImport().
interface PreviewItem {
  row: any;
  invalidCols: string[];
  invalid: boolean;
}

@Component({
  selector: 'import-preview-modal-content',
  imports: [CommonModule, FormsModule, KexyButtonComponent],
  templateUrl: './import-preview-modal-content.component.html',
  styleUrl: './import-preview-modal-content.component.scss',
})
export class ImportPreviewModalContentComponent implements OnInit {
  // The raw Papa-parse result ({ data, meta: { fields }, errors }).
  @Input() parsedData: any;
  @Input() closeModal: () => void = () => {};
  // Called with a Papa-like result ({ ...parsedData, data: keptRows }) when the
  // user confirms. The page runs the actual (async) import.
  @Input() startImport: (data: any) => void = () => {};

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
  // Inline cell editing (click a cell to fix a bad email/URL in place).
  editing: { item: PreviewItem; col: string } | null = null;

  // Preferred left-to-right column order; the rest keep their original order.
  private readonly COLUMN_ORDER = ['First Name', 'Last Name', 'Email', 'Website', 'Linkedin'];

  // Loose validators — an empty URL is allowed (the importer fills defaults), but
  // a present-yet-malformed one is flagged. Email is always required.
  private readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[^\s]*)?$/i;

  ngOnInit(): void {
    // Defer the heavy validation + first table render one tick so the spinner
    // paints first (feels responsive on large files).
    setTimeout(() => {
      const fields = this.parsedData?.meta?.fields?.length
        ? [...this.parsedData.meta.fields]
        : Object.keys(this.parsedData?.data?.[0] || {});
      this.columns = this.orderColumns(fields);
      this.buildItems(this.parsedData?.data || []);
      this.loading = false;
    });
  }

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

  private buildItems = (rows: any[]) => {
    this.items = rows.map((row) => {
      const invalidCols = this.columns.filter((c) => this.isCellInvalid(c, row[c]));
      return { row, invalidCols, invalid: invalidCols.length > 0 };
    });
  };

  isEmailColumn = (c: string) => (c || '').toLowerCase().trim() === 'email';
  isUrlColumn = (c: string) => /linkedin|website|url/i.test(c || '');

  private isCellInvalid = (col: string, value: any): boolean => {
    const v = (value ?? '').toString().trim();
    if (this.isEmailColumn(col)) return !this.EMAIL_RE.test(v);
    if (this.isUrlColumn(col)) return !!v && !this.URL_RE.test(v);
    return false;
  };

  invalidReason = (col: string) =>
    this.isEmailColumn(col) ? 'Invalid email address' : 'Invalid URL';

  // ── Summary (derived from the precomputed items) ──────────────────────────
  get validCount(): number {
    return this.items.filter((i) => !i.invalid).length;
  }
  get invalidCount(): number {
    return this.items.filter((i) => i.invalid).length;
  }
  get invalidEmailCount(): number {
    return this.items.filter((i) => i.invalidCols.some((c) => this.isEmailColumn(c))).length;
  }
  get invalidUrlCount(): number {
    return this.items.filter((i) => i.invalidCols.some((c) => this.isUrlColumn(c))).length;
  }
  get validPct(): number {
    return this.items.length ? Math.round((this.validCount / this.items.length) * 100) : 0;
  }
  get invalidPct(): number {
    return this.items.length ? 100 - this.validPct : 0;
  }

  // Rows currently shown (respects the "show only invalid" filter).
  get displayedItems(): PreviewItem[] {
    return this.showOnlyInvalid ? this.items.filter((i) => i.invalid) : this.items;
  }

  // How many rows have an invalid value in this specific column (drives the
  // per-column header badge so dirty fields are easy to spot).
  columnInvalidCount = (col: string): number =>
    this.items.filter((i) => i.invalidCols.includes(col)).length;

  // Run a grid-changing update behind a loader: paint the overlay first, do the
  // work (which triggers the heavy re-render) on the next tick, then hide it.
  private runTableUpdate = (fn: () => void) => {
    this.tableBusy = true;
    this.invalidCursor = -1;
    this.pulseKey = null;
    setTimeout(() => {
      fn();
      setTimeout(() => (this.tableBusy = false));
    });
  };

  toggleShowOnlyInvalid = () => {
    this.runTableUpdate(() => (this.showOnlyInvalid = !this.showOnlyInvalid));
  };

  // Step through invalid rows one at a time: scroll the next one into view and
  // pulse it. Cycles back to the first after the last.
  jumpToNextInvalid = () => {
    const invalidIdx = this.displayedItems
      .map((it, idx) => (it.invalid ? idx : -1))
      .filter((idx) => idx >= 0);
    if (!invalidIdx.length) return;
    this.invalidCursor = (this.invalidCursor + 1) % invalidIdx.length;
    const target = invalidIdx[this.invalidCursor];
    const el = document.getElementById('ip-row-' + target);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    this.pulseKey = target;
  };

  // ── Inline editing ────────────────────────────────────────────────────────
  isEditing = (item: PreviewItem, col: string) =>
    this.editing?.item === item && this.editing?.col === col;

  startEdit = (item: PreviewItem, col: string) => {
    this.editing = { item, col };
    // Focus the input once Angular has rendered it.
    setTimeout(() => {
      const el = document.querySelector('.ip-table .cell-input') as HTMLInputElement | null;
      el?.focus();
      el?.select();
    });
  };

  stopEdit = () => {
    if (this.editing) this.revalidate(this.editing.item);
    this.editing = null;
  };

  // Recompute a single row's validity after an inline edit.
  private revalidate = (item: PreviewItem) => {
    item.invalidCols = this.columns.filter((c) => this.isCellInvalid(c, item.row[c]));
    item.invalid = item.invalidCols.length > 0;
  };

  // ── Row actions ───────────────────────────────────────────────────────────
  removeRow = (index: number) => {
    // index is into displayedItems; map back to the real items array.
    const item = this.displayedItems[index];
    const real = this.items.indexOf(item);
    if (real > -1) this.items.splice(real, 1);
    this.invalidCursor = -1;
    this.pulseKey = null;
  };

  removeInvalid = () => {
    this.runTableUpdate(() => {
      this.items = this.items.filter((i) => !i.invalid);
      this.showOnlyInvalid = false;
    });
  };

  handleImport = () => {
    if (!this.items.length || this.importing) return;
    this.importing = true;
    const keptRows = this.items.map((i) => i.row);
    // Preserve the original Papa shape (meta/errors) so parseCsvDataToContact
    // keeps working; only the rows change.
    this.startImport({ ...this.parsedData, data: keptRows });
  };
}
