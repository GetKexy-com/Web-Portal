import { Component, EventEmitter, Input, Output } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingService } from "../../services/prospecting.service";
import {FormsModule} from '@angular/forms';
import {
  ContactDetailsModalContentComponent
} from '../contact-details-modal-content/contact-details-modal-content.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'active-contacts-table',
  imports: [
    FormsModule,
    CommonModule,
  ],
  templateUrl: './active-contacts-table.component.html',
  styleUrl: './active-contacts-table.component.scss'
})
export class ActiveContactsTableComponent {
  @Input() cardData = [];
  @Input() total = 0;
  @Input() checkboxClicked;
  @Input() paginationLeftArrowClick;
  @Input() paginationRightArrowClick;
  @Input() totalPage;
  @Input() currentPage;
  @Input() limit;
  @Output() selectedLimit: EventEmitter<any> = new EventEmitter();

  constructor(private prospectingService: ProspectingService, private modal: NgbModal) {}

  get selectedItemCount(): number {
    return this.cardData.filter((i) => i.is_selected).length;
  }

  get allSelected(): boolean {
    return this.cardData.length > 0 && this.selectedItemCount === this.cardData.length;
  }

  get rangeStart(): number {
    return this.total ? (this.currentPage - 1) * this.limit + 1 : 0;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.limit, this.total);
  }

  getDetails = (row) => {
    // Some prospects are stored with an empty `details`; JSON.parse('') throws mid-render.
    let details = row.details;
    if (typeof details === "string") {
      try {
        details = JSON.parse(details);
      } catch {
        details = null;
      }
    }
    return details || {};
  };

  getName = (row) => {
    const d = this.getDetails(row);
    return d.contactName || d.name || [d.firstName, d.lastName].filter(Boolean).join(' ') || '—';
  };

  getEmail = (row) => this.getDetails(row).email || row.email || '—';

  getInitials = (row) => {
    const [first = '', last = ''] = this.getName(row).replace('—', '').trim().split(/\s+/);
    return ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
  };

  onSelectAll = () => {
    this.checkboxClicked(null, true);
  };

  onCheckboxClicked = (event: Event, data) => {
    event.stopPropagation();
    this.checkboxClicked(data);
  };

  handleRowClick = (data) => {
    this.prospectingService.selectedContactForShowDetails = data;
    this.modal.open(ContactDetailsModalContentComponent, {size: "lg"});
  };

  onShowEntriesSelect = () => {
    this.selectedLimit.emit(this.limit);
  };
}
