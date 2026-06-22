import { Injectable, signal } from '@angular/core';
import { EditorMode } from '../models/editor.models';

@Injectable({ providedIn: 'root' })
export class EditorStateService {
  readonly mode = signal<EditorMode>('design');
  readonly sourceMode = signal(false);
  readonly selectedBlock = signal<HTMLElement | null>(null);
  readonly status = signal('Ready');
  readonly htmlOutput = signal('');
  readonly subject = signal('[receiver_first_name], You recently requested information about life insurance');
  // Incremented to force inspector to re-read block dataset after drag-resize
  readonly inspectorTick = signal(0);

  private statusTimer: ReturnType<typeof setTimeout> | null = null;

  setMode(mode: EditorMode): void {
    this.mode.set(mode);
  }

  toggleSourceMode(): void {
    this.sourceMode.update(v => !v);
  }

  setSelectedBlock(block: HTMLElement | null): void {
    this.selectedBlock.set(block);
  }

  setStatus(text: string): void {
    this.status.set(text);
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => this.status.set('Ready'), 2200);
  }

  setHtmlOutput(html: string): void {
    this.htmlOutput.set(html);
  }

  setSubject(value: string): void {
    this.subject.set(value);
  }

  /** Nudge the inspector to re-read block.dataset after a drag-resize */
  triggerInspectorRefresh(): void {
    this.inspectorTick.update(v => v + 1);
  }

  isImageBlock(block: HTMLElement | null): boolean {
    return block?.dataset['kind'] === 'image';
  }
}
