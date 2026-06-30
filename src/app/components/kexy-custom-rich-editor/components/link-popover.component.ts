import {
  Component, signal, output, ElementRef, ViewChild, OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PopoverPosition {
  top: number;
  left: number;
}

/**
 * Small popover for inserting / editing a hyperlink URL. Mirrors the look and
 * focus handling of {@link FallbackPopoverComponent}: it replaces the old
 * `window.prompt('Link URL')` flow with an inline field that pre-fills the
 * URL of the link being edited (or the last URL the user entered), so the
 * value is remembered rather than typed from scratch each time. The canvas owns
 * applying the URL (it restores the saved selection first) via `urlSubmitted`.
 */
@Component({
  selector: 'app-link-popover',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .link-popover {
      position: fixed;
      z-index: 9999;
      background: #fff;
      border: 1px solid #d7deea;
      border-radius: 5px;
      box-shadow: 0 8px 32px rgba(15,23,42,0.16);
      padding: 16px;
      min-width: 300px;
      max-width: 360px;
    }

    .popover-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }

    .popover-icon {
      width: 28px;
      height: 28px;
      border-radius: 5px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #1f2937;
    }

    .popover-header h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #1f2937;
    }

    .popover-label {
      font-size: 12px;
      color: #6b7280;
      margin: 0 0 6px;
    }

    .popover-input {
      width: 100%;
      border: 1px solid #d7deea;
      border-radius: 5px;
      padding: 8px 10px;
      font-size: 14px;
      font-family: inherit;
      color: #1f2937;
      background: #fff;
      box-sizing: border-box;
      outline: none;
    }

    .popover-input:focus {
      border-color: #2ea3f2;
      box-shadow: 0 0 0 3px rgba(46,163,242,0.15);
    }

    .popover-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .btn-clear {
      border: 1px solid #d7deea;
      border-radius: 5px;
      background: #fff;
      color: #1f2937;
      padding: 7px 14px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-clear:hover { background: #f8fafc; }

    .btn-save {
      border: none;
      border-radius: 5px;
      background: #2ea3f2;
      color: #fff;
      padding: 7px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-save:hover { background: #0f84d4; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
  template: `
    @if (visible()) {
      <div
        #popover
        class="link-popover"
        [style.top.px]="pos().top"
        [style.left.px]="pos().left"
        (mousedown)="$event.stopPropagation()"
      >
        <div class="popover-header">
          <div class="popover-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </div>
          <h3>{{ editing() ? 'Edit link' : 'Insert link' }}</h3>
        </div>
        <p class="popover-label">Link URL</p>
        <input
          #input
          class="popover-input"
          type="text"
          [value]="url()"
          (input)="onInput($event)"
          (keydown.enter)="save()"
          (keydown.escape)="hide()"
          placeholder="https://example.com"
        />
        <div class="popover-actions">
          <button type="button" class="btn-clear" (click)="hide()">Cancel</button>
          <button type="button" class="btn-save" [disabled]="!url().trim()" (click)="save()">
            {{ editing() ? 'Update' : 'Insert' }}
          </button>
        </div>
      </div>
    }
  `
})
export class LinkPopoverComponent implements OnDestroy {
  @ViewChild('input') inputRef?: ElementRef<HTMLInputElement>;

  /** Emitted with the entered URL when the user confirms. */
  readonly urlSubmitted = output<string>();
  /** Emitted whenever the popover hides (confirm, cancel, Esc, outside-click). */
  readonly closed = output<void>();

  readonly visible = signal(false);
  readonly pos = signal<PopoverPosition>({ top: 0, left: 0 });
  readonly url = signal('');
  /** True when the popover opened on an existing link (changes the labels). */
  readonly editing = signal(false);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param anchorRect viewport rect to position the popover beneath
   * @param currentUrl the URL to pre-fill (existing link's href, or remembered)
   * @param editing whether we're editing an existing link
   */
  show(anchorRect: DOMRect, currentUrl: string, editing: boolean): void {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }

    this.url.set(currentUrl);
    this.editing.set(editing);

    // Position below the anchor, left-aligned, clamped to the viewport
    const top = anchorRect.bottom + 8;
    const left = Math.min(anchorRect.left, window.innerWidth - 380);
    this.pos.set({ top, left: Math.max(8, left) });
    this.visible.set(true);

    // Focus + select the input on next tick so the remembered URL is easy to replace
    setTimeout(() => {
      const el = this.inputRef?.nativeElement;
      if (el) { el.focus(); el.select(); }
    });
  }

  hide(): void {
    if (!this.visible()) return;
    this.visible.set(false);
    this.closed.emit();
  }

  onInput(event: Event): void {
    this.url.set((event.target as HTMLInputElement).value);
  }

  save(): void {
    const value = this.url().trim();
    if (!value) return;
    this.urlSubmitted.emit(value);
    this.hide();
  }

  ngOnDestroy(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }
}
