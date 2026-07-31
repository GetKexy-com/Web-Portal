import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  inject,
} from '@angular/core';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/** How often the text is recomputed. dayjs rounds to minutes past the first one. */
const TICK_MS = 30_000;

/**
 * "Last updated 2 minutes ago" — the age of a snapshot, in the words a person uses.
 *
 * Relative rather than a clock time, because the question a reader has about a cached
 * table is "how stale is this", not "what time is it". `Updated 3:42:07 PM` forces
 * them to subtract; `Last updated 2 minutes ago` answers it. Same reason the AWS
 * console phrases it this way.
 *
 * The component owns its own timer so the text keeps up as time passes — a static
 * binding would sit on "a few seconds ago" indefinitely. One interval per instance,
 * cleared on destroy; at 30s it costs a change-detection pass twice a minute.
 */
@Component({
  selector: 'app-time-ago',
  standalone: true,
  template: `{{ text }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeAgoComponent implements OnChanges, OnDestroy {
  /** Epoch milliseconds. Null renders nothing. */
  @Input() value: number | null = null;
  @Input() prefix = 'Last updated';

  text = '';
  private timer?: ReturnType<typeof setInterval>;
  private cdr = inject(ChangeDetectorRef);

  ngOnChanges(): void {
    this.__render();
    // Only run a timer while there is something to age.
    if (this.value && !this.timer) {
      this.timer = setInterval(() => this.__render(), TICK_MS);
    } else if (!this.value) {
      this.__stop();
    }
  }

  ngOnDestroy(): void {
    this.__stop();
  }

  private __render(): void {
    this.text = this.value ? `${this.prefix} ${dayjs(this.value).fromNow()}` : '';
    // OnPush: a timer callback is not an event on this view, so nothing marks it dirty
    // and the text would freeze at whatever it said when the input last changed.
    this.cdr.markForCheck();
  }

  private __stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
