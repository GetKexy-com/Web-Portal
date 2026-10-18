import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnDestroy } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

/** What the user chose in the dialog. */
export interface IActivateDripResult {
  /**
   * "Supercharged" toggle. Sent with the activate call; KexyApi saves it as the
   * campaign's `super_charged` setting.
   */
  superCharged: boolean;
}

/**
 * "Ready to activate?" — the last confirmation before a drip campaign goes live, with
 * the "Supercharged" card. The card is a 1:1 port of the client-supplied
 * supercharged-card.{html,css,js} (second version, 2026-10-18): header + headline always
 * show; "What is Supercharged?" opens a panel (collapsed by default) with the chips, a
 * rotating "Caught this morning" example that lights its chip, and the callout. The
 * example rotates only while the panel is open and the tab visible, from the first
 * example each time it opens. The switch flips only the setting.
 *
 * Opened by `generate-drip-campaign` with windowClass `kx-dialog-modal`; inputs are set
 * on `componentInstance`. Closes with an `IActivateDripResult`, dismisses otherwise.
 */
@Component({
  selector: 'activate-drip-modal',
  imports: [CommonModule],
  templateUrl: './activate-drip-modal.component.html',
  styleUrl: './activate-drip-modal.component.scss',
})
export class ActivateDripModalComponent implements OnDestroy {
  @Input() campaignTitle = '';
  @Input() emailCount = 0;
  /** How many lists are enrolled on activation. */
  @Input() listCount = 0;

  /** Starting state — the campaign's current value, so re-activating keeps it. */
  @Input() superCharged = false;

  /** "What is Supercharged?" panel — collapsed by default. */
  showDetails = false;

  /** Order shown on the card; the eyebrow count is `signals.length`. */
  readonly signals = [
    'Prospect profile',
    'Role changes',
    'Company news',
    'Job listings',
    'Pain signals',
    'Personal posts',
    'Company posts',
    'Socials',
    'Local events',
  ];

  /** Illustrative (fictional) examples, rotated while the panel is open. `src` must match a `signals` label. */
  readonly examples: ReadonlyArray<{ src: string; who: string; caught: string; email: string; used: string }> = [
    { src: 'Local events', who: 'Dana', caught: 'posted from last night’s home game', email: 'Email #2', used: 'opens with that 4th-quarter comeback' },
    { src: 'Pain signals', who: 'Acme Co.', caught: 'posted 3 SDR roles in a month', email: 'Email #3', used: 'asks if it’s scaling or turnover' },
    { src: 'Company news', who: 'Acme Co.', caught: 'announced a new Austin office', email: 'Email #4', used: 'leads with the expansion' },
    { src: 'Role changes', who: 'Dana', caught: 'was just promoted to COO', email: 'Email #5', used: 'congratulates, then re-pitches' },
    { src: 'Personal posts', who: 'Dana', caught: 'wrote about scaling without a big team', email: 'Email #2', used: 'ties your pitch to that exact post' },
  ];

  private static readonly ROTATE_MS = 3200;
  readonly reduceMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  private exampleIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  get example() {
    return this.examples[this.exampleIndex];
  }

  constructor(public activeModal: NgbActiveModal) {}

  ngOnDestroy(): void {
    this.stopRotation();
  }

  /** Pause rotation while the tab is hidden. */
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    document.hidden ? this.stopRotation() : this.startRotation();
  }

  /** Only the switch changes; the card and the rotation don't depend on it. */
  toggleSuperCharged = (): void => {
    this.superCharged = !this.superCharged;
  };

  toggleDetails = (): void => {
    this.showDetails = !this.showDetails;
    if (this.showDetails) {
      this.exampleIndex = 0;
      this.startRotation();
    } else {
      this.stopRotation();
    }
  };

  activate = (): void => {
    const result: IActivateDripResult = { superCharged: this.superCharged };
    this.activeModal.close(result);
  };

  private startRotation(): void {
    this.stopRotation();
    if (this.reduceMotion || !this.showDetails || document.hidden) return;
    this.timer = setInterval(() => {
      this.exampleIndex = (this.exampleIndex + 1) % this.examples.length;
    }, ActivateDripModalComponent.ROTATE_MS);
  }

  private stopRotation(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
