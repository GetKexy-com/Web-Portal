import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface CustomPropertyRow {
  name: string;
  value: any;
  /** Saved on the contact already (from a CSV import or an earlier save). */
  imported: boolean;
}

/**
 * "Manage custom properties" — the contact panel's (`prospecting-contacts`) Manage button.
 * Lists every property with a remove (confirmed in the row itself, so no second popup
 * stacks on this one) and adds new ones at the bottom. Works on a copy: closes with the
 * edited rows on "Apply changes"; Cancel / × / Esc leave the panel as it was. Opened with
 * windowClass `kx-dialog-modal kx-manage-props-modal` (rounded frame and width in styles.scss).
 */
@Component({
  selector: 'manage-custom-properties-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-custom-properties-modal.component.html',
  styleUrl: './manage-custom-properties-modal.component.scss',
})
export class ManageCustomPropertiesModalComponent implements OnInit {
  @Input() properties: CustomPropertyRow[] = [];
  @Input() contactName = '';
  @ViewChild('list') listRef?: ElementRef<HTMLElement>;

  rows: CustomPropertyRow[] = [];
  confirmingIndex: number | null = null;
  newName = '';
  newValue = '';
  addError = '';

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.rows = this.properties.map((p) => ({ ...p }));
  }

  get changed(): boolean {
    const key = (list: CustomPropertyRow[]) => JSON.stringify(list.map((r) => [r.name, r.value]));
    return key(this.rows) !== key(this.properties);
  }

  askRemove(index: number): void {
    this.confirmingIndex = index;
  }

  remove(index: number): void {
    this.rows.splice(index, 1);
    this.confirmingIndex = null;
  }

  // Same rules as the panel's "+ Add property": both required, and no name that
  // matches an existing one ignoring case ("Industry" / "industry").
  add(): void {
    const name = this.newName.trim();
    const value = this.newValue.trim();
    if (!name) return void (this.addError = 'Please enter a property name.');
    if (this.rows.some((r) => String(r.name).trim().toLowerCase() === name.toLowerCase())) {
      return void (this.addError = `This contact already has a "${name}" property.`);
    }
    if (!value) return void (this.addError = 'Please enter a value.');
    this.rows.push({ name, value, imported: false });
    this.newName = '';
    this.newValue = '';
    this.addError = '';
    // The list scrolls on its own; show the row just added at its bottom.
    setTimeout(() => {
      const list = this.listRef?.nativeElement;
      if (list) list.scrollTop = list.scrollHeight;
    });
  }

  apply(): void {
    this.activeModal.close(this.rows);
  }
}
