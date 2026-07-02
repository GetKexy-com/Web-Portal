import {
  Component, inject, signal, computed, HostListener, ViewChild,
  ElementRef, TemplateRef, AfterViewInit, OnDestroy, NgZone,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EditorStateService } from '../services/editor-state.service';
import { MergeTagService } from '../services/merge-tag.service';
import { EditorCanvasComponent } from './editor-canvas.component';

/** A collapsible toolbar cluster. Lower `priority` collapses into the ⋮ menu first. */
interface ToolbarGroup {
  id: string;
  priority: number;
}

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="toolbar-strip">
      <div class="toolbar-scroll" #toolbarScroll>

        <!-- Visible clusters (in display order). Each collapses into the ⋮ menu,
             lowest-priority first, when the strip runs out of width. -->
        @for (g of visibleGroups(); track g.id) {
          <div class="tb-group" [attr.data-group]="g.id">
            <ng-container [ngTemplateOutlet]="templates[g.id]"></ng-container>
            <span class="tool-divider"></span>
          </div>
        }

        <!-- Overflow (⋮): shown ONLY when at least one cluster is collapsed. It
             holds those collapsed clusters (every cluster — including color /
             video / merge tag — otherwise lives in the strip when it fits). -->
        @if (overflowGroups().length) {
          <div class="overflow-tool" #overflowTool>
            <button type="button"
              class="tool-btn"
              title="More tools"
              aria-label="More tools"
              [class.active]="overflowOpen()"
              (click)="toggleOverflow()"
            >
              <svg class="tool-ic" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
            </button>
            @if (overflowOpen()) {
              <div class="overflow-menu" role="menu">
                @for (g of overflowGroups(); track g.id) {
                  <div class="tb-group overflow-group" [attr.data-group]="g.id">
                    <ng-container [ngTemplateOutlet]="templates[g.id]"></ng-container>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- ── Collapsible cluster definitions (rendered into the strip OR the ⋮ menu) ── -->

    <ng-template #tplSource>
      <button type="button" class="tool-btn" [class.active]="state.sourceMode()" title="Source code" (click)="canvas?.toggleSourceMode()">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
        <span>Source</span>
      </button>
    </ng-template>

    <ng-template #tplLists>
      <button type="button" class="tool-btn" title="Bullet list" [class.active]="ulActive()" (click)="format('insertUnorderedList')">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.1" fill="currentColor" stroke="none"/></svg>
      </button>
      <button type="button" class="tool-btn" title="Numbered list" [class.active]="olActive()" (click)="format('insertOrderedList')">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-1.3 2-2.3S5 14 4 14.4"/></svg>
      </button>
      <button type="button" class="tool-btn" title="Checklist" (click)="canvas?.insertChecklist()">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 2 2 4-4"/><path d="m3 17 2 2 4-4"/><line x1="13" y1="6" x2="21" y2="6"/><line x1="13" y1="18" x2="21" y2="18"/></svg>
      </button>
    </ng-template>

    <ng-template #tplAlign>
      <div class="align-tool">
        <button type="button" class="tool-btn with-caret" title="Text alignment" [class.active]="alignOpen()" (click)="toggleAlign()">
          <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
          <svg class="tool-ic caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        @if (alignOpen()) {
          <div class="align-menu" role="menu">
            <button type="button" class="tool-btn" title="Align left" (click)="applyAlign('justifyLeft')">
              <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
            </button>
            <button type="button" class="tool-btn" title="Align center" (click)="applyAlign('justifyCenter')">
              <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="5" y1="18" x2="19" y2="18"/></svg>
            </button>
            <button type="button" class="tool-btn" title="Align right" (click)="applyAlign('justifyRight')">
              <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
            </button>
            <button type="button" class="tool-btn" title="Justify" (click)="applyAlign('justifyFull')">
              <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        }
      </div>
    </ng-template>

    <ng-template #tplHistory>
      <button type="button" class="tool-btn" title="Undo" (click)="canvas?.execCommand('undo')">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H10"/></svg>
      </button>
      <button type="button" class="tool-btn" title="Redo" (click)="canvas?.execCommand('redo')">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H14"/></svg>
      </button>
    </ng-template>

    <ng-template #tplInsert>
      <button type="button" class="tool-btn" title="Insert image" (click)="imageFileInput.click()">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-4.5-4.5L6 21"/></svg>
      </button>
      <button type="button" class="tool-btn link-tool-btn" title="Insert link" [class.active]="linkActive()" (click)="canvas?.openLinkPopover($event)">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <button type="button" class="tool-btn" title="Remove link" (click)="canvas?.unlink()">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 3.5 8.5"/><line x1="8" y1="12" x2="12" y2="12"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
      </button>
      <button type="button" class="tool-btn" title="Insert table" (click)="canvas?.insertTable(2, 2)">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
      </button>
    </ng-template>

    <ng-template #tplParagraph>
      <select class="tool-select format-select" (change)="onBlockFormat($event)">
        <option value="P">Paragraph</option>
        <option value="H1">Heading 1</option>
        <option value="H2">Heading 2</option>
        <option value="H3">Heading 3</option>
        <option value="BLOCKQUOTE">Quote</option>
      </select>
    </ng-template>

    <ng-template #tplFontFamily>
      <select class="tool-select font-select" [style.font-family]="fontFamily()"
        (mousedown)="canvas?.captureMergeSelection()" (change)="onFontName($event)">
        @for (font of fontFamilies; track font.value) {
          <option [value]="font.value" [style.font-family]="font.value"
            [selected]="font.value === fontFamily()">{{ font.label }}</option>
        }
      </select>
    </ng-template>

    <ng-template #tplFontSize>
      <select class="tool-select mini-select"
        (mousedown)="canvas?.captureMergeSelection()" (change)="onFontSize($event)">
        @for (size of fontSizes; track size) {
          <option [value]="size + 'px'" [selected]="(size + 'px') === fontSize()">{{ size }}</option>
        }
      </select>
    </ng-template>

    <ng-template #tplTextFormat>
      <button type="button" class="tool-btn fmt" title="Bold" [class.active]="boldActive()" (click)="format('bold')"><strong>B</strong></button>
      <button type="button" class="tool-btn fmt" title="Italic" [class.active]="italicActive()" (click)="format('italic')"><em>I</em></button>
      <button type="button" class="tool-btn fmt" title="Underline" [class.active]="underlineActive()" (click)="format('underline')"><span class="u">U</span></button>
      <button type="button" class="tool-btn fmt" title="Strikethrough" [class.active]="strikeActive()" (click)="format('strikeThrough')"><s>S</s></button>
    </ng-template>

    <ng-template #tplColor>
      <!-- Text / highlight color. The native picker steals focus, so we wrap the
           selection on mousedown (while it's still alive), restyle it live on
           input (real-time preview as the picker is dragged), and finalize on
           change/blur. See beginColorPreview/updateColorPreview/endColorPreview. -->
      <input #textColor class="color-input" type="color" value="#1f2937" title="Text color"
             (mousedown)="canvas?.beginColorPreview('foreColor')"
             (input)="canvas?.updateColorPreview(textColor.value)"
             (change)="canvas?.endColorPreview()"
             (blur)="canvas?.endColorPreview()" />
      <input #highlightColor class="color-input" type="color" value="#fff2b2" title="Highlight color"
             (mousedown)="canvas?.beginColorPreview('hiliteColor')"
             (input)="canvas?.updateColorPreview(highlightColor.value)"
             (change)="canvas?.endColorPreview()"
             (blur)="canvas?.endColorPreview()" />
    </ng-template>

    <ng-template #tplVideo>
      <button type="button" class="tool-btn with-label" title="Insert video" (click)="videoFileInput.click()">
        <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
        <span>Video</span>
      </button>
    </ng-template>

    <ng-template #tplMerge>
      <div class="merge-tag-tool">
        <button type="button"
          class="tool-btn with-label"
          title="Insert merge tag"
          aria-label="Insert merge tag"
          [class.active]="menuOpen()"
          (click)="toggleMergeMenu()"
        >
          <span class="hash">#</span><span>Merge tag</span>
        </button>
        @if (menuOpen()) {
          <div class="merge-tag-menu" role="menu">
            <input
              #mergeSearch
              class="merge-tag-search"
              type="text"
              placeholder="Search merge tags"
              [value]="mergeQuery()"
              (input)="onMergeSearch($event)"
            />
            <div class="merge-tag-list">
              @for (tag of filteredTags(); track tag.key) {
                <button
                  type="button"
                  class="merge-tag-option"
                  role="menuitem"
                  (click)="pickMergeTag(tag.key)"
                >
                  <span class="merge-tag-badge">#</span>
                  <span class="merge-tag-option-label">{{ tag.label }}</span>
                </button>
              } @empty {
                <p class="merge-tag-empty">No matching tags</p>
              }
            </div>
          </div>
        }
      </div>
    </ng-template>

    <input #imageFileInput type="file" accept="image/*" hidden (change)="onImageFile($event)" />
    <input #videoFileInput type="file" accept="video/*" hidden (change)="onVideoFile($event)" />
  `
})
export class EditorToolbarComponent implements AfterViewInit, OnDestroy {
  readonly state = inject(EditorStateService);
  readonly mergeTags = inject(MergeTagService);
  private readonly zone = inject(NgZone);
  canvas: EditorCanvasComponent | null = null;

  /**
   * Optional uploader wired in by the host editor component. Given the image as
   * a base64 data URL (encoded once here), it uploads and resolves the hosted
   * image URL to use as the block src. When unset, images fall back to the inline
   * data URL.
   */
  uploadImage: ((imageData: string) => Promise<string>) | null = null;

  @ViewChild('mergeSearch') mergeSearchRef?: ElementRef<HTMLInputElement>;

  // ── Responsive overflow: clusters flow into the ⋮ menu instead of wrapping ──
  // The toolbar NEVER wraps to a second row (`.toolbar-scroll` is flex-nowrap).
  // A ResizeObserver measures the available width and pushes the lowest-priority
  // clusters into the overflow menu until the rest fit on one line.
  @ViewChild('toolbarScroll') toolbarScrollRef!: ElementRef<HTMLElement>;
  @ViewChild('overflowTool') overflowToolRef!: ElementRef<HTMLElement>;
  @ViewChild('tplSource') tplSource!: TemplateRef<unknown>;
  @ViewChild('tplLists') tplLists!: TemplateRef<unknown>;
  @ViewChild('tplAlign') tplAlign!: TemplateRef<unknown>;
  @ViewChild('tplHistory') tplHistory!: TemplateRef<unknown>;
  @ViewChild('tplInsert') tplInsert!: TemplateRef<unknown>;
  @ViewChild('tplParagraph') tplParagraph!: TemplateRef<unknown>;
  @ViewChild('tplFontFamily') tplFontFamily!: TemplateRef<unknown>;
  @ViewChild('tplFontSize') tplFontSize!: TemplateRef<unknown>;
  @ViewChild('tplTextFormat') tplTextFormat!: TemplateRef<unknown>;
  @ViewChild('tplColor') tplColor!: TemplateRef<unknown>;
  @ViewChild('tplVideo') tplVideo!: TemplateRef<unknown>;
  @ViewChild('tplMerge') tplMerge!: TemplateRef<unknown>;

  /** id → TemplateRef, assembled in ngAfterViewInit (used by both render slots). */
  templates: Record<string, TemplateRef<unknown>> = {};

  /**
   * Clusters in DISPLAY order. `priority` controls collapse order — the LOWEST
   * priority is the first to move into the ⋮ menu when the strip is too narrow
   * (so Bold/Italic/… and Source survive the longest).
   */
  private readonly GROUPS: ReadonlyArray<ToolbarGroup> = [
    { id: 'source',     priority: 90 },
    { id: 'lists',      priority: 70 },
    { id: 'align',      priority: 50 },
    { id: 'history',    priority: 75 },
    { id: 'insert',     priority: 60 },
    { id: 'paragraph',  priority: 40 },
    { id: 'fontFamily', priority: 30 },
    { id: 'fontSize',   priority: 25 },
    { id: 'textFormat', priority: 85 },
    // Secondary tools: shown in the strip when there's room, first to collapse.
    { id: 'color',      priority: 20 },
    { id: 'video',      priority: 15 },
    { id: 'mergeTag',   priority: 10 },
  ];

  /** ids currently collapsed into the ⋮ menu. */
  private readonly overflowIds = signal<ReadonlySet<string>>(new Set());
  readonly visibleGroups = computed(() => this.GROUPS.filter(g => !this.overflowIds().has(g.id)));
  readonly overflowGroups = computed(() => this.GROUPS.filter(g => this.overflowIds().has(g.id)));

  /** Cached natural width per cluster (stable — measured while in the strip). */
  private readonly widthCache = new Map<string, number>();
  /** Cached ⋮ button width (it's only in the DOM while something is collapsed). */
  private overflowBtnWidth = 40;
  private resizeObserver?: ResizeObserver;
  private recomputeFrame = 0;

  /** Approved font-family list (each option previews in its own face). */
  readonly fontFamilies: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'Arial, sans-serif',                  label: 'Arial' },
    { value: 'Helvetica, Arial, sans-serif',       label: 'Helvetica' },
    { value: 'Verdana, sans-serif',                label: 'Verdana' },
    { value: 'Tahoma, sans-serif',                 label: 'Tahoma' },
    { value: 'Trebuchet MS, sans-serif',           label: 'Trebuchet MS' },
    { value: 'Gill Sans, sans-serif',              label: 'Gill Sans' },
    { value: 'Lucida Sans Unicode, sans-serif',    label: 'Lucida Sans' },
    { value: 'Segoe UI, Arial, sans-serif',        label: 'Segoe UI' },
    { value: 'Geneva, sans-serif',                 label: 'Geneva' },
    { value: 'Georgia, serif',                     label: 'Georgia' },
    { value: 'Times New Roman, serif',             label: 'Times New Roman' },
    { value: 'Palatino, serif',                    label: 'Palatino' },
    { value: 'Garamond, serif',                    label: 'Garamond' },
    { value: 'Baskerville, serif',                 label: 'Baskerville' },
    { value: 'Cambria, serif',                     label: 'Cambria' },
    { value: 'Courier New, monospace',             label: 'Courier New' },
    { value: 'Lucida Console, monospace',          label: 'Lucida Console' },
    { value: 'Monaco, monospace',                  label: 'Monaco' },
    { value: 'Impact, sans-serif',                 label: 'Impact' },
    { value: 'Arial Black, sans-serif',            label: 'Arial Black' },
    { value: 'Comic Sans MS, cursive',             label: 'Comic Sans MS' },
  ];

  /** Approved font-size list (px). */
  readonly fontSizes: ReadonlyArray<number> = [
    8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56, 64, 72,
  ];

  /** Currently-selected font family (drives the <select>'s value + preview face). */
  readonly fontFamily = signal(this.fontFamilies[0].value);
  /** Currently-selected font size, e.g. '14px' (drives the size <select>'s value). */
  readonly fontSize = signal('14px');

  // Active-state of the format buttons, synced to the current selection so the
  // toolbar reflects whether the highlighted text is bold/italic/etc.
  readonly boldActive = signal(false);
  readonly italicActive = signal(false);
  readonly underlineActive = signal(false);
  readonly strikeActive = signal(false);
  readonly ulActive = signal(false);
  readonly olActive = signal(false);
  readonly linkActive = signal(false);

  readonly overflowOpen = signal(false);
  readonly alignOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly mergeQuery = signal('');
  readonly filteredTags = computed(() => {
    const query = this.mergeQuery().trim().toLowerCase();
    const all = this.mergeTags.getAll();
    if (!query) return all;
    return all.filter(t =>
      t.label.toLowerCase().includes(query) || t.key.toLowerCase().includes(query)
    );
  });

  ngAfterViewInit(): void {
    this.templates = {
      source: this.tplSource,
      lists: this.tplLists,
      align: this.tplAlign,
      history: this.tplHistory,
      insert: this.tplInsert,
      paragraph: this.tplParagraph,
      fontFamily: this.tplFontFamily,
      fontSize: this.tplFontSize,
      textFormat: this.tplTextFormat,
      color: this.tplColor,
      video: this.tplVideo,
      mergeTag: this.tplMerge,
    };
    // `templates` is a plain prop, so force ONE render (fresh Set reference
    // notifies even though the overflow set is unchanged) — that makes the
    // ngTemplateOutlets pick up the just-assigned TemplateRefs and lay the
    // clusters out at full width. THEN measure on the next frame, once that
    // layout has painted, and collapse whatever doesn't fit.
    //
    // We can't rely on the ResizeObserver alone for this first pass: it watches
    // `.toolbar-scroll`, whose box is parent-sized and `overflow:hidden`, so the
    // clusters rendering into it does NOT change its size → no RO callback. RO
    // still handles genuine width changes (offcanvas/window resize) after that.
    queueMicrotask(() => {
      this.overflowIds.set(new Set(this.overflowIds()));
      this.scheduleRecompute();
    });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleRecompute());
      this.resizeObserver.observe(this.toolbarScrollRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.recomputeFrame) cancelAnimationFrame(this.recomputeFrame);
  }

  /**
   * Measure + collapse on the next frame (so we read a settled, painted layout),
   * coalescing bursts of RO callbacks into a single pass. Runs inside the Angular
   * zone so the resulting `overflowIds` change drives change detection.
   */
  private scheduleRecompute(): void {
    if (this.recomputeFrame) cancelAnimationFrame(this.recomputeFrame);
    this.recomputeFrame = requestAnimationFrame(() => {
      this.recomputeFrame = 0;
      this.zone.run(() => this.recomputeOverflow());
    });
  }

  /**
   * Measure the clusters currently in the strip (cache their widths), then decide
   * which fit on one line — highest priority first — and push the rest into ⋮.
   * The ⋮ button is only rendered when something overflows, so its width is
   * reserved ONLY in that case (otherwise everything gets the full strip width).
   */
  private recomputeOverflow(): void {
    const scroll = this.toolbarScrollRef?.nativeElement;
    if (!scroll) return;

    // Cache natural widths of whatever is currently rendered in the strip, plus
    // the ⋮ button's width whenever it's present (it comes and goes).
    scroll.querySelectorAll<HTMLElement>(':scope > .tb-group[data-group]').forEach(el => {
      const id = el.getAttribute('data-group');
      if (id) this.widthCache.set(id, el.getBoundingClientRect().width);
    });
    const overflowBtn = this.overflowToolRef?.nativeElement;
    if (overflowBtn) this.overflowBtnWidth = overflowBtn.getBoundingClientRect().width;

    const style = getComputedStyle(scroll);
    const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const inner = scroll.clientWidth - padding - 4; // small safety buffer

    // Total width if EVERY cluster stayed in the strip (widths are all cached
    // after the first all-visible pass). If it fits, show all and hide ⋮.
    const totalWidth = this.GROUPS.reduce((sum, g) => sum + (this.widthCache.get(g.id) ?? 0) + gap, 0);

    let next: Set<string>;
    if (totalWidth <= inner) {
      next = new Set();
    } else {
      // Overflowing → the ⋮ button will show, so reserve its width. Greedily keep
      // clusters by priority (desc); once one doesn't fit, everything below its
      // priority overflows too (predictable, contiguous collapse).
      const available = inner - this.overflowBtnWidth - gap;
      const byPriority = [...this.GROUPS].sort((a, b) => b.priority - a.priority);
      const keep = new Set<string>();
      let used = 0;
      for (const g of byPriority) {
        const width = this.widthCache.get(g.id);
        if (width == null) { keep.add(g.id); continue; } // not yet measured — keep so it can be
        if (used + width + gap <= available) {
          used += width + gap;
          keep.add(g.id);
        } else {
          break;
        }
      }
      next = new Set(this.GROUPS.filter(g => !keep.has(g.id)).map(g => g.id));
    }

    // Nothing collapsed → the ⋮ disappears; make sure its menu isn't left "open"
    // so it doesn't auto-pop the next time a cluster collapses.
    if (next.size === 0 && this.overflowOpen()) this.overflowOpen.set(false);
    if (!this.setsEqual(next, this.overflowIds())) this.overflowIds.set(next);
  }

  private setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  toggleOverflow(): void {
    const opening = !this.overflowOpen();
    this.overflowOpen.set(opening);
    if (!opening) this.menuOpen.set(false);
  }

  /** Point the font/size dropdowns at the current selection's font. */
  private syncFontControls(): void {
    const family = this.canvas?.getSelectionFontFamily();
    if (family) {
      const first = this.normalizeFamily(family);
      const match = this.fontFamilies.find(f => this.normalizeFamily(f.value) === first);
      if (match) this.fontFamily.set(match.value);
    }
    const size = this.canvas?.getSelectionFontSize();
    if (size) {
      const px = parseInt(size, 10);
      const closest = this.fontSizes.reduce((a, b) => Math.abs(b - px) < Math.abs(a - px) ? b : a);
      this.fontSize.set(closest + 'px');
    }
  }

  /** First family token, lower-cased and unquoted, for fuzzy matching. */
  private normalizeFamily(value: string): string {
    return (value.split(',')[0] || '').replace(/["']/g, '').trim().toLowerCase();
  }

  toggleAlign(): void {
    this.alignOpen.update(v => !v);
  }

  applyAlign(command: string): void {
    this.canvas?.execCommand(command);
    this.alignOpen.set(false);
  }

  toggleMergeMenu(): void {
    const opening = !this.menuOpen();
    if (opening) {
      // Remember the caret (body OR subject) before the search input autofocus
      // moves focus away, so the chip inserts at the right place.
      this.canvas?.captureMergeSelection();
    }
    this.menuOpen.set(opening);
    if (opening) {
      this.mergeQuery.set('');
      setTimeout(() => this.mergeSearchRef?.nativeElement.focus());
    }
  }

  onMergeSearch(event: Event): void {
    this.mergeQuery.set((event.target as HTMLInputElement).value);
  }

  pickMergeTag(key: string): void {
    this.canvas?.insertMergeTag(key);
    this.menuOpen.set(false);
    this.overflowOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.menuOpen() && !target.closest('.merge-tag-tool')) {
      this.menuOpen.set(false);
    }
    if (this.overflowOpen() && !target.closest('.overflow-tool')) {
      this.overflowOpen.set(false);
    }
    if (this.alignOpen() && !target.closest('.align-tool')) {
      this.alignOpen.set(false);
    }
  }

  /** Run a format command, then refresh the toolbar's active states. */
  format(command: string): void {
    this.canvas?.execCommand(command);
    this.syncFormatState();
  }

  /** Keep the B/I/U/S + list buttons in sync with the current selection. */
  @HostListener('document:selectionchange')
  syncFormatState(): void {
    const el = this.canvas?.canvas;
    const sel = window.getSelection();
    // Only reflect the body selection; leave states as-is when the caret is
    // elsewhere (subject, toolbar inputs, etc.).
    if (!el || !sel || sel.rangeCount === 0) return;
    if (!el.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
    try {
      this.boldActive.set(document.queryCommandState('bold'));
      this.italicActive.set(document.queryCommandState('italic'));
      this.underlineActive.set(document.queryCommandState('underline'));
      this.strikeActive.set(document.queryCommandState('strikeThrough'));
      this.ulActive.set(document.queryCommandState('insertUnorderedList'));
      this.olActive.set(document.queryCommandState('insertOrderedList'));
    } catch { /* queryCommandState can throw if focus isn't in an editable */ }
    // No queryCommandState for links — detect by walking up to an <a> from the
    // selection (already confirmed to be inside the body canvas above).
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const anchorEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    this.linkActive.set(!!anchorEl?.closest('a'));
    // Font family/size selects now live in the main strip, so reflect the
    // current selection's font in them live (they used to sync on overflow-open).
    this.syncFontControls();
  }

  onBlockFormat(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.canvas?.execCommandWithValue('formatBlock', value);
  }

  onFontName(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.fontFamily.set(value);
    this.canvas?.applyFontFamily(value);
  }

  onFontSize(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.fontSize.set(value);
    this.canvas?.applyFontSize(value);
  }

  async onImageFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.canvas) return;

    const { EditorUtilsService } = await import('../services/editor-utils.service');
    const utils = new EditorUtilsService();

    // Measure dimensions from an object URL — no base64 needed just for the ratio.
    const objectUrl = URL.createObjectURL(file);
    const ratio = await utils.getImageRatio(objectUrl);
    URL.revokeObjectURL(objectUrl);
    const width = Math.min(420, Math.round(520 * ratio));
    const height = Math.round(width / ratio);

    // Encode the file to base64 ONCE here — it's needed both as the upload
    // payload and as the inline fallback src. Upload to the host's image API and
    // use the returned hosted URL as the src so the exported email references a
    // hosted image instead of embedding base64; on failure (or with no uploader)
    // fall back to the inline data URL we already encoded.
    const dataUrl = await utils.readFileAsDataUrl(file);
    let src = dataUrl;
    if (this.uploadImage) {
      try {
        this.state.setStatus('Uploading image…');
        src = await this.uploadImage(dataUrl);
        this.state.setStatus('Image uploaded');
      } catch {
        this.state.setStatus('Image upload failed — using inline copy');
        src = dataUrl;
      }
    }

    this.canvas.insertImageBlock({ src, alt: file.name, width, height, ratio }, true);
    input.value = '';
  }

  async onVideoFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.canvas) return;

    const { EditorUtilsService } = await import('../services/editor-utils.service');
    const utils = new EditorUtilsService();

    // Grab a real still frame from the video as its thumbnail/poster. On any
    // failure (codec the browser can't decode, etc.) fall back to the generic
    // play-button placeholder so insertion always works.
    let poster: string;
    let ratio = 16 / 9;
    try {
      this.state.setStatus('Capturing video frame…');
      const frame = await utils.captureVideoPoster(file);
      ratio = frame.ratio;
      poster = frame.poster;
      // Upload the captured frame like images so the exported email references a
      // hosted poster URL instead of a large base64 string; fall back to inline.
      if (this.uploadImage) {
        try {
          this.state.setStatus('Uploading video thumbnail…');
          poster = await this.uploadImage(poster);
          this.state.setStatus('Video thumbnail ready');
        } catch {
          this.state.setStatus('Thumbnail upload failed — using inline frame');
        }
      } else {
        this.state.setStatus('Video frame captured');
      }
    } catch {
      poster = utils.buildVideoPlaceholderSvg(file.name, 1280, 720);
      this.state.setStatus('Could not read video frame — using placeholder');
    }

    const width = 420;
    const height = Math.round(width / ratio);
    this.canvas.insertVideoBlock({
      // Both poster sources carry the play button: captured frames have it baked
      // in by captureVideoPoster, the fallback placeholder SVG draws its own.
      poster, fileName: file.name, alt: file.name, width, height, ratio, overlayBaked: true,
    }, true);
    input.value = '';
  }
}
