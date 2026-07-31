/**
 * The customisable brand-dashboard layout.
 *
 * The dashboard used to hardcode both its order and its widths: each row was its own
 * CSS grid (`.perf-grid` at `3fr 2fr`, `.duo-grid` at `1fr 1fr`, and so on), so a
 * panel's width came from the ROW it happened to sit in. That made reordering
 * impossible — moving a panel out of its row silently changed its size.
 *
 * Now there is ONE 6-column canvas and every panel carries its own `span`. Order and
 * width are data, which is what makes them user-editable, and the responsive rules
 * collapse spans at the breakpoints rather than restating a grid per row.
 *
 * Six columns, not twelve: the useful widths are thirds, halves and two-thirds, and
 * six expresses all of them in whole numbers (2 / 3 / 4 / 6) while keeping the drag
 * target sizes coarse enough to hit.
 */

export type DashboardWidgetId =
  | 'metrics'
  | 'reach'
  | 'campaign-performance'
  | 'activity'
  | 'engaged-contacts'
  | 'funnel'
  | 'top-links'
  | 'deliverability'
  | 'send-windows';

/** Columns a widget may occupy on the 6-column canvas. */
export type DashboardWidgetSpan = 2 | 3 | 4 | 6;

export const DASHBOARD_GRID_COLUMNS = 6;

/** The widths the resize control cycles through, narrowest first. */
export const DASHBOARD_SPANS: DashboardWidgetSpan[] = [2, 3, 4, 6];

export const DASHBOARD_SPAN_LABELS: Record<DashboardWidgetSpan, string> = {
  2: 'One third',
  3: 'Half',
  4: 'Two thirds',
  6: 'Full width',
};

export interface IDashboardWidgetDef {
  id: DashboardWidgetId;
  /** Shown in the customise UI — the panels themselves render their own headings. */
  title: string;
  defaultSpan: DashboardWidgetSpan;
  /**
   * Below this the panel stops being readable rather than merely cramped — a wide
   * table squeezed into a third of the canvas is a horizontal scrollbar, not a
   * layout. The resize control skips anything narrower.
   */
  minSpan: DashboardWidgetSpan;
  /** Off until the user turns it on. */
  defaultHidden?: boolean;
}

/**
 * The catalog. **Array order is the default layout order** — there is no separate
 * ordering table to keep in sync, and a widget added here shows up in the right place
 * for existing users too (see `reconcileDashboardLayout`).
 */
export const DASHBOARD_WIDGETS: IDashboardWidgetDef[] = [
  { id: 'metrics', title: 'Performance chart', defaultSpan: 6, minSpan: 4 },
  { id: 'reach', title: 'Reach summary', defaultSpan: 6, minSpan: 3 },
  // 4 / 2 on a six-column canvas IS the 60/40 the old `.perf-grid` hardcoded.
  { id: 'campaign-performance', title: 'Campaign performance', defaultSpan: 4, minSpan: 3 },
  { id: 'activity', title: 'Activity', defaultSpan: 2, minSpan: 2 },
  { id: 'engaged-contacts', title: 'Most engaged contacts', defaultSpan: 6, minSpan: 4 },
  // The four panels that used to hide behind the component's `showSecondaryPanels`
  // flag. They are not deleted or commented out — they are simply hidden widgets, so
  // a user who wants them can switch them on without a code change.
  { id: 'funnel', title: 'Engagement funnel', defaultSpan: 3, minSpan: 2, defaultHidden: true },
  { id: 'top-links', title: 'Top clicked links', defaultSpan: 3, minSpan: 2, defaultHidden: true },
  { id: 'deliverability', title: 'Deliverability', defaultSpan: 3, minSpan: 2, defaultHidden: true },
  { id: 'send-windows', title: 'Best send windows', defaultSpan: 3, minSpan: 3, defaultHidden: true },
];

/** Per-widget saved state. Everything else about a widget comes from the catalog. */
export interface IDashboardWidgetState {
  id: DashboardWidgetId;
  span: DashboardWidgetSpan;
  hidden: boolean;
}

export interface IDashboardLayout {
  /** Bumped only for a change no reconcile can repair; see `reconcileDashboardLayout`. */
  v: number;
  items: IDashboardWidgetState[];
}

