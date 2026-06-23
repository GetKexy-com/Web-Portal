import {
  Component, inject, signal, computed, HostListener, ViewChild, ElementRef
} from '@angular/core';
import { EditorStateService } from '../services/editor-state.service';
import { MergeTagService } from '../services/merge-tag.service';
import { EditorCanvasComponent } from './editor-canvas.component';

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  template: `
    <div class="toolbar-strip">
      <div class="toolbar-scroll">

        <!-- Source -->
        <button type="button" class="tool-btn" [class.active]="state.sourceMode()" title="Source code" (click)="canvas?.toggleSourceMode()">
          <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
          <span>Source</span>
        </button>

        <span class="tool-divider"></span>

        <!-- Lists -->
        <button type="button" class="tool-btn" title="Bullet list" [class.active]="ulActive()" (click)="format('insertUnorderedList')">
          <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.1" fill="currentColor" stroke="none"/></svg>
        </button>
        <button type="button" class="tool-btn" title="Numbered list" [class.active]="olActive()" (click)="format('insertOrderedList')">
          <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-1.3 2-2.3S5 14 4 14.4"/></svg>
        </button>
        <button type="button" class="tool-btn" title="Checklist" (click)="canvas?.insertChecklist()">
          <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 2 2 4-4"/><path d="m3 17 2 2 4-4"/><line x1="13" y1="6" x2="21" y2="6"/><line x1="13" y1="18" x2="21" y2="18"/></svg>
        </button>

        <span class="tool-divider"></span>

        <!-- Undo / Redo -->
        <button type="button" class="tool-btn" title="Undo" (click)="canvas?.execCommand('undo')">
          <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H10"/></svg>
        </button>
        <button type="button" class="tool-btn" title="Redo" (click)="canvas?.execCommand('redo')">
          <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H14"/></svg>
        </button>

        <span class="tool-divider"></span>

        <!-- Insert -->
        <button type="button" class="tool-btn" title="Insert image" (click)="imageFileInput.click()">
          <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-4.5-4.5L6 21"/></svg>
        </button>
        <button type="button" class="tool-btn" title="Insert link" (click)="canvas?.insertLink()">
          <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </button>

        <span class="tool-divider"></span>

        <!-- Paragraph format -->
        <select class="tool-select format-select" (change)="onBlockFormat($event)">
          <option value="P">Paragraph</option>
          <option value="H1">Heading 1</option>
          <option value="H2">Heading 2</option>
          <option value="H3">Heading 3</option>
          <option value="BLOCKQUOTE">Quote</option>
        </select>

        <span class="tool-divider"></span>

        <!-- Text format -->
        <button type="button" class="tool-btn fmt" title="Bold" [class.active]="boldActive()" (click)="format('bold')"><strong>B</strong></button>
        <button type="button" class="tool-btn fmt" title="Italic" [class.active]="italicActive()" (click)="format('italic')"><em>I</em></button>
        <button type="button" class="tool-btn fmt" title="Underline" [class.active]="underlineActive()" (click)="format('underline')"><span class="u">U</span></button>
        <button type="button" class="tool-btn fmt" title="Strikethrough" [class.active]="strikeActive()" (click)="format('strikeThrough')"><s>S</s></button>

        <span class="tool-divider"></span>

        <!-- Alignment dropdown -->
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

        <span class="tool-divider spacer"></span>

        <!-- Overflow: secondary tools collapse under the ⋮ menu -->
        <div class="overflow-tool">
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
              <select class="tool-select font-select" [style.font-family]="fontFamily()"
                (mousedown)="canvas?.captureMergeSelection()" (change)="onFontName($event)">
                @for (font of fontFamilies; track font.value) {
                  <option [value]="font.value" [style.font-family]="font.value"
                    [selected]="font.value === fontFamily()">{{ font.label }}</option>
                }
              </select>

              <select class="tool-select mini-select"
                (mousedown)="canvas?.captureMergeSelection()" (change)="onFontSize($event)">
                @for (size of fontSizes; track size) {
                  <option [value]="size + 'px'" [selected]="(size + 'px') === fontSize()">{{ size }}</option>
                }
              </select>

              <input #textColor class="color-input" type="color" value="#1f2937" title="Text color"
                (input)="canvas?.execCommandWithValue('foreColor', textColor.value)" />
              <input #highlightColor class="color-input" type="color" value="#fff2b2" title="Highlight color"
                (input)="canvas?.execCommandWithValue('hiliteColor', highlightColor.value)" />

              <button type="button" class="tool-btn" title="Insert table" (click)="canvas?.insertTable(2, 2)">
                <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
              </button>
              <button type="button" class="tool-btn" title="Remove link" (click)="canvas?.unlink()">
                <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 3.5 8.5"/><line x1="8" y1="12" x2="12" y2="12"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              </button>
              <button type="button" class="tool-btn with-label" title="Insert video" (click)="videoFileInput.click()">
                <svg class="tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
                <span>Video</span>
              </button>

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
            </div>
          }
        </div>
      </div>
    </div>

    <input #imageFileInput type="file" accept="image/*" hidden (change)="onImageFile($event)" />
    <input #videoFileInput type="file" accept="video/*" hidden (change)="onVideoFile($event)" />
  `
})
export class EditorToolbarComponent {
  readonly state = inject(EditorStateService);
  readonly mergeTags = inject(MergeTagService);
  canvas: EditorCanvasComponent | null = null;

  /**
   * Optional uploader wired in by the host editor component. Given the image as
   * a base64 data URL (encoded once here), it uploads and resolves the hosted
   * image URL to use as the block src. When unset, images fall back to the inline
   * data URL.
   */
  uploadImage: ((imageData: string) => Promise<string>) | null = null;

  @ViewChild('mergeSearch') mergeSearchRef?: ElementRef<HTMLInputElement>;

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

  toggleOverflow(): void {
    const opening = !this.overflowOpen();
    // When opening, reflect the current selection's font in the dropdowns so
    // they SHOW the active font (not a stale default). The menu is recreated
    // each open, so this also restores the last-applied value.
    if (opening) this.syncFontControls();
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
      poster, fileName: file.name, alt: file.name, width, height, ratio,
    }, true);
    input.value = '';
  }
}
