import {
  Component, ViewChild, AfterViewInit, Input, ViewEncapsulation, inject,
  ElementRef, output
} from '@angular/core';
import { EditorStateService } from './services/editor-state.service';
import { EditorUtilsService } from './services/editor-utils.service';
import { EditorCanvasComponent } from './components/editor-canvas.component';
import { EditorToolbarComponent } from './components/editor-toolbar.component';
import { MediaInspectorComponent } from './components/media-inspector.component';
import { EditorMode } from './models/editor.models';
import { environment } from '../../../environments/environment';

/**
 * Self-contained rich email editor.
 *
 * Usage:
 *   <kexy-custom-rich-editor [content]="emailHtml"></kexy-custom-rich-editor>
 *
 * To push new content at runtime, grab a reference and call loadContent():
 *   @ViewChild(KexyCustomRichEditorComponent) editor!: KexyCustomRichEditorComponent;
 *   this.editor.loadContent('<p>Hi [receiver_first_name],</p>');
 *
 * Read the current HTML at any time from getHtml().
 */
@Component({
  selector: 'kexy-custom-rich-editor',
  standalone: true,
  // None: the editor styles must reach chips/media-blocks created imperatively
  encapsulation: ViewEncapsulation.None,
  styleUrl: './kexy-custom-rich-editor.component.css',
  imports: [
    EditorCanvasComponent,
    EditorToolbarComponent,
    MediaInspectorComponent,
  ],
  template: `
    <div class="page-shell">
      <div class="editor-modal">

        <!-- Subject line — sits ABOVE and visually separate from the bordered
             editor card (it has its own field box). Still shares the toolbar's
             merge-tag picker; chips render here too. -->
        <div class="email-meta">
          <label class="subject-label">Subject line</label>
          <div
            #subjectField
            class="subject-input"
            contenteditable="true"
            spellcheck="true"
            data-placeholder="Enter subject line…"
            (focus)="editorCanvas.handleSubjectSelect()"
            (keyup)="editorCanvas.handleSubjectSelect()"
            (mouseup)="editorCanvas.handleSubjectSelect()"
            (click)="editorCanvas.onSubjectClick($event)"
            (input)="onSubjectInput()"
            (blur)="onSubjectBlur()"
          ></div>
        </div>

        <!-- Editor card (the bordered box) -->
        <section>
          <!-- Toolbar -->
          <app-editor-toolbar #toolbar></app-editor-toolbar>

          <!-- Tabs -->
          <div class="tab-row">
            <button type="button"
              class="tab"
              [class.active]="state.mode() === 'design'"
              (click)="switchMode('design')"
            >Design</button>
            <button type="button"
              class="tab"
              [class.active]="state.mode() === 'preview'"
              (click)="switchMode('preview')"
            >Preview</button>
            <button type="button"
              class="tab"
              [class.active]="state.mode() === 'html'"
              (click)="switchMode('html')"
            >HTML</button>
            <span class="status-pill">{{ state.status() }}</span>
          </div>

          <!-- Canvas + preview + html panels -->
          <app-editor-canvas
            #editorCanvas
            (contentChanged)="onContentChanged()"
          ></app-editor-canvas>
        </section>

        <!-- Media inspector -->
        <app-media-inspector #inspector></app-media-inspector>
      </div>
    </div>
  `
})
export class KexyCustomRichEditorComponent implements AfterViewInit {
  @ViewChild('toolbar') toolbarRef!: EditorToolbarComponent;
  @ViewChild('editorCanvas') editorCanvasRef!: EditorCanvasComponent;
  @ViewChild('inspector') inspectorRef!: MediaInspectorComponent;
  @ViewChild('subjectField') subjectFieldRef!: ElementRef<HTMLDivElement>;

  /** Initial email HTML fed in by a host component. Falls back to the sample. */
  @Input() content?: string;

  /** Initial subject line (plain text with optional [tokens]). */
  @Input() subject?: string;

  /** Emits the serialized subject (raw [tokens]) whenever it changes. */
  readonly subjectChanged = output<string>();

  readonly state = inject(EditorStateService);
  private readonly utils = inject(EditorUtilsService);
  private apiUrl: string = environment.baseUrl + `landing-pages/save-image`;

