import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Shows the result of a CSV contact import: how many were imported and a table of
 * every SKIPPED contact (full details + the validation errors that skipped it).
 * Opened by the contact pages after `addContacts()` returns when skippedCount > 0.
 *
 * `skipped` items are pre-mapped by the parent to:
 *   { firstName, lastName, email, company, jobTitle, location, errors: string[] }
 */
@Component({
  selector: 'app-import-results-modal-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-results-modal-content.component.html',
  styleUrl: './import-results-modal-content.component.scss',
})
export class ImportResultsModalContentComponent {
  @Input() importedCount = 0;
  @Input() skippedCount = 0;
  @Input() skipped: any[] = [];
  @Input() closeModal: () => void = () => {};

  close() {
    this.closeModal();
  }
}
