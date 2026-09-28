import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { routeConstants } from '../../helpers/routeConstants';
import { IEnrollmentPreview } from '../../services/drip-campaign.service';

/** A list being added: its name, and its id for the link to its contacts page. */
export interface IEnrollmentPreviewList {
  id: number;
  name: string;
}

/**
 * Confirmation shown when saving Enrollment Triggers with a newly selected list: how
 * many contacts will be added, how many are skipped because their email is invalid or
 * not verified (KexyApi never enrolls those), and how many are already in the campaign.
 *
 * Opened by `email-time-settings-content` with windowClass `kx-dialog-modal`; inputs are
 * set on `componentInstance`. Closes with `true` to save, dismisses otherwise.
 */
@Component({
  selector: 'enrollment-preview-modal',
  imports: [CommonModule, RouterLink],
  templateUrl: './enrollment-preview-modal.component.html',
  styleUrl: './enrollment-preview-modal.component.scss',
})
export class EnrollmentPreviewModalComponent implements OnInit {
  @Input() preview!: IEnrollmentPreview;
  /** The lists being added. Each name links to its contacts page in a new tab. */
  @Input() lists: IEnrollmentPreviewList[] = [];

  /** `/brand/contacts/list-contacts` — opened with `?listId=…&page=1`. */
  readonly listContactsPath = '/' + routeConstants.BRAND.LIST_CONTACTS;
  confirmLabel = '';
  /** Invalid + unverified: everyone not added for their email. */
  skipped = 0;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.skipped = this.preview.skippedInvalid + (this.preview.skippedUnverified ?? 0);
    const n = this.preview.toAdd;
    this.confirmLabel = n > 0 ? `Add ${n.toLocaleString()} contact${n === 1 ? '' : 's'} & save` : 'Save';
  }
}
