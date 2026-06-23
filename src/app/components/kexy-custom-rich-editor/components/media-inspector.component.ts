import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorStateService } from '../services/editor-state.service';
import { EditorCanvasComponent } from './editor-canvas.component';

@Component({
  selector: 'app-media-inspector',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (state.selectedBlock()) {
      <section class="media-inspector">
        <div class="inspector-header">
          <h2>Selected media</h2>
          <span class="mini-pill">{{ state.isImageBlock(state.selectedBlock()) ? 'Image' : 'Video' }}</span>
        </div>
        <div class="inspector-grid">
          <label>
            Alt / label
            <input type="text" [value]="alt()" (input)="onAltChange($event)" />
          </label>
          <label>
            Click URL
            <input type="text" [value]="link()" (input)="onLinkChange($event)" placeholder="https://example.com" />
          </label>
          <label>
            Width
            <input type="number" min="40" max="1200" [value]="width()" (input)="onWidthChange($event)" />
          </label>
          <label>
            Height
            <input type="number" min="40" max="1200" [value]="height()" (input)="onHeightChange($event)" />
          </label>
        </div>
        <div class="inspector-actions">
          <label class="check-row">
            <input type="checkbox" [checked]="lockAspect()" (change)="onLockChange($event)" />
            Preserve ratio
          </label>
          <div class="align-group">
            <button type="button" class="ghost small" (click)="canvas?.applyAlignment('left')">Left</button>
            <button type="button" class="ghost small" (click)="canvas?.applyAlignment('center')">Center</button>
            <button type="button" class="ghost small" (click)="canvas?.applyAlignment('right')">Right</button>
            @if (!state.isImageBlock(state.selectedBlock())) {
              <button type="button" class="ghost small" (click)="thumbInput.click()">Upload Video Thumbnail</button>
              <input #thumbInput type="file" accept="image/*" hidden (change)="onThumbFile($event)" />
            }
          </div>
          <button type="button" class="danger small" (click)="canvas?.removeSelectedBlock()">Remove</button>
        </div>
        <p class="inspector-note">
          Drag the bottom-right handle on the selected image/video to resize directly on canvas.
          Uploaded videos are exported as email-safe thumbnail links, not inline playable video.
        </p>
      </section>
    }
  `
})
export class MediaInspectorComponent {
  readonly state = inject(EditorStateService);
  canvas: EditorCanvasComponent | null = null;

  // Computed signals — re-derive from block.dataset on every inspectorTick so
  // the width/height inputs update live while the user drags the resize handle.
  readonly alt = computed(() => {
    this.state.inspectorTick(); // subscribe to tick
    return this.state.selectedBlock()?.dataset['alt'] ?? '';
  });
  readonly link = computed(() => {
    this.state.inspectorTick();
    return this.state.selectedBlock()?.dataset['link'] ?? '';
  });
  readonly width = computed(() => {
    this.state.inspectorTick();
    return this.state.selectedBlock()?.dataset['width'] ?? '';
  });
  readonly height = computed(() => {
    this.state.inspectorTick();
    return this.state.selectedBlock()?.dataset['height'] ?? '';
  });
  readonly lockAspect = computed(() => {
    this.state.inspectorTick();
    return this.state.selectedBlock()?.dataset['lockAspect'] !== 'false';
  });

  onAltChange(event: Event): void {
    this.canvas?.updateBlockAlt((event.target as HTMLInputElement).value);
  }

  onLinkChange(event: Event): void {
    this.canvas?.updateBlockLink((event.target as HTMLInputElement).value);
  }

  onWidthChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val >= 40) this.canvas?.resizeFromInputs({ width: val });
  }

  onHeightChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!isNaN(val) && val >= 40) this.canvas?.resizeFromInputs({ height: val, userChangedHeight: true });
  }

  onLockChange(event: Event): void {
    this.canvas?.setLockAspect((event.target as HTMLInputElement).checked);
  }

  /** Replace the selected video's poster with a user-picked image. */
  onThumbFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.canvas?.replaceSelectedVideoPoster(file);
    input.value = '';
  }
}
