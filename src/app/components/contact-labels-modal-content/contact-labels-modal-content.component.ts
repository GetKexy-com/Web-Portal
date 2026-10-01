import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { ProspectingService } from '../../services/prospecting.service';

/** A list chip as shown here: its name and colours. */
interface IListChip {
  label: string;
  bgColor: string;
  textColor: string;
}

/**
 * "+N more" → every list a contact (or drip campaign) belongs to.
 *
 * Opened by `contact-list-card`, `kexy-scrollable-table` and
 * `list-of-drip-campaign-table` with windowClass `kx-dialog-modal` (the rounded frame
 * shared with the other dialogs). The lists are handed over on
 * `ProspectingService.selectedContactLabels`. Items are either `{ list: {...} }` (drip
 * campaigns) or the list itself (contacts).
 */
@Component({
  selector: 'contact-lists-modal-content',
  imports: [CommonModule],
  templateUrl: './contact-labels-modal-content.component.html',
  styleUrl: './contact-labels-modal-content.component.scss',
})
export class ContactLabelsModalContentComponent implements OnInit {
  activeModal = inject(NgbActiveModal);
  private prospectingService = inject(ProspectingService);

  lists: IListChip[] = [];
  /** Shown only when there are enough lists to need it. */
  readonly searchThreshold = 8;
  query = '';

  ngOnInit(): void {
    this.lists = (this.prospectingService.selectedContactLabels ?? [])
      .map((item: any) => item?.list ?? item)
      .filter((l: any) => l?.label)
      .map((l: any) => ({ label: l.label, bgColor: l.bgColor, textColor: l.textColor }));
  }

  get filtered(): IListChip[] {
    const q = this.query.trim().toLowerCase();
    return q ? this.lists.filter((l) => l.label.toLowerCase().includes(q)) : this.lists;
  }

  onSearch = (event: Event): void => {
    this.query = (event.target as HTMLInputElement).value;
  };
}
