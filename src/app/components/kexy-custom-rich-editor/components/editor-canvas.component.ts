import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  inject, output, Input, HostListener,
} from '@angular/core';
import { EditorStateService } from '../services/editor-state.service';
import { EditorUtilsService } from '../services/editor-utils.service';
import { MergeTagService } from '../services/merge-tag.service';
import { FallbackPopoverComponent } from './fallback-popover.component';
import { InsertImageOptions, InsertVideoOptions } from '../models/editor.models';

@Component({
  selector: 'app-editor-canvas',
  standalone: true,
  imports: [FallbackPopoverComponent],
  template: `
    <div class="editor-stage mode-panel" [class.active]="state.mode() === 'design'">
      <div
        #canvas
        id="editorCanvas"
        class="editor-canvas"
        [class.hidden]="state.sourceMode()"
        contenteditable="true"
        spellcheck="true"
        (input)="onInput()"
        (mouseup)="saveSelection()"
        (keyup)="saveSelection()"
        (click)="onCanvasClick($event)"
      ></div>
      <textarea
        #sourceEditor
        class="source-editor"
        [class.hidden]="!state.sourceMode()"
        spellcheck="false"
        (input)="onSourceInput($event)"
      ></textarea>
    </div>

    <div class="preview-stage mode-panel" [class.active]="state.mode() === 'preview'">
      <iframe #previewFrame title="Email preview"></iframe>
    </div>

    <div class="mode-panel" [class.active]="state.mode() === 'html'">
      <textarea class="html-output" spellcheck="false" [value]="state.htmlOutput()" readonly></textarea>
    </div>

    <app-fallback-popover #fallbackPopover (fallbackChanged)="refreshChipIndicators()"></app-fallback-popover>
  `,
})
export class EditorCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('sourceEditor') sourceEditorRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewFrame') previewFrameRef!: ElementRef<HTMLIFrameElement>;
  @ViewChild('fallbackPopover') fallbackPopoverRef!: FallbackPopoverComponent;

  readonly contentChanged = output<void>();

  readonly state = inject(EditorStateService);
  readonly utils = inject(EditorUtilsService);
  readonly mergeTags = inject(MergeTagService);

  private savedRange: Range | null = null;

  // ── Subject line (chips share this canvas's merge-tag + fallback infra) ──
  // The subject contenteditable lives in the host editor component (above the
  // toolbar) and is registered here so the SAME toolbar merge-tag picker can
  // target it. `mergeTagTarget` decides where the picker inserts.
  subjectEl: HTMLElement | null = null;
  private mergeTagTarget: 'subject' | 'editor' = 'editor';
  private subjectSavedRange: Range | null = null;

  /** Optional uploader (wired by the host, shared with the toolbar) used to host
   *  a custom video-poster image. Falls back to an inline data URL when unset. */
  uploadImage: ((imageData: string) => Promise<string>) | null = null;

  private dragState: {
    block: HTMLElement;
    startX: number; startY: number;
    width: number; height: number;
    ratio: number; lockAspect: boolean;
  } | null = null;
  // Native drag-and-drop reposition state. The drop lands at the caret position
  // under the cursor (dropRange), so a block can be placed between <br> lines and
  // anywhere else, not just before/after block elements. dropCaretEl is the thin
  // insertion-caret indicator shown during the drag.
  private draggedBlock: HTMLElement | null = null;
  private dropRange: Range | null = null;
  private dropCaretEl: HTMLElement | null = null;

  ngAfterViewInit(): void {
    document.addEventListener('selectionchange', this.onSelectionChange);
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('click', this.onDocumentClick);
    // Delegate resize-handle drags so handles work even when a block is added
    // via insertHTML (undo/redo, source edit, paste) and has no bound listener.
    this.canvas.addEventListener('pointerdown', this.onResizePointerDown);
    // Native drag-and-drop to reposition media blocks within the canvas.
    this.canvas.addEventListener('dragstart', this.onBlockDragStart);
    this.canvas.addEventListener('dragover', this.onBlockDragOver);
    this.canvas.addEventListener('drop', this.onBlockDrop);
    this.canvas.addEventListener('dragend', this.onBlockDragEnd);
  }

  ngOnDestroy(): void {
    document.removeEventListener('selectionchange', this.onSelectionChange);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('click', this.onDocumentClick);
    this.canvas.removeEventListener('pointerdown', this.onResizePointerDown);
    this.canvas.removeEventListener('dragstart', this.onBlockDragStart);
    this.canvas.removeEventListener('dragover', this.onBlockDragOver);
    this.canvas.removeEventListener('drop', this.onBlockDrop);
    this.canvas.removeEventListener('dragend', this.onBlockDragEnd);
    this.dropCaretEl?.remove();
  }

  private onResizePointerDown = (event: PointerEvent): void => {
    if ((event.target as HTMLElement).closest('.resize-handle')) {
      this.startResizeDrag(event);
    }
  };

  // ── Drag-and-drop reposition of media blocks ──
  private onBlockDragStart = (event: DragEvent): void => {
    const target = event.target as HTMLElement;
    // Grabbing the resize handle is a resize, not a move.
    if (target.closest('.resize-handle')) { event.preventDefault(); return; }
    const block = target.closest('.media-block') as HTMLElement | null;
    if (!block || !this.canvas.contains(block)) return;
    this.draggedBlock = block;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Firefox requires data on the transfer for the drag to actually start.
      event.dataTransfer.setData('text/plain', '');
    }
    // Apply the dragging style (opacity + pointer-events:none) on the NEXT tick.
    // Mutating the dragged element synchronously inside dragstart — pointer-events
    // in particular — aborts the drag in some browsers before the drag image is
    // captured. Deferring lets the drag start, then makes the block click-through
    // so elementFromPoint can target what's underneath (e.g. table cells).
    setTimeout(() => { if (this.draggedBlock === block) block.classList.add('dragging'); });
  };

  private onBlockDragOver = (event: DragEvent): void => {
    if (!this.draggedBlock) return;
    event.preventDefault(); // required so a drop is allowed here
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.updateDropCaret(event.clientX, event.clientY);
  };

  private onBlockDrop = (event: DragEvent): void => {
    if (!this.draggedBlock) return;
    event.preventDefault();
    const original = this.draggedBlock;
    const range = this.dropRange;
    this.hideDropCaret();
    original.classList.remove('dragging');
    if (!range || !this.canvas.contains(range.startContainer)) return;
    // Never drop the block into itself / its own subtree.
    if (range.startContainer === original || original.contains(range.startContainer)) return;

    const selection = window.getSelection();
    if (!selection) return;

    // Clean HTML for the moved copy — drop transient classes; the resize handle and
    // draggable/contenteditable attrs stay in the markup so the copy is functional.
    const clone = original.cloneNode(true) as HTMLElement;
    clone.classList.remove('dragging', 'selected');
    const html = clone.outerHTML;

    const before = new Set(this.canvas.querySelectorAll('.media-block'));
    this.canvas.focus();

    // The move runs through execCommand so it lands on the browser's NATIVE undo
    // stack (direct DOM moves like range.insertNode are not undoable):
    //   1) insert the copy at the drop caret (splits the paragraph cleanly),
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('insertHTML', false, html);
    //   2) delete the original.
    const delRange = document.createRange();
    delRange.selectNode(original);
    selection.removeAllRanges();
    selection.addRange(delRange);
    document.execCommand('delete');

    // Safety net: execCommand('delete') intermittently no-ops on a contenteditable
    // =false block, which would leave the image duplicated (copy + original). If the
    // original is still attached, remove it directly so it never shows twice. (In
    // that fallback case this move isn't on the undo stack — correctness over undo.)
    if (this.canvas.contains(original)) original.remove();

    // Re-hydrate (handles/draggable) and select the moved copy.
    this.hydrateEditorBlocks();
    const moved = Array.from(this.canvas.querySelectorAll('.media-block'))
      .find(b => !before.has(b)) as HTMLElement | undefined;
    if (moved) {
      this.hoistOutOfParagraph(moved);
      this.selectBlock(moved);
    }
    this.refreshOutputs();
  };

  private onBlockDragEnd = (): void => {
    this.draggedBlock?.classList.remove('dragging');
    this.hideDropCaret();
    this.draggedBlock = null;
    this.dropRange = null;
  };

  /** Caret Range at a viewport point (cross-browser). */
  private caretRangeFromPoint(x: number, y: number): Range | null {
    const doc = document as any;
    if (typeof doc.caretRangeFromPoint === 'function') {
      return doc.caretRangeFromPoint(x, y);
    }
    if (typeof doc.caretPositionFromPoint === 'function') {
      const pos = doc.caretPositionFromPoint(x, y);
      if (!pos) return null;
      const r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.collapse(true);
      return r;
    }
    return null;
  }

  /** Track the caret under the cursor and show a thin insertion caret there. */
  private updateDropCaret(x: number, y: number): void {
    const range = this.caretRangeFromPoint(x, y);
    if (
      !range ||
      !this.canvas.contains(range.startContainer) ||
      range.startContainer === this.draggedBlock ||
      (this.draggedBlock?.contains(range.startContainer))
    ) {
      this.dropRange = null;
      this.hideDropCaret();
      return;
    }
    this.dropRange = range;
    this.showDropCaret(range);
  }

  private ensureDropCaret(): HTMLElement {
    if (!this.dropCaretEl) {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.width = '2px';
      el.style.background = '#2ea3f2';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '99999';
      el.style.display = 'none';
      document.body.appendChild(el);
      this.dropCaretEl = el;
    }
    return this.dropCaretEl;
  }

  private showDropCaret(range: Range): void {
    let rect = range.getBoundingClientRect();
    if (rect.height === 0 && rect.width === 0) {
      // A collapsed caret can yield an empty rect; fall back to its line element.
      const node = range.startContainer;
      const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null;
      const elRect = el?.getBoundingClientRect();
      if (elRect) rect = elRect;
    }
    const caret = this.ensureDropCaret();
    caret.style.display = 'block';
    caret.style.left = `${rect.left}px`;
    caret.style.top = `${rect.top}px`;
    caret.style.height = `${rect.height || 18}px`;
  }

  private hideDropCaret(): void {
    if (this.dropCaretEl) this.dropCaretEl.style.display = 'none';
  }

  /**
   * After a caret insert, if the block landed at the very start or end of a
   * paragraph/heading, move it OUT as a sibling so we don't nest a block inside a
   * <p>. Interior inserts (e.g. between two <br> lines) are left in place.
   */
  private hoistOutOfParagraph(block: HTMLElement): void {
    const parent = block.parentElement;
    if (!parent || parent === this.canvas) return;
    if (/^(P|H1|H2|H3|H4|H5|H6)$/.test(parent.tagName)) {
      if (!block.previousSibling) parent.before(block);
      else if (!block.nextSibling) parent.after(block);
    }
  }

  get canvas(): HTMLDivElement {
    return this.canvasRef.nativeElement;
  }

  private onSelectionChange = (): void => {
    if (this.state.sourceMode()) return;
    this.saveSelection();
    this.saveSubjectSelection();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragState) return;
    const dx = event.clientX - this.dragState.startX;
    const dy = event.clientY - this.dragState.startY;
    let width = this.utils.clamp(Math.round(this.dragState.width + dx), 40, 640);
    let height = this.utils.clamp(Math.round(this.dragState.height + dy), 40, 640);
    if (this.dragState.lockAspect) height = Math.round(width / this.dragState.ratio);
    this.applyBlockSize(this.dragState.block, width, height);
    // Mirror original: update inspector inputs live while dragging
    this.state.triggerInspectorRefresh();
    this.refreshOutputs();
  };

  private onPointerUp = (): void => {
    this.dragState = null;
  };

  private onDocumentClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (!target.closest('.media-block, .media-inspector, .toolbar-strip, .tab-row, .editor-card')) {
      this.selectBlock(null);
    }
    // Dismiss the fallback popover when clicking outside it (and not on a chip)
    if (
      this.fallbackPopoverRef?.visible() &&
      !target.closest('.fallback-popover') &&
      !target.closest('.merge-tag-chip')
    ) {
      this.fallbackPopoverRef.hide();
    }
  };

  onInput(): void {
    this.refreshOutputs();
  }

  onCanvasClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Clicking in the body makes the body the merge-tag insertion target
    this.mergeTagTarget = 'editor';

    // A merge-tag chip opens the fallback popover anchored beneath it
    const chip = target.closest('.merge-tag-chip') as HTMLElement | null;
    if (chip) {
      const key = chip.dataset['mergeKey'] || '';
      this.fallbackPopoverRef.show(chip, key, chip.getBoundingClientRect());
      return;
    }

    const block = target.closest('.media-block') as HTMLElement | null;
    if (block) {
      this.selectBlock(block);
      return;
    }
    this.selectBlock(null);
  }

  /** Re-sync every chip's "fallback set" marker after a fallback changes. */
  refreshChipIndicators(): void {
    const roots: HTMLElement[] = [this.canvas];
    if (this.subjectEl) roots.push(this.subjectEl);
    roots.forEach(root =>
      root.querySelectorAll('.merge-tag-chip').forEach(chip =>
        this.mergeTags.decorateChip(chip as HTMLElement),
      ),
    );
    this.refreshOutputs();
  }

  onSourceInput(event: Event): void {
    if (!this.state.sourceMode()) return;
    const textarea = event.target as HTMLTextAreaElement;
    this.canvas.innerHTML = textarea.value;
    this.hydrateEditorBlocks();
    this.refreshOutputs();
  }

  saveSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (this.canvas.contains(range.commonAncestorContainer)) {
      this.savedRange = range.cloneRange();
      // Caret is in the body → body is the merge-tag target
      this.mergeTagTarget = 'editor';
    }
  }

  /** The element holding the current selection/caret inside the body (or null). */
  private selectionAnchorEl(): HTMLElement | null {
    const sel = window.getSelection();
    const range = (sel && sel.rangeCount && this.canvas.contains(sel.getRangeAt(0).commonAncestorContainer))
      ? sel.getRangeAt(0)
      : this.savedRange;
    if (!range || !this.canvas.contains(range.commonAncestorContainer)) return null;
    const node = range.commonAncestorContainer;
    return node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
  }

  /** Computed font-family of the current selection (for toolbar sync), or null. */
  getSelectionFontFamily(): string | null {
    const el = this.selectionAnchorEl();
    return el ? getComputedStyle(el).fontFamily : null;
  }

  /** Computed font-size in px of the current selection (for toolbar sync), or null. */
  getSelectionFontSize(): string | null {
    const el = this.selectionAnchorEl();
    if (!el) return null;
    return `${Math.round(parseFloat(getComputedStyle(el).fontSize || '14'))}px`;
  }

  focusEditor(): void {
    this.restoreSelection();
    this.canvas.focus();
  }

  private restoreSelection(): void {
    if (!this.savedRange) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(this.savedRange);
  }

  execCommand(cmd: string): void {
    if (this.state.sourceMode()) return;
    this.focusEditor();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, undefined);
    this.refreshOutputs();
  }

  execCommandWithValue(cmd: string, value: string): void {
    if (this.state.sourceMode()) return;
    this.focusEditor();
    document.execCommand(cmd, false, value);
    this.refreshOutputs();
  }

  // ----- Live color preview (text & highlight color pickers) -----
  // The native <input type="color"> steals focus the moment it opens, which
  // collapses the contenteditable selection — so execCommand can't apply the
  // color live and the highlight is lost. Instead we wrap the selection in a span
  // we own (on the input's mousedown, while the selection is still alive) and then
  // restyle THAT span directly on every `input` tick. Direct DOM styling needs no
  // focus, so the selected text recolors in real time as the picker is dragged.
  private colorPreviewSpan: HTMLElement | null = null;
  private colorPreviewProp: 'color' | 'background-color' = 'color';

  /** mousedown on a color input: wrap the live selection so we can restyle it. */
  beginColorPreview(cmd: 'foreColor' | 'hiliteColor'): void {
    this.colorPreviewSpan = null;
    if (this.state.sourceMode()) return;
    this.colorPreviewProp = cmd === 'hiliteColor' ? 'background-color' : 'color';
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed || !this.canvas.contains(range.commonAncestorContainer)) return;

    const span = document.createElement('span');
    span.className = 'color-preview';
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
    this.colorPreviewSpan = span;

    // Keep the editor selection over the new span (its `.color-preview` class
    // shows a selection-like highlight while the native picker hides the real one).
    const r = document.createRange();
    r.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(r);
    this.savedRange = r.cloneRange();
  }

  /** input on a color input: restyle the wrapped span live (no focus needed). */
  updateColorPreview(value: string): void {
    const span = this.colorPreviewSpan;
    if (!span) return;
    span.style.setProperty(this.colorPreviewProp, value, 'important');
    // Text color must also hit any link in/around the selection, else the anchor's
    // own color overrides the span (see inlineEmailStyles' matching export rule).
    if (this.colorPreviewProp === 'color') {
      span.querySelectorAll('a').forEach((a) => (a as HTMLElement).style.setProperty('color', value, 'important'));
      const anchor = span.closest('a') as HTMLElement | null;
      if (anchor) anchor.style.setProperty('color', value, 'important');
    }
  }

  /** change/blur on a color input: finalize (commit color, or unwrap if none). */
  endColorPreview(): void {
    const span = this.colorPreviewSpan;
    this.colorPreviewSpan = null;
    if (!span || !span.isConnected) { this.refreshOutputs(); return; }
    span.classList.remove('color-preview');
    // No color was ever applied (picker opened then dismissed) → unwrap so we don't
    // leave an empty span behind.
    if (!span.style.color && !span.style.backgroundColor) {
      const parent = span.parentNode;
      while (span.firstChild) parent?.insertBefore(span.firstChild, span);
      parent?.removeChild(span);
      this.refreshOutputs();
      return;
    }
    // Keep the word visually selected after the picker closes.
    const selection = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(span);
    selection?.removeAllRanges();
    selection?.addRange(r);
    this.savedRange = r.cloneRange();
    this.refreshOutputs();
  }

  /**
   * Apply a font size in real px. execCommand('fontSize') only accepts the
   * legacy 1–7 scale, which can't represent arbitrary px (8, 9, 32, 48, 72…),
   * so we wrap the selection in an inline-styled <span> like the approved build.
   */
  applyFontSize(px: string): void {
    this.applyInlineTextStyle({ 'font-size': px });
  }

  /**
   * Apply a font family to the selection. NOT execCommand('fontName') — that
   * emits a `<font face>` attribute (weakest priority) which the host app's
   * global `font-family: ... !important` reset overrides, so picked fonts never
   * showed. An inline `!important` declaration (written by applyInlineTextStyle)
   * beats a selector `!important`, so the chosen font wins.
   */
  applyFontFamily(family: string): void {
    this.applyInlineTextStyle({ 'font-family': family });
  }

  /**
   * Wrap the current (non-collapsed) selection in a <span> carrying the given
   * inline styles. Supports any px value; collapses redundant nested spans.
   * Styles are written with `!important` so they survive host global resets
   * (e.g. `* { font-family: "Lato" !important }`). Mirrors the approved build.
   * Keys must be CSS property names (kebab-case), e.g. 'font-family'.
   */
  applyInlineTextStyle(styleMap: Record<string, string>): void {
    if (this.state.sourceMode()) return;
    this.focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed || !this.canvas.contains(range.commonAncestorContainer)) return;

    const span = document.createElement('span');
    Object.entries(styleMap).forEach(([prop, value]) => {
      span.style.setProperty(prop, value, 'important');
    });
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
    this.normalizeStyledSpans();

    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    this.savedRange = nextRange.cloneRange();
    this.refreshOutputs();
  }

  /** Collapse a span that wraps exactly one child span, merging their styles. */
  private normalizeStyledSpans(): void {
    this.canvas.querySelectorAll('span').forEach((span) => {
      if (!span.parentElement || span.classList.contains('merge-tag-chip')) return;
      const only = span.childNodes.length === 1 ? span.firstChild : null;
      if (only && only.nodeType === Node.ELEMENT_NODE && (only as HTMLElement).tagName === 'SPAN') {
        const child = only as HTMLElement;
        const merged = `${child.getAttribute('style') || ''};${span.getAttribute('style') || ''}`;
        child.setAttribute('style', merged.replace(/^;+|;+$/g, ''));
        span.replaceWith(child);
      }
    });
  }

  insertLink(): void {
    if (this.state.sourceMode()) return;
    const url = window.prompt('Link URL', 'https://');
    if (!url) return;
    this.focusEditor();
    document.execCommand('createLink', false, url);
    this.refreshOutputs();
  }

  unlink(): void {
    if (this.state.sourceMode()) return;
    this.focusEditor();
    document.execCommand('unlink', false, undefined);
    this.refreshOutputs();
  }

  /** Insert a merge-tag chip at the current caret position in the canvas. */
  insertMergeTag(key: string): void {
    if (this.state.sourceMode()) return;
    // Route to whichever field the user last interacted with
    if (this.mergeTagTarget === 'subject' && this.subjectEl) {
      this.insertMergeTagIntoSubject(key);
      return;
    }
    this.focusEditor();
    this.insertChipUndoable(this.mergeTags.createChip(key));
    this.saveSelection();
    this.refreshOutputs();
  }

  /**
   * Insert a merge-tag chip at the caret — INLINE and UNDOABLE.
   *
   * execCommand('insertHTML', chip) is undoable but promotes the chip to a NEW
   * LINE when the caret is at the END of a paragraph (a contenteditable=false
   * element inserted at a block boundary). The fix: first insertText a space —
   * plain text never promotes, so it lands inline and guarantees the caret is now
   * INSIDE a text node — then step the caret back before that space and
   * insertHTML the chip there. Both steps go through execCommand, so Undo/Redo
   * still work. Acts on whatever contenteditable currently holds the caret.
   */
  private insertChipUndoable(chip: HTMLElement): void {
    // 1) trailing-space anchor (inline, undoable, never promotes to a new block)
    document.execCommand('insertText', false, ' ');
    // 2) caret is now AFTER that space — step back so the chip lands before it
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0);
      if (r.startOffset > 0) {
        r.setStart(r.startContainer, r.startOffset - 1);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
    // 3) insert the chip inline (caret is inside a text node now → no promotion)
    document.execCommand('insertHTML', false, chip.outerHTML);
  }

  // ── Subject-line API (used by the host editor component + toolbar) ──

  /** Register the subject contenteditable so merge tags can target it. */
  registerSubject(el: HTMLElement): void {
    this.subjectEl = el;
  }

  /** Mark the subject as the active merge-tag target and remember its caret. */
  handleSubjectSelect(): void {
    this.mergeTagTarget = 'subject';
    this.saveSubjectSelection();
  }

  /** Subject click: set target, and open the fallback popover if a chip was hit. */
  onSubjectClick(event: MouseEvent): void {
    this.handleSubjectSelect();
    const chip = (event.target as HTMLElement).closest('.merge-tag-chip') as HTMLElement | null;
    if (chip) {
      const tagKey = chip.dataset['mergeKey'] || '';
      this.fallbackPopoverRef.show(chip, tagKey, chip.getBoundingClientRect());
    }
  }

  private saveSubjectSelection(): void {
    if (!this.subjectEl) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (this.subjectEl.contains(range.commonAncestorContainer)) {
      this.subjectSavedRange = range.cloneRange();
      // Caret is in the subject → subject is the merge-tag target
      this.mergeTagTarget = 'subject';
    }
  }

  private restoreSubjectSelection(): void {
    const selection = window.getSelection();
    if (!selection) return;
    if (this.subjectSavedRange) {
      selection.removeAllRanges();
      selection.addRange(this.subjectSavedRange);
    }
  }

  /** Called by the toolbar right before the merge picker steals focus, so the
   *  subject's caret survives the picker's search-input autofocus. */
  captureMergeSelection(): void {
    if (this.mergeTagTarget === 'subject') this.saveSubjectSelection();
    else this.saveSelection();
  }

  private insertMergeTagIntoSubject(key: string): void {
    if (!this.subjectEl) return;
    // Snapshot the caret BEFORE focusing: subjectEl.focus() fires the subject's
    // (focus) handler synchronously, which calls saveSubjectSelection() and
    // would overwrite subjectSavedRange with the browser's default caret (start
    // of the field). Restoring from this local clone keeps the real position.
    const saved = this.subjectSavedRange ? this.subjectSavedRange.cloneRange() : null;
    this.subjectEl.focus();
    if (saved) {
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(saved); }
    }
    // Same inline + undoable insert as the body (acts on the focused subject)
    this.insertChipUndoable(this.mergeTags.createChip(key));
    this.saveSubjectSelection();
    this.refreshOutputs();
  }

  /** Render typed [tags] in the subject into chips (on load / blur). */
  hydrateSubjectChips(): void {
    if (this.subjectEl) this.mergeTags.renderChipsInElement(this.subjectEl);
  }

  /** Replace the subject content from raw text (tokens become chips). */
  setSubjectContent(raw: string): void {
    if (!this.subjectEl) return;
    this.subjectEl.textContent = raw ?? '';
    this.mergeTags.renderChipsInElement(this.subjectEl);
  }

  /** Serialize the subject to a plain string with raw [tokens] (for save/export). */
  serializeSubjectRaw(): string {
    if (!this.subjectEl) return '';
    const clone = this.subjectEl.cloneNode(true) as HTMLElement;
    this.mergeTags.stripChipsToRaw(clone);
    return (clone.textContent || '').replace(/\u00a0/g, ' ').trim();
  }

  /** Toggle a checklist (an unordered list rendered with checkbox markers). */
  insertChecklist(): void {
    if (this.state.sourceMode()) return;
    this.focusEditor();
    document.execCommand('insertUnorderedList');
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const node = selection.getRangeAt(0).commonAncestorContainer;
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
      const list = el?.closest('ul');
      if (list) list.classList.add('kx-checklist');
    }
    this.refreshOutputs();
  }

  insertTable(rows: number, cols: number): void {
    if (this.state.sourceMode()) return;
    this.focusEditor();

    // Build the table as an HTML string and insert it via execCommand so the
    // insertion is recorded on the browser's native undo stack (direct DOM
    // mutations are not undoable).
    let html = '<table>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        const tag = r === 0 ? 'th' : 'td';
        const text = r === 0 ? `Heading ${c + 1}` : `Value ${r}.${c + 1}`;
        html += `<${tag}>${text}</${tag}>`;
      }
      html += '</tr>';
    }
    html += '</table><p><br></p>';

    document.execCommand('insertHTML', false, html);
    this.refreshOutputs();
  }

  insertImageBlock(opts: InsertImageOptions, undoable = false): void {
    const block = document.createElement('div');
    block.className = 'media-block image-block align-center';
    block.contentEditable = 'false';
    block.setAttribute('draggable', 'true'); // allow drag-to-reposition in the canvas
    block.dataset['kind'] = 'image';
    block.dataset['src'] = opts.src;
    block.dataset['alt'] = opts.alt || '';
    block.dataset['link'] = '';
    block.dataset['width'] = String(opts.width);
    block.dataset['height'] = String(opts.height);
    block.dataset['ratio'] = String(opts.ratio || opts.width / opts.height || 1);
    block.dataset['lockAspect'] = 'true';
    block.dataset['align'] = 'center';
    block.style.width = `${opts.width}px`;
    block.style.height = `${opts.height}px`;

    const img = document.createElement('img');
    img.src = opts.src;
    img.alt = opts.alt || '';
    img.width = opts.width;
    img.height = opts.height;
    img.style.height = `${opts.height}px`;

    block.appendChild(img);
    block.appendChild(this.createResizeHandle());
    this.insertBlock(block, !opts.skipSpacer, undoable);
    this.refreshOutputs();
  }

  insertVideoBlock(opts: InsertVideoOptions, undoable = false): void {
    const block = document.createElement('div');
    block.className = 'media-block video-block align-center';
    block.contentEditable = 'false';
    block.setAttribute('draggable', 'true'); // allow drag-to-reposition in the canvas
    block.dataset['kind'] = 'video';
    block.dataset['poster'] = opts.poster;
    block.dataset['fileName'] = opts.fileName || 'Video';
    block.dataset['alt'] = opts.alt || opts.fileName || 'Video';
    block.dataset['link'] = '';
    block.dataset['width'] = String(opts.width);
    block.dataset['height'] = String(opts.height);
    block.dataset['ratio'] = String(opts.ratio || 16 / 9);
    block.dataset['lockAspect'] = 'true';
    block.dataset['align'] = 'center';
    // Poster already carries the play-button (captured frame / custom thumb /
    // placeholder SVG). Flag it so export keeps the baked overlay and the
    // design-only CSS `::after` overlay is suppressed (no double play button).
    if (opts.overlayBaked) {
      block.dataset['overlayBaked'] = '1';
      block.classList.add('has-baked-overlay');
    }
    block.style.width = `${opts.width}px`;
    block.style.height = `${opts.height + 44}px`;

    const escapedPoster = this.utils.escapeAttribute(opts.poster);
    const escapedAlt = this.utils.escapeAttribute(opts.alt || opts.fileName || 'Video');
    const escapedCaption = this.utils.escapeHtml(opts.alt || opts.fileName || 'Video');

    block.innerHTML = `
      <div class="video-thumb">
        <img src="${escapedPoster}" alt="${escapedAlt}" style="height:${opts.height}px; object-fit:cover;" />
        <span class="video-thumb-badge">VIDEO</span>
      </div>
      <div class="video-caption">${escapedCaption}</div>
    `;
    block.appendChild(this.createResizeHandle());
    this.insertBlock(block, !opts.skipSpacer, undoable);
    this.refreshOutputs();
  }

  /**
   * Replace the selected video block's poster/thumbnail with a custom image
   * file. Uploads it (hosted URL in exports) via the shared uploader, falling
   * back to an inline data URL. Updates both the visible <img> and `data-poster`
   * so design, preview and export all pick up the new thumbnail.
   */
  async replaceSelectedVideoPoster(file: File): Promise<void> {
    const block = this.state.selectedBlock();
    if (!block || !file || this.state.isImageBlock(block)) return;

    const dataUrl = await this.utils.readFileAsDataUrl(file);
    // Bake the play-button into the chosen thumbnail (local file → untainted
    // canvas) so the play icon survives export → preview → the inbox.
    const baked = await this.utils.compositePlayButton(dataUrl);
    let src = baked;
    if (this.uploadImage) {
      try {
        this.state.setStatus('Uploading thumbnail…');
        src = await this.uploadImage(baked);
        this.state.setStatus('Thumbnail updated');
      } catch {
        this.state.setStatus('Thumbnail upload failed — using inline image');
        src = baked;
      }
    }
    block.dataset['poster'] = src;
    block.dataset['overlayBaked'] = '1';
    block.classList.add('has-baked-overlay');
    const img = block.querySelector('.video-thumb img') as HTMLImageElement | null;
    if (img) img.src = src;
    this.refreshOutputs();
  }

  selectBlock(block: HTMLElement | null): void {
    const current = this.state.selectedBlock();
    if (current) current.classList.remove('selected');
    this.state.setSelectedBlock(block);
    if (block) block.classList.add('selected');
  }

  applyAlignment(align: 'left' | 'center' | 'right'): void {
    const block = this.state.selectedBlock();
    if (!block) return;
    block.classList.remove('align-left', 'align-center', 'align-right');
    block.classList.add(`align-${align}`);
    block.dataset['align'] = align;
    this.refreshOutputs();
  }

  applyBlockSize(block: HTMLElement, width: number, height: number): void {
    block.dataset['width'] = String(width);
    block.dataset['height'] = String(height);
    block.style.width = `${width}px`;
    const isImg = this.state.isImageBlock(block);
    if (isImg) {
      block.style.height = `${height}px`;
      const img = block.querySelector('img') as HTMLImageElement;
      if (img) {
        img.width = width;
        img.height = height;
        img.style.height = `${height}px`;
      }
    } else {
      block.style.height = `${height + 44}px`;
      const img = block.querySelector('img') as HTMLImageElement;
      if (img) img.style.height = `${height}px`;
    }
  }

  resizeFromInputs(opts: { width?: number; height?: number; userChangedHeight?: boolean }): void {
    const block = this.state.selectedBlock();
    if (!block) return;
    const ratio = Number(block.dataset['ratio']) || 1;
    const lock = block.dataset['lockAspect'] !== 'false';
    let nextWidth = this.utils.clamp(opts.width || Number(block.dataset['width']), 40, 640);
    let nextHeight = this.utils.clamp(opts.height || Number(block.dataset['height']), 40, 640);
    if (lock && opts.userChangedHeight) nextWidth = Math.round(nextHeight * ratio);
    if (lock && !opts.userChangedHeight) nextHeight = Math.round(nextWidth / ratio);
    this.applyBlockSize(block, nextWidth, nextHeight);
    this.state.triggerInspectorRefresh();
    this.refreshOutputs();
  }

  setLockAspect(lock: boolean): void {
    const block = this.state.selectedBlock();
    if (!block) return;
    block.dataset['lockAspect'] = String(lock);
  }

  updateBlockAlt(value: string): void {
    const block = this.state.selectedBlock();
    if (!block) return;
    block.dataset['alt'] = value;
    if (this.state.isImageBlock(block)) {
      const img = block.querySelector('img');
      if (img) img.alt = value;
    } else {
      const caption = block.querySelector('.video-caption');
      if (caption) caption.textContent = value || block.dataset['fileName'] || 'Video';
    }
    this.refreshOutputs();
  }

  updateBlockLink(value: string): void {
    const block = this.state.selectedBlock();
    if (!block) return;
    block.dataset['link'] = value.trim();
    this.refreshOutputs();
  }

  removeSelectedBlock(): void {
    const block = this.state.selectedBlock();
    if (!block) return;
    this.selectBlock(null);
    block.remove();
    this.refreshOutputs();
  }

  toggleSourceMode(): void {
    if(this.state.mode() === 'html') {
      this.state.setMode('design');
    } else {
      this.state.setMode('html');
    }


    this.refreshOutputs();
    // return;
    // const entering = !this.state.sourceMode();
    // this.state.toggleSourceMode();
    // if (entering) {
    //   // Show raw [tag] text in the source view rather than chip markup
    //   this.mergeTags.stripChipsToRaw(this.canvas);
    //   setTimeout(() => {
    //     this.sourceEditorRef.nativeElement.value = this.canvas.innerHTML;
    //   });
    // } else {
    //   this.canvas.innerHTML = this.sourceEditorRef.nativeElement.value;
    //   this.hydrateEditorBlocks();
    //   this.mergeTags.renderChipsInElement(this.canvas);
    //   this.refreshOutputs();
    // }
  }

  /**
   * Replace the editor content with arbitrary HTML supplied by a host
   * component. Hydrates media blocks, renders [merge_tags] as chips and
   * refreshes the preview/HTML outputs.
   */
  setContent(html: string): void {
    this.canvas.innerHTML = html ?? '';
    this.hydrateEditorBlocks();
    this.mergeTags.renderChipsInElement(this.canvas);
    this.selectBlock(null);
    if (this.state.sourceMode()) {
      this.sourceEditorRef.nativeElement.value = this.canvas.innerHTML;
    }
    this.refreshOutputs();
    // Loaded content can contain videos saved BEFORE the play-button was baked
    // into posters — their thumbnails have no play icon in preview/email. Bake
    // it in now (best-effort) so existing campaigns get the icon too.
    void this.bakeOverlayOnLoadedVideos();
  }

  /**
   * Best-effort upgrade for videos loaded from saved content whose poster has no
   * baked-in play button (`data-overlay-baked` missing). Composites the badge
   * onto the existing poster and, when an uploader is wired, re-hosts it so the
   * play icon also survives in the sent email (data: URIs are blocked by some
   * clients). Cross-origin posters without CORS taint the canvas — those are
   * left unchanged (compositePlayButton returns the original). SVG posters are
   * skipped (placeholders already draw their own play button).
   */
  private async bakeOverlayOnLoadedVideos(): Promise<void> {
    const blocks = Array.from(this.canvas.querySelectorAll('.video-block')) as HTMLElement[];
    for (const el of blocks) {
      if (el.dataset['overlayBaked'] === '1') continue;
      const img = el.querySelector('.video-thumb img') as HTMLImageElement | null;
      const poster = el.dataset['poster'] || img?.src || '';
      if (!poster || /^data:image\/svg/i.test(poster)) continue;

      const baked = await this.utils.compositePlayButton(poster);
      if (baked === poster) continue; // taint/load failure — leave as-is

      let src = baked;
      if (this.uploadImage) {
        try { src = await this.uploadImage(baked); } catch { src = baked; }
      }
      el.dataset['poster'] = src;
      el.dataset['overlayBaked'] = '1';
      el.classList.add('has-baked-overlay');
      if (img) img.src = src;
      this.refreshOutputs();
    }
  }

  loadSample(imageSvg: string, videoSvg: string): void {
    this.canvas.innerHTML = `
      <p>Hi [receiver_first_name],</p>
      <p>I came across your request for life insurance information and wanted to reach out personally.</p>
      <p>If you are still considering coverage, I would be happy to help. As an independent brokerage, we work with a range of leading insurance providers to help you find the right coverage at the lowest available rate.</p>
      <p>If life insurance is still on your to-do list, reply to this email with the best number to reach you, and I will give you a quick call to discuss your options.</p>
    `;
    this.insertImageBlock({
      src: imageSvg,
      alt: 'Uploaded image',
      width: 360,
      height: 203,
      ratio: 1200 / 675,
      skipSpacer: true,
    });
    this.insertVideoBlock({
      poster: videoSvg,
      fileName: 'Video placeholder',
      alt: 'Video placeholder',
      width: 360,
      height: 203,
      ratio: 16 / 9,
      skipSpacer: true,
      overlayBaked: true, // placeholder SVG already contains the play button
    });
    this.canvas.insertAdjacentHTML('beforeend', '<p>Best regards,<br />Karen Mening</p>');
    this.mergeTags.renderChipsInElement(this.canvas);
    this.selectBlock(null);
    this.refreshOutputs();
  }

  generateEmailHtml(subject: string): string {
    const clone = this.canvas.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
    clone.querySelectorAll('.resize-handle').forEach(n => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    // Chips are a design-time affordance — export the raw [tag] text instead
    this.mergeTags.stripChipsToRaw(clone);
    this.utils.normalizeFontTags(clone);
    this.utils.inlineEmailStyles(clone);
    this.utils.transformMediaBlocks(
      clone,
      (v) => this.utils.escapeHtml(v),
      (v) => this.utils.escapeAttribute(v),
    );
    const body = clone.innerHTML.trim() || '<p>&nbsp;</p>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.utils.escapeHtml(subject || 'Email')}</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse; background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:600px; border-collapse:collapse; background:#ffffff; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
          <tr>
            <td style="padding:24px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#1f2937;">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Return the editor's raw, re-editable HTML: media blocks stay as editable
   * `.media-block` divs (with their data-* attributes) and merge tags as raw
   * `[tags]` — no inline-style email shell. This is what should be persisted
   * and fed back through setContent() to keep editing later.
   */
  getRawHtml(): string {
    const clone = this.canvas.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
    clone.querySelectorAll('.resize-handle').forEach(n => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    this.mergeTags.stripChipsToRaw(clone);
    return clone.innerHTML.trim();
  }

  refreshOutputs(): void {
    this.utils.normalizeFontTags(this.canvas);
    if (this.state.sourceMode()) {
      this.sourceEditorRef.nativeElement.value = this.canvas.innerHTML;
    }
    const html = this.generateEmailHtml(this.state.subject());
    this.state.setHtmlOutput(html);
    const iframe = this.previewFrameRef?.nativeElement;
    if (iframe) iframe.srcdoc = this.withPreviewLinkTarget(html);
    this.contentChanged.emit();
  }

  /**
   * Preview-only: force links to open in the user's browser (a new tab) rather
   * than navigating the preview <iframe> itself. Loading a link in-frame fails
   * for most sites ("refused to connect") because they send X-Frame-Options /
   * frame-ancestors CSP that block being framed. Injecting `<base target="_blank">`
   * makes every anchor open externally. This is applied ONLY to the iframe srcdoc
   * — the exported / HTML-source output (generateEmailHtml) is left untouched.
   */
  private withPreviewLinkTarget(html: string): string {
    const base = '<base target="_blank" rel="noopener noreferrer" />';
    return html.includes('<head>')
      ? html.replace('<head>', `<head>\n  ${base}`)
      : `${base}${html}`;
  }

  private createResizeHandle(): HTMLDivElement {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    // Drag is wired via delegation in onResizePointerDown (no per-handle listener),
    // so the handle survives insertHTML / undo-redo / source round-trips.
    return handle;
  }

  private startResizeDrag(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const block = (event.target as HTMLElement).closest('.media-block') as HTMLElement | null;
    if (!block) return;
    this.selectBlock(block);
    this.dragState = {
      block,
      startX: event.clientX,
      startY: event.clientY,
      width: Number(block.dataset['width']),
      height: Number(block.dataset['height']),
      ratio: Number(block.dataset['ratio']) || 1,
      lockAspect: block.dataset['lockAspect'] !== 'false',
    };
  }

  /**
   * Insert a media block. For interactive (toolbar) inserts pass undoable=true:
   * the block is added via execCommand('insertHTML') so it lands on the native
   * undo stack. Resize handles still work because drags are delegated. For
   * programmatic inserts (sample loading) it appends directly.
   */
  private insertBlock(block: HTMLElement, addSpacer: boolean, undoable: boolean): void {
    if (undoable) {
      this.focusEditor();
      const before = new Set(Array.from(this.canvas.querySelectorAll('.media-block')));
      const spacer = addSpacer ? '<p><br></p>' : '';
      document.execCommand('insertHTML', false, block.outerHTML + spacer);
      const inserted = Array.from(this.canvas.querySelectorAll('.media-block'))
        .find(b => !before.has(b)) as HTMLElement | undefined;
      this.selectBlock(inserted ?? null);
    } else {
      this.insertNodeAtCaret(block, addSpacer);
      this.selectBlock(block);
    }
  }

  private insertNodeAtCaret(node: HTMLElement, addSpacer = true): void {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(node);
    if (addSpacer) {
      const p = document.createElement('p');
      p.innerHTML = '<br />';
      fragment.appendChild(p);
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && this.canvas.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      const range = selection.getRangeAt(0);
      const anchorChild = this.getDirectEditorChild(range.startContainer);
      if (anchorChild) anchorChild.after(fragment);
      else this.canvas.appendChild(fragment);
    } else {
      this.canvas.appendChild(fragment);
    }
  }

  private getDirectEditorChild(node: Node | null): Element | null {
    let current: Node | null = node?.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    while (current && current.parentNode && current.parentNode !== this.canvas) {
      current = current.parentNode;
    }
    return current && current.parentNode === this.canvas ? current as Element : null;
  }

  private hydrateEditorBlocks(): void {
    this.canvas.querySelectorAll('.media-block').forEach((block) => {
      const el = block as HTMLElement;
      if (!el.querySelector('.resize-handle')) el.appendChild(this.createResizeHandle());
      if (!el.dataset['align']) el.dataset['align'] = 'center';
      el.classList.add(`align-${el.dataset['align']}`);
      // Restore the baked-overlay state persisted in the saved HTML so the
      // design-only CSS overlay stays suppressed for posters that already carry
      // the play button.
      if (el.dataset['overlayBaked'] === '1') el.classList.add('has-baked-overlay');
      el.contentEditable = 'false';
      el.setAttribute('draggable', 'true'); // allow drag-to-reposition in the canvas
    });
  }
}
