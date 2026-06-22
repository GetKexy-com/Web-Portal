import {
  Component, ViewChild, AfterViewInit, Input, ViewEncapsulation, inject
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

        <!-- Editor card -->
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

  /** Initial email HTML fed in by a host component. Falls back to the sample. */
  @Input() content?: string;

  readonly state = inject(EditorStateService);
  private readonly utils = inject(EditorUtilsService);
  private apiUrl: string = environment.baseUrl + `landing-pages/save-image`;

  ngAfterViewInit(): void {
    // Wire canvas reference to toolbar and inspector
    this.toolbarRef.canvas = this.editorCanvasRef;
    this.inspectorRef.canvas = this.editorCanvasRef;

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

  async sendFile(file: File): Promise<any> {
    const base64String = await this.getBase64FromFile(file);
    const userToken = localStorage.getItem('userToken');
    if (!userToken) throw new Error('Unauthorized');
    const authToken = JSON.parse(userToken);

    return new Promise(async (resolve, reject) => {
      const response: Response = await fetch(this.apiUrl, {
        method: 'PATCH',
        body: JSON.stringify({ imageData: base64String }),
        headers: {
          'Authorization': `Bearer ${authToken.token}`,
          'Content-Type': 'application/json',
        },
      });
      const responseData = await response.json();
      resolve({ default: environment.imageUrl + responseData['data'].name });
    });
  }

  getBase64FromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
