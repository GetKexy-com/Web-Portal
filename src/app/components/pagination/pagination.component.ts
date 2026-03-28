import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-pagination',
  imports: [
    FormsModule,
    NgIf,
  ],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input() page!: number;
  @Input() totalPage!: number;
  @Input() isLoading!: boolean;
  @Input() limit!: number;

  @Output() left = new EventEmitter<void>();
  @Output() right = new EventEmitter<void>();
  @Output() limitChange = new EventEmitter<number>();

  onLimitChange(event: any) {
    this.limitChange.emit(Number(event.target.value));
  }
}
