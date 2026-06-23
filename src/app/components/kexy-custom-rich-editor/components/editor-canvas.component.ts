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
  private dragState: {
    block: HTMLElement;
    startX: number; startY: number;
    width: number; height: number;
    ratio: number; lockAspect: boolean;
  } | null = null;
  // Native drag-and-drop reposition state. The drop lands inside `container`
  // (the canvas, or a table cell when hovering one), before/after `ref` — or at
  // the end of the container when `ref` is null.
  private draggedBlock: HTMLElement | null = null;
  private dropTarget: { container: HTMLElement; ref: HTMLElement | null; after: boolean } | null = null;

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
    this.updateDropIndicator(event.clientX, event.clientY);
  };

  private onBlockDrop = (event: DragEvent): void => {
    if (!this.draggedBlock) return;
    event.preventDefault();
    const block = this.draggedBlock;
    const target = this.dropTarget;
    this.clearDropIndicator();
    if (!target) return;
    // Never drop the block into itself or its own subtree.
    if (target.container === block || block.contains(target.container)) return;
    if (target.ref === block || (target.ref && block.contains(target.ref))) return;

    block.remove();
    if (target.ref) {
      if (target.after) target.ref.after(block);
      else target.ref.before(block);
    } else {
      target.container.appendChild(block);
    }
    this.selectBlock(block);
    this.refreshOutputs();
  };

  private onBlockDragEnd = (): void => {
    this.draggedBlock?.classList.remove('dragging');
    this.clearDropIndicator();
    this.draggedBlock = null;
    this.dropTarget = null;
  };

  /**
   * Resolve where a drop at (x,y) lands. The drop container is the table cell
   * under the cursor (so media can be dropped INTO a table), otherwise the
   * canvas. Within that container the nearest direct child decides before/after;
   * a null ref means "append to the end of the container".
   */
  private dropLocationFromPoint(x: number, y: number):
    { container: HTMLElement; ref: HTMLElement | null; after: boolean } | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el || !this.canvas.contains(el)) return null;

    // Climb to the nearest element that directly holds block-level children —
    // a table cell, list item, blockquote, or a generic <div> (e.g. the wrapper
    // execCommand puts around paragraphs) — otherwise the canvas itself. We skip
    // media blocks since we never drop INTO one. This lets a block land BETWEEN
    // <p>s even when they're nested inside a wrapper div, not just before/after it.
    let container: HTMLElement | null = el;
    while (container && container !== this.canvas) {
      if (!container.classList.contains('media-block') &&
          container.matches('td, th, li, blockquote, div')) break;
      container = container.parentElement;
    }
    if (!container) container = this.canvas;

    const ref = this.childOfContainerUnderPoint(container, x, y);
    if (ref) {
      const rect = ref.getBoundingClientRect();
      return { container, ref, after: y > rect.top + rect.height / 2 };
    }
    return { container, ref: null, after: true };
  }

  /** The direct child of `container` under the point, or null if none. */
  private childOfContainerUnderPoint(container: HTMLElement, x: number, y: number): HTMLElement | null {
    let el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el || !container.contains(el)) return null;
    while (el && el.parentElement !== container) {
      el = el.parentElement;
    }
    return el && el.parentElement === container ? el : null;
  }

  /** Show an insertion line on the hovered child and record where a drop lands. */
  private updateDropIndicator(x: number, y: number): void {
    this.clearDropIndicator();
    const loc = this.dropLocationFromPoint(x, y);
    if (!loc) { this.dropTarget = null; return; }
    // Skip if the target would be the dragged block itself / its subtree.
    if (loc.container === this.draggedBlock || (loc.ref && loc.ref === this.draggedBlock)) {
      this.dropTarget = null; return;
    }
    this.dropTarget = loc;
    if (loc.ref) {
      loc.ref.classList.add(loc.after ? 'drop-after' : 'drop-before');
    } else {
      // Dropping into an empty container (e.g. an empty cell) → outline it.
      loc.container.classList.add('drop-into');
    }
  }

  private clearDropIndicator(): void {
    this.canvas.querySelectorAll('.drop-before, .drop-after, .drop-into').forEach(el =>
      el.classList.remove('drop-before', 'drop-after', 'drop-into')
    );
  }

  get canvas(): HTMLDivElement {
    return this.canvasRef.nativeElement;
  }

  private onSelectionChange = (): void => {
    if (!this.state.sourceMode()) this.saveSelection();
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
    this.canvas.querySelectorAll('.merge-tag-chip').forEach(chip =>
      this.mergeTags.decorateChip(chip as HTMLElement),
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
    }
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

  applyLegacyFontSize(px: string): void {
    const map: Record<string, string> = {
      '12px': '2', '14px': '3', '16px': '4',
      '18px': '5', '20px': '5', '24px': '6',
    };
    this.focusEditor();
    document.execCommand('fontSize', false, map[px] || '3');
    this.utils.normalizeFontTags(this.canvas);
    this.refreshOutputs();
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
    this.focusEditor();
    const chip = this.mergeTags.createChip(key);
    // Insert via execCommand so it joins the native undo stack; the trailing
    // space gives the caret somewhere to continue typing after the chip.
    document.execCommand('insertHTML', false, chip.outerHTML + '&nbsp;');
    this.saveSelection();
    this.refreshOutputs();
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
    if (iframe) iframe.srcdoc = html;
    this.contentChanged.emit();
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
      el.contentEditable = 'false';
      el.setAttribute('draggable', 'true'); // allow drag-to-reposition in the canvas
    });
  }
}
