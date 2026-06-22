import {
  Component, inject, signal, computed, output, ElementRef, ViewChild, OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MergeTagService } from "../services/merge-tag.service";

export interface PopoverPosition {
  top: number;
  left: number;
}

@Component({
  selector: 'app-fallback-popover',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .fallback-popover {
      position: fixed;
      z-index: 9999;
      background: #fff;
      border: 1px solid #d7deea;
      border-radius: 5px;
      box-shadow: 0 8px 32px rgba(15,23,42,0.16);
      padding: 16px;
      min-width: 280px;
      max-width: 320px;
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
      font-size: 15px;
      flex-shrink: 0;
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

    .popover-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .popover-input-wrap .popover-input { padding-right: 36px; }

    .undo-btn {
      position: absolute;
      right: 6px;
      width: 26px;
      height: 26px;
      border: none;
      background: transparent;
      color: #6b7280;
      font-size: 16px;
      line-height: 1;
      border-radius: 5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .undo-btn:hover { background: #f1f5f9; color: #1f2937; }

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
  `],
  template: `
    @if (visible()) {
      <div
        #popover
        class="fallback-popover"
        [style.top.px]="pos().top"
        [style.left.px]="pos().left"
        (mousedown)="$event.stopPropagation()"
      >
        <div class="popover-header">
          <div class="popover-icon">↩</div>
          <h3>Fallback</h3>
        </div>
        <p class="popover-label">If we can't find {{ label() }}</p>
        <div class="popover-input-wrap">
          <input
            #input
            class="popover-input"
            type="text"
            [value]="fallbackValue()"
            (input)="onInput($event)"
            (keydown.enter)="save()"
            (keydown.escape)="hide()"
            placeholder="Enter fallback..."
          />
          @if (canUndo()) {
            <button
              type="button"
              class="undo-btn"
              title="Undo change"
              aria-label="Undo change"
              (click)="undo()"
            >↺</button>
          }
        </div>
        <div class="popover-actions">
          <button class="btn-clear" (click)="clear()">Clear</button>
          <button class="btn-save" (click)="save()">Save</button>
        </div>
      </div>
    }
  `
})
export class FallbackPopoverComponent implements OnDestroy {
  @ViewChild('input') inputRef?: ElementRef<HTMLInputElement>;

  private readonly mergeTagService = inject(MergeTagService);

  /** Emitted whenever the stored fallback changes (save / clear / undo). */
  readonly fallbackChanged = output<void>();

  readonly visible = signal(false);
  readonly pos = signal<PopoverPosition>({ top: 0, left: 0 });
  readonly label = signal('');
  readonly fallbackValue = signal('');
  /** Value the popover opened with — undo reverts back to this */
  readonly originalFallback = signal('');
  /** Show the undo icon once the user has changed the fallback */
  readonly canUndo = computed(() => this.fallbackValue() !== this.originalFallback());

  private currentKey = '';
  private currentChip: HTMLElement | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(chip: HTMLElement, key: string, anchorRect: DOMRect): void {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }

    this.currentKey = key;
    this.currentChip = chip;
    const tag = this.mergeTagService.getTag(key);
    this.label.set(tag?.label ?? key);
    this.fallbackValue.set(tag?.fallback ?? '');
    this.originalFallback.set(tag?.fallback ?? '');

    // Position below the chip, left-aligned, clamped to viewport
    const top = anchorRect.bottom + 8;
    const left = Math.min(anchorRect.left, window.innerWidth - 340);
    this.pos.set({ top, left });
    this.visible.set(true);

    // Focus the input on next tick
    setTimeout(() => this.inputRef?.nativeElement.focus());
  }

  hide(): void {
    this.visible.set(false);
    this.currentChip = null;
  }

  scheduleHide(): void {
    this.hideTimer = setTimeout(() => this.hide(), 180);
  }

  cancelHide(): void {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }

  onInput(event: Event): void {
    this.fallbackValue.set((event.target as HTMLInputElement).value);
  }

  save(): void {
    this.mergeTagService.setFallback(this.currentKey, this.fallbackValue());
    this.fallbackChanged.emit();
    this.hide();
  }

  clear(): void {
    this.fallbackValue.set('');
    this.mergeTagService.setFallback(this.currentKey, '');
    this.fallbackChanged.emit();
    this.inputRef?.nativeElement.focus();
  }

  /** Revert the fallback to the value the popover opened with */
  undo(): void {
    const original = this.originalFallback();
    this.fallbackValue.set(original);
    this.mergeTagService.setFallback(this.currentKey, original);
    this.fallbackChanged.emit();
    this.inputRef?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }
}