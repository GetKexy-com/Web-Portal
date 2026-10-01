import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

/** What the user chose in the dialog. */
export interface IActivateDripResult {
  /**
   * "Super charged" toggle. UI only for now — nothing sends it to KexyApi yet; it is
   * returned so the activate call can pick it up once the backend supports it.
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

  superCharged = false;

  constructor(public activeModal: NgbActiveModal) {}

  toggleSuperCharged = (): void => {
    this.superCharged = !this.superCharged;
  };

  activate = (): void => {
    const result: IActivateDripResult = { superCharged: this.superCharged };
    this.activeModal.close(result);
  };
}
