import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, NgClass } from '@angular/common';

@Component({
  selector: 'app-pagination',
  imports: [
    FormsModule,
    NgIf,
    NgClass,
  ],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
})
export class PaginationComponent {
  @Input() page!: number;
  @Input() totalPage!: number;
  @Input() isLoading!: boolean;
  @Input() limit!: number;

  @Output() left = new EventEmitter<void>();
  @Output() right = new EventEmitter<void>();
  @Output() first = new EventEmitter<void>();
  @Output() last = new EventEmitter<void>();
  // Emits a specific 1-based page number (the "Go to" jump).
  @Output() navigate = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  navigatePageNumber: number | null = null;

  isFirstPage = () => Number(this.page) <= 1;
  isLastPage = () => Number(this.page) >= Number(this.totalPage);

  goFirst() {
    if (!this.isFirstPage()) this.first.emit();
  }

  goLast() {
    if (!this.isLastPage()) this.last.emit();
  }

  onLimitChange(event: any) {
    this.limitChange.emit(Number(event.target.value));
  }

  handleNavigate() {
    if (!this.navigatePageNumber) return;
    let n = this.navigatePageNumber;
    if (n < 1) n = 1;
    if (n > this.totalPage) n = this.totalPage;
    this.navigate.emit(n);
    this.navigatePageNumber = null;
  }
}
