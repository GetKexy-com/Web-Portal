import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface LiveChange {
  label: string;
  before: string;
  after: string;
}

/**
 * "Save changes to this running campaign?" — page 1 of the builder (`drip-campaign-content`)
 * opens it when Next would change a running or paused campaign. Closes with 'save' or
 * 'undo'; dismissed (×, Keep editing, Esc) means keep editing. Opened with windowClass
 * `kx-dialog-modal` (the rounded frame in styles.scss).
 */
@Component({
  selector: 'live-changes-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-changes-modal.component.html',
  styleUrl: './live-changes-modal.component.scss',
})
export class LiveChangesModalComponent {
  @Input() changes: LiveChange[] = [];
  @Input() campaignTitle = '';
  @Input() paused = false;

  constructor(public activeModal: NgbActiveModal) {}
}
