import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { Router } from "@angular/router";
import { constants } from "../../helpers/constants";
import { Subscription } from "rxjs";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingService } from "../../services/prospecting.service";
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'suppression-list-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './suppression-list-card.component.html',
  styleUrl: './suppression-list-card.component.scss'
})
export class SuppressionListCardComponent implements OnInit, OnDestroy {
  @Input() tableHeaderBg;
  @Input() tableHeaderColor;
  @Input() cardData = [];
  @Input() selectedContacts;
  @Input() isLoading: boolean = false;
  @Input() isWaitingFlag: boolean;
  @Input() checkboxClicked;
  @Input() paginationLeftArrowClick;
  @Input() paginationRightArrowClick;
  @Input() totalPage;
  @Input() currentPage;
  @Input() limit;
  @Input() totalRecordsCount;
  @Input() selectAllContacts;
  @Input() toggleSelectAllSelection;
  @Output() selectedLimit: EventEmitter<any> = new EventEmitter();

  public columnList: any[];
  /** Horizontal-scroll flag → drives the frozen checkbox column's right shadow. */
  scrolledX = false;
  public labelOptions: any[] = [];
  public list;
  public contactLabelsSubscription: Subscription;

  constructor(private router: Router, private modal: NgbModal, private prospectingService: ProspectingService, private host: ElementRef) {
  }

  ngOnInit(): void {
    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.lists.subscribe((labels) => {
      // Set label dropdown options
      this.labelOptions = labels;
    });

    this.getListViewData();
  }

  ngOnDestroy(): void {
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
  }

  ngAfterViewChecked() {
    this.calcWidth();
  }

  getListViewData = () => {
    // Percentage widths fill the card (checkbox is a fixed px column), matching
    // label-list-card. `table-layout: fixed; width: 100%` in the SCSS drives it.
    this.columnList = [
      { name: "", key: "action", width: "58px" },
      { name: "First Name", key: "contactFirstName", width: "22%" },
      { name: "Last Name", key: "contactLastName", width: "22%" },
      { name: "Email", key: "contactEmail", width: "56%" },
    ];
  };

  browserWidthForTable;
  calcWidth = () => {
    // The table is width:100% now, so we only need the wrapper's own width for the
    // empty/loading state span (fall back to viewport − sidebar before layout).
    const sidebarWidth = document.getElementById("main-sidebar")?.clientWidth || 0;
    const wrapper = this.host?.nativeElement?.querySelector(".new-table-wrapper") as HTMLElement | null;
    this.browserWidthForTable = wrapper?.clientWidth || (window.innerWidth - sidebarWidth - 48);
  };

  /** Toggle the frozen-column shadow only on the 0 ↔ scrolled boundary. */
  onTableScroll = (event: Event) => {
    const scrolled = (event.target as HTMLElement).scrollLeft > 0;
    if (scrolled !== this.scrolledX) this.scrolledX = scrolled;
  };

  isFirstPage = () => this.currentPage <= 1;
  isLastPage = () => this.currentPage >= this.totalPage;

  trackByRow = (_: number, row: any) => row?.id;

  onShowEntriesSelect = ($event) => {
    this.selectedLimit.emit(this.limit);
  };

  isRowSelected = (row) => {
    return this.selectedContacts.findIndex(i => i.id.toString() === row.id.toString()) > -1;
  };

  selectedItemCount;
  getSelectedItemCount = () => {
    this.selectedItemCount = this.cardData.filter((i) => i.is_selected).length;
    return this.selectedItemCount;
  };

  getCheckboxIcon(): string {
    if (this.selectedItemCount === 0) return "fa fa-square-o checkbox-icon";
    if (this.selectedItemCount > 0 && this.selectedItemCount < this.cardData.length) return "fa fa-minus-square-o";
    return "fa fa-check-square-o";
  }

  protected readonly constants = constants;
}
