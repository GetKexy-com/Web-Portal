import { AfterViewChecked, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
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
export class SuppressionListCardComponent {
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

  public tableWidth = 500;
  public columnList: any[];
  public labelOptions: any[] = [];
  public list;
  public contactLabelsSubscription: Subscription;

  constructor(private router: Router, private modal: NgbModal, private prospectingService: ProspectingService) {
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
    let columnList: any;
    columnList = [
      { name: "", key: "action", width: 50 },
      { name: "First Name", key: "contact_first_name", width: 120 },
      { name: "Last Name", key: "contact_last_name", width: 120 },
      { name: "Email", key: "contact_email", width: 120 },
    ];
    this.columnList = columnList;
  };

  browserWidthForTable;
  calcWidth = () => {
    const sidebarWidth = document.getElementById("main-sidebar")?.clientWidth;
    const pageMargin = 48;
    let sum = 300;
    let map = {};
    this.columnList.forEach((column) => {
      sum += column.width;
      map[column.key] = column.width;
    });
    this.browserWidthForTable = window.innerWidth - sidebarWidth - pageMargin;
    this.tableWidth = this.browserWidthForTable > sum ? this.browserWidthForTable : sum;
  };

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
