import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';

import {
  DASHBOARD_SPAN_LABELS,
  DashboardWidgetSpan,
  IDashboardLayout,
  IDashboardWidgetState,
  allowedSpans,
  cloneDashboardLayout,
  defaultDashboardLayout,
  findWidgetDef,
  layoutsEqual,
} from '../../models/DashboardLayout';

/**
 * "Customize dashboard" — the slide-over that arranges the brand dashboard's cards.
 *
 * ── Why a drawer instead of dragging the cards themselves ───────────────────
 * The first cut let you drag the panels on the page. It worked, but the cards are
 * full of interactive things — sortable table headers, campaign checkboxes, whole
 * clickable rows, the chart's hover layer — so it needed a page-wide "customise
 * mode" that switched all of that off, plus per-card tool bars that changed the
 * layout while you were trying to judge it. Dragging in a grid is also the awkward
 * case: cards are different sizes, reflow as they move, and the drop target you want
 * is often under the card you are holding.
 *
 * A list of titles is the honest control surface. Rows are uniform, reordering is
 * one dimension, every card is reachable including the hidden ones, and the page
 * behind stays a normal working dashboard the whole time.
 *
 * ── Draft, then save ────────────────────────────────────────────────────────
 * Edits here mutate a COPY (see `cloneDashboardLayout`). Nothing reaches the page or
 * the server until Save, which closes the drawer with the new layout; Cancel simply
 * discards it. That is what makes "Reset to default" safe to offer inline — it is
 * just another edit to the draft, undoable by cancelling, rather than an immediate
 * destructive write.
 */
@Component({
  selector: 'dashboard-layout-drawer',
  imports: [CommonModule, DragDropModule],
  templateUrl: './dashboard-layout-drawer.component.html',
  styleUrl: './dashboard-layout-drawer.component.scss',
})
export class DashboardLayoutDrawerComponent implements OnInit {
  /** Set on the component instance by the opener, before the drawer renders. */
  layout: IDashboardLayout = defaultDashboardLayout();

  readonly spanLabels = DASHBOARD_SPAN_LABELS;

  /** The editable copy. `layout` is never touched — Cancel has to mean cancel. */
  draft: IDashboardLayout = defaultDashboardLayout();
  /** Announced politely; a drag emits nothing to a screen reader on its own. */
  announcement = '';

  constructor(public activeCanvas: NgbActiveOffcanvas) {}

  ngOnInit(): void {
    this.draft = cloneDashboardLayout(this.layout);
  }

  get isDirty(): boolean {
    return !layoutsEqual(this.draft, this.layout);
  }

  get visibleCount(): number {
    return this.draft.items.filter((w) => !w.hidden).length;
  }

  title = (widget: IDashboardWidgetState): string =>
    findWidgetDef(widget.id)?.title ?? widget.id;

  /**
   * The widths this card may take. Narrower options are absent rather than disabled:
   * a table squeezed into a third of the canvas is a horizontal scrollbar, not a
   * layout, and offering the choice only to refuse it wastes the user's time.
   */
  spansFor = (widget: IDashboardWidgetState): DashboardWidgetSpan[] => {
    const def = findWidgetDef(widget.id);
    return def ? allowedSpans(def) : [];
  };

  drop = (event: CdkDragDrop<IDashboardWidgetState[]>): void => {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.draft.items, event.previousIndex, event.currentIndex);
  };

  /**
   * Keyboard equivalent of a drag. The CDK has no keyboard drag of its own, and a
   * reordering UI that only works with a mouse isn't finished.
   */
  move = (widget: IDashboardWidgetState, delta: number): void => {
    const from = this.draft.items.indexOf(widget);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= this.draft.items.length) return;

    moveItemInArray(this.draft.items, from, to);
    this.announcement = `${this.title(widget)} moved to position ${to + 1} of ${this.draft.items.length}.`;
  };

  setSpan = (widget: IDashboardWidgetState, span: DashboardWidgetSpan): void => {
    widget.span = span;
  };

  toggleHidden = (widget: IDashboardWidgetState): void => {
    widget.hidden = !widget.hidden;
    this.announcement = `${this.title(widget)} ${widget.hidden ? 'hidden' : 'shown'}.`;
  };

  /** An edit to the DRAFT, not a write — cancelling still puts everything back. */
  resetToDefault = (): void => {
    this.draft = defaultDashboardLayout();
    this.announcement = 'Layout reset to the default arrangement. Save to apply it.';
  };

  save = (): void => {
    this.activeCanvas.close(this.draft);
  };
}