  ngAfterViewInit(): void {
    // Wire canvas reference to toolbar and inspector
    this.toolbarRef.canvas = this.editorCanvasRef;
    this.inspectorRef.canvas = this.editorCanvasRef;

    // Register the subject field so the toolbar's merge-tag picker can target it
    this.editorCanvasRef.registerSubject(this.subjectFieldRef.nativeElement);
    if (this.subject != null) this.editorCanvasRef.setSubjectContent(this.subject);

    // Wire image uploads: the toolbar hands us the already-encoded base64 image,
    // we upload it and return the hosted URL to use as the image src.
    this.toolbarRef.uploadImage = async (imageData: string) => {
      const result = await this.sendFile(imageData);
      return result.default;
    };

    // Load the supplied content, or the built-in sample when none was given
    if (this.content != null) {
      this.loadContent(this.content);
    } else {
      this.loadSample();
    }
  }

  /** Public API: push email HTML into the editor (e.g. from a parent component). */
  loadContent(html: string): void {
    this.editorCanvasRef.setContent(html);
    this.state.setStatus('Content loaded');
  }

  /** Public API: read the current email HTML (inlined, export-ready). */
  getHtml(): string {
    this.editorCanvasRef.refreshOutputs();
    return this.state.htmlOutput();
  }

  /** Public API: read the subject as plain text with raw [tokens] (for save/send). */
  getSubject(): string {
    return this.editorCanvasRef.serializeSubjectRaw();
  }

  /** Public API: replace the subject content (tokens become chips). */
  setSubject(raw: string): void {
    this.editorCanvasRef.setSubjectContent(raw);
  }

  /** Subject typed into: keep the host's value in sync. Chips hydrate on blur
   *  (live hydration would disrupt the caret, same rule as the body canvas). */
  onSubjectInput(): void {
    this.editorCanvasRef.handleSubjectSelect();
    this.subjectChanged.emit(this.getSubject());
  }

  onSubjectBlur(): void {
    this.editorCanvasRef.hydrateSubjectChips();
    this.subjectChanged.emit(this.getSubject());
  }

  /** Public API: read the raw, re-editable HTML (merge tags as [tags], media
   *  blocks kept as editable divs). Persist this and feed it back via [content]
   *  / loadContent() to resume editing. */
  getRawHtml(): string {
    return this.editorCanvasRef.getRawHtml();
  }

  switchMode(mode: EditorMode): void {
    this.state.setMode(mode);
    this.editorCanvasRef.refreshOutputs();
  }

  loadSample(): void {
    const imageSvg = this.utils.buildImagePlaceholderSvg('Uploaded image', 1200, 675, '#2ea3f2');
    const videoSvg = this.utils.buildVideoPlaceholderSvg('Uploaded video', 1200, 675);
    this.editorCanvasRef.loadSample(imageSvg, videoSvg);
    this.state.setStatus('Sample loaded');
  }

  async copyHtml(): Promise<void> {
    this.editorCanvasRef.refreshOutputs();
    await navigator.clipboard.writeText(this.state.htmlOutput());
    this.state.setStatus('HTML copied');
  }

  downloadHtml(): void {
    this.editorCanvasRef.refreshOutputs();
    const blob = new Blob([this.state.htmlOutput()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-template.html';
    a.click();
    URL.revokeObjectURL(url);
    this.state.setStatus('Download started');
  }

  onContentChanged(): void {
    // Could trigger change detection or other side effects here
  }

  /**
   * Upload an already-base64-encoded image (a `data:` URL) to the host's image
   * API and resolve `{ default: <hosted url> }`. The toolbar encodes the file
   * once (via EditorUtilsService.readFileAsDataUrl) and passes it in, so there
   * is no second base64 encode here.
   */
  async sendFile(base64String: string): Promise<any> {
    const userToken = localStorage.getItem('userToken');
    if (!userToken) throw new Error('Unauthorized');
    const authToken = JSON.parse(userToken);

    const response: Response = await fetch(this.apiUrl, {
      method: 'PATCH',
      body: JSON.stringify({ imageData: base64String }),
      headers: {
        'Authorization': `Bearer ${authToken.token}`,
        'Content-Type': 'application/json',
      },
    });
    const responseData = await response.json();
    return { default: environment.imageUrl + responseData['data'].name };
  }
}
