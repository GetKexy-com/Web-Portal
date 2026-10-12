import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

/**
 * "Your campaign is live" — shown once a drip campaign has been activated. The success half
 * of `activate-drip-modal` ("Ready to activate?"): same frame (`kx-dialog-modal`), same hero,
 * stat tiles and foot, green instead of blue. Replaced a stock SweetAlert "Congratulations!".
 *
 * Opened by `generate-drip-campaign`; inputs are set on `componentInstance`. Any close resolves.
 */
@Component({
  selector: 'drip-live-modal',
  imports: [CommonModule],
  templateUrl: './drip-live-modal.component.html',
  styleUrl: './drip-live-modal.component.scss',
})
export class DripLiveModalComponent {
  @Input() campaignTitle = '';
  @Input() emailCount = 0;
  @Input() listCount = 0;
  @Input() superCharged = false;
  /**
   * Template campaigns go out as written; every other kind researches each prospect first
   * (website, location, LinkedIn, local sports) before the first email is written.
   */
  @Input() researchFirst = true;

  constructor(public activeModal: NgbActiveModal) {}
}
