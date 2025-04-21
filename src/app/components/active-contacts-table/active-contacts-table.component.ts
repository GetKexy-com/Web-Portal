import { AfterViewChecked, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { constants } from "../../helpers/constants";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingService } from "../../services/prospecting.service";
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {FormsModule} from '@angular/forms';
import {
  ContactDetailsModalContentComponent
} from '../contact-details-modal-content/contact-details-modal-content.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'active-contacts-table',
  imports: [
    KexyButtonComponent,
    FormsModule,
    CommonModule,
  ],
  templateUrl: './active-contacts-table.component.html',
  styleUrl: './active-contacts-table.component.scss'
})
export class ActiveContactsTableComponent {
  @Input() tableHeaderBg;
  @Input() tableHeaderColor;
  @Input() cardData = [];
  @Input() selectedContacts = [];
  @Input() isLoading: boolean = false;
  @Input() isWaitingFlag: boolean;
  @Input() checkboxClicked;
  @Input() unenrollBtnClicked;
  @Input() paginationLeftArrowClick;
  @Input() paginationRightArrowClick;
  @Input() totalPage;
  @Input() currentPage;
  @Input() limit;
  @Output() selectedLimit: EventEmitter<any> = new EventEmitter();

  public tableWidth = 800;
  public columnList: any[];

  constructor(private prospectingService: ProspectingService, private modal: NgbModal) {}

  ngOnInit(): void {
    this.getListViewData();
  }

  ngOnDestroy(): void {}

  ngAfterViewChecked() {
    this.calcWidth();
  }

  getListViewData = () => {
    let columnList: any;
    columnList = [
      { name: "", key: "action", width: 40 },
      { name: "Name", key: "name", width: 120 },
      { name: "Email Address", key: "email", width: 180 },
    ];
    this.columnList = columnList;
  };

  browserWidthForTable;
  calcWidth = () => {
    // const sidebarWidth = document.getElementById("main-sidebar")?.clientWidth;
    // const pageMargin = 48;
    // let sum = 300;
    // let map = {};
    // this.columnList.forEach((column) => {
    //   sum += column.width;
    //   map[column.key] = column.width;
    // });
    this.browserWidthForTable = this.tableWidth;
    // this.tableWidth = this.browserWidthForTable > sum ? this.browserWidthForTable : sum;
  };

  getCellValue = (row, column) => {
    const details = typeof row.details === "string" ? JSON.parse(row.details) : row.details;
    if (details[column.key]) {
      return details[column.key];
    }
  };

  selectedItemCount;
  isNoItemSelected = () => {
    this.selectedItemCount = this.cardData.filter((i) => i.is_selected).length;
    return this.selectedItemCount === 0;
  };

  stopPropagation = (event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();
  };

  onCheckboxClicked = (event, data) => {
    this.stopPropagation(event);
    this.checkboxClicked(data);
  }

  handleRowClick = (event, data) => {
    this.stopPropagation(event);
    this.prospectingService.selectedContactForShowDetails = data;
    this.modal.open(ContactDetailsModalContentComponent, {size: "lg"});
  }

  onShowEntriesSelect = ($event) => {
    this.selectedLimit.emit(this.limit);
  };

  protected readonly constants = constants;
}
