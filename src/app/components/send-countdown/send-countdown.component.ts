import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { Subscription, share, timer } from 'rxjs';

import { IEmailSendSchedule } from '../../models/EmailSendProgress';
import { IScheduleLabel, scheduleLabel } from '../../helpers/send-schedule-label';

/**
 * ONE interval for every countdown on the page. The contacts list can show 200 rows, and
 * a timer each would mean 200 change-detection passes a second; shared, it is one.
 * `share()` stops the interval when the last countdown unsubscribes.
 */
const SECOND_TICK$ = timer(0, 1000).pipe(share());

/**
 * When a prospect's next drip email goes out, ticking every second. The API does the
 * working out (`schedule` / `nextSend`); this only formats it against the clock.
 *
 * `clockOffsetMs` is server clock minus browser clock, from the response's `serverTime`,
 * so a laptop clock that is a few minutes out does not skew the countdown.
 */
@Component({
  selector: 'send-countdown',
  imports: [CommonModule],
  template: `
    <span class="sc" [ngClass]="'sc-' + label.tone" [title]="label.title">
      <span class="sc-prefix" *ngIf="prefix && label.tone === 'count'">{{ prefix }} </span>
      <span class="sc-text">{{ label.text }}</span>
      <span class="sc-at" *ngIf="showAt && label.at">{{ label.at | date: 'EEE MMM d, h:mm a' }}</span>
    </span>
  `,
  styles: `
    .sc {
      cursor: help;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .sc-count .sc-text {
      color: #095dd1;
      font-weight: 600;
    }
    .sc-soon .sc-text {
      color: #b45309;
      font-weight: 600;
    }
    .sc-mute .sc-text {
      color: #94a3b8;
    }
    .sc-prefix {
      color: #64748b;
    }
    .sc-at {
      display: block;
      margin-top: 1px;
      font-size: 10.5px;
      color: #94a3b8;
    }
  `,
})
export class SendCountdownComponent implements OnInit, OnChanges, OnDestroy {
  @Input() schedule: IEmailSendSchedule | null = null;
  @Input() clockOffsetMs = 0;
  /** Words before a running countdown, e.g. "Next email:" → "Next email: Queues in 2h 05m". */
  @Input() prefix = '';
  /** Show the send time under the countdown. */
  @Input() showAt = false;

  label: IScheduleLabel = scheduleLabel(null, 0);
  private sub: Subscription | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Checks only this component's own view: inside an OnPush parent (the campaign list
    // table) a tick would otherwise never reach the screen, and marking the parent for
    // check instead would re-check a whole table every second.
    this.sub = SECOND_TICK$.subscribe(() => {
      this.__update();
      this.cdr.detectChanges();
    });
  }

  ngOnChanges(): void {
    this.__update();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private __update(): void {
    this.label = scheduleLabel(this.schedule, Date.now() + this.clockOffsetMs);
  }
}