export const DASHBOARD_LAYOUT_VERSION = 1;

/** Server preference key AND the localStorage cache key, so the two can't drift. */
export const DASHBOARD_LAYOUT_KEY = 'dashboard.layout.v1';

export function defaultDashboardLayout(): IDashboardLayout {
  return {
    v: DASHBOARD_LAYOUT_VERSION,
    items: DASHBOARD_WIDGETS.map((w) => ({
      id: w.id,
      span: w.defaultSpan,
      hidden: !!w.defaultHidden,
    })),
  };
}

export function findWidgetDef(id: DashboardWidgetId): IDashboardWidgetDef | undefined {
  return DASHBOARD_WIDGETS.find((w) => w.id === id);
}

/**
 * Turn whatever came back from storage into a layout this build can render.
 *
 * This is the whole compatibility story, and it is why shipping a new panel needs no
 * migration: a saved layout is treated as a set of PREFERENCES about the widgets it
 * mentions, not as the definitive list.
 *
 * - Unknown ids are dropped — a widget removed from the catalog can't be rendered.
 * - Known ids the save doesn't mention are inserted at their CATALOG position, so a
 *   newly shipped panel lands where it was designed to sit rather than being
 *   appended to the bottom of everyone's dashboard.
 * - Spans are clamped to the allowed set and to the widget's `minSpan`, so tightening
 *   a minimum in a later release repairs old saves instead of breaking on them.
 * - Anything structurally wrong (wrong version, not an object, no usable items) falls
 *   back to defaults rather than throwing. A corrupt preference should cost the user
 *   their customisation, not their dashboard.
 */
export function reconcileDashboardLayout(stored: unknown): IDashboardLayout {
  const raw = stored as Partial<IDashboardLayout> | null;
  if (!raw || typeof raw !== 'object' || raw.v !== DASHBOARD_LAYOUT_VERSION) {
    return defaultDashboardLayout();
  }
  if (!Array.isArray(raw.items)) return defaultDashboardLayout();

  const seen = new Set<DashboardWidgetId>();
  const items: IDashboardWidgetState[] = [];

  for (const entry of raw.items) {
    const def = entry && findWidgetDef(entry.id);
    if (!def || seen.has(def.id)) continue;
    seen.add(def.id);
    items.push({
      id: def.id,
      span: clampSpan(entry.span, def),
      hidden: entry.hidden === true,
    });
  }

  if (!items.length) return defaultDashboardLayout();

  // Splice missing widgets in at their catalog index. Walking the catalog in order
  // means several new widgets keep their relative order among themselves.
  DASHBOARD_WIDGETS.forEach((def, catalogIndex) => {
    if (seen.has(def.id)) return;
    items.splice(Math.min(catalogIndex, items.length), 0, {
      id: def.id,
      span: def.defaultSpan,
      hidden: !!def.defaultHidden,
    });
  });

  return { v: DASHBOARD_LAYOUT_VERSION, items };
}

/** The widths this widget may take — the segmented control in the drawer renders these. */
export function allowedSpans(def: IDashboardWidgetDef): DashboardWidgetSpan[] {
  return DASHBOARD_SPANS.filter((s) => s >= def.minSpan);
}

/** Nearest allowed span that is at least the widget's minimum. */
export function clampSpan(span: unknown, def: IDashboardWidgetDef): DashboardWidgetSpan {
  const allowed = allowedSpans(def);
  const requested = Number(span);
  if (allowed.includes(requested as DashboardWidgetSpan)) {
    return requested as DashboardWidgetSpan;
  }
  return allowed.includes(def.defaultSpan) ? def.defaultSpan : allowed[0];
}

/** Structural copy, so the drawer can edit a draft without touching the live layout. */
export function cloneDashboardLayout(layout: IDashboardLayout): IDashboardLayout {
  return { v: layout.v, items: layout.items.map((item) => ({ ...item })) };
}

/** Value equality, so a save can be skipped when a drag ends where it started. */
export function layoutsEqual(a: IDashboardLayout, b: IDashboardLayout): boolean {
  if (a.v !== b.v || a.items.length !== b.items.length) return false;
  return a.items.every((item, i) => {
    const other = b.items[i];
    return item.id === other.id && item.span === other.span && item.hidden === other.hidden;
  });
}
