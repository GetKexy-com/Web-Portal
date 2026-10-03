import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

/** What the user chose in the dialog. */
export interface IActivateDripResult {
  /**
   * "Super charged" toggle. Sent with the activate call; KexyApi saves it as the
   * campaign's `super_charged` setting.
   */
  superCharged: boolean;
}

/**
 * "Ready to activate?" — the last confirmation before a drip campaign goes live, with
 * the "Super charged" toggle.
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
export class ActivateDripModalComponent {
  @Input() campaignTitle = '';
  @Input() emailCount = 0;
  /** How many lists are enrolled on activation. */
  @Input() listCount = 0;

  /** Starting state — the campaign's current value, so re-activating keeps it. */
  @Input() superCharged = false;

  /** "What is Super charged?" disclosure — collapsed by default. */
  showDetails = false;

  /** What Super charged keeps re-scraping, shown as chips in the disclosure. */
  readonly sources = [
    { label: 'Prospect profile', icon: 'fa-user-o' },
    { label: 'Company news', icon: 'fa-newspaper-o' },
    { label: 'Social media', icon: 'fa-share-alt' },
    { label: 'Job listings', icon: 'fa-briefcase' },
    { label: 'Personal posts', icon: 'fa-comment-o' },
    { label: 'Company posts', icon: 'fa-file-text-o' },
  ];

  constructor(public activeModal: NgbActiveModal) {}

  toggleSuperCharged = (): void => {
    this.superCharged = !this.superCharged;
  };

  toggleDetails = (): void => {
    this.showDetails = !this.showDetails;
  };

  activate = (): void => {
    const result: IActivateDripResult = { superCharged: this.superCharged };
    this.activeModal.close(result);
  };
}
