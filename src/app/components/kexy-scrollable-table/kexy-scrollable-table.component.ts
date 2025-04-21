import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingService } from "../../services/prospecting.service";
import {
  ContactLabelsModalContentComponent,
} from "../contact-labels-modal-content/contact-labels-modal-content.component";
import { constants } from "../../helpers/constants";
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'kexy-scrollable-table',
  imports: [
    KexyButtonComponent,
    FormsModule,
    CommonModule,
  ],
  templateUrl: './kexy-scrollable-table.component.html',
  styleUrl: './kexy-scrollable-table.component.scss'
})
export class KexyScrollableTableComponent {
  @Input() tableHeaderBg;
  @Input() tableHeaderColor;
  @Input() cardData = [];
  @Input() isLoading: boolean = false;
  @Input() isWaitingFlag: boolean;
  @Input() checkboxClicked;
  @Input() paginationLeftArrowClick;
  @Input() paginationRightArrowClick;
  @Input() totalPage;
  @Input() currentPage;
  @Input() saveBtnClick;
  @Input() backBtnClick;
  @Input() selectedContactCount;
  @Input() navigateSpecificPage;

  public tableWidth = 500;
  public columnList: any[];
  public userData;
  public limit = 10;
  public savedContacts;
  public showNavigationInput: boolean = false;
  public navigatePageNumber;
  public loadingSubscription: Subscription;

  constructor(
    private _authService: AuthService,
    private modal: NgbModal,
    private prospectingService: ProspectingService,
  ) {
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.getListViewData();
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
  }

  ngAfterViewChecked() {
    this.calcWidth();
  }

  getListViewData = () => {
    let columnList: any;
    columnList = [
      { name: "", key: "action", width: 30 },
      { name: "Name", key: "name", width: 100 },
      { name: "Linkedin", key: "linkedin_url", width: 60 },
      { name: "Job Title", key: "job_title", width: 120 },
      { name: "Company Name", key: "company_name", width: 120 },
      { name: "City", key: "city", width: 80 },
      { name: "State", key: "state", width: 80 },
      { name: "Email Status", key: "email_status", width: 120 },
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

  getCellClasses = (column) => {
    let classes = {
      "n-cell-only-name": column.key === "no",
      "col-zip": column.key === "zip_code",
    };

    return Object.keys(classes)
      .filter((key) => classes[key])
      .join(" ");
  };

  getCellValueToDisplay = (row, column) => this.getCellValue(row, column);

  getCellValue = (row, column) => {
    let path = column.key.split("#");
    let value = row[path.shift()];
    if (path.length) {
      value = value[path.shift()];
    }
    return value;
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

  openShowAllLabelModal = (event, labelsArray) => {
    this.stopPropagation(event);
    this.prospectingService.selectedContactLabels = labelsArray;
    this.modal.open(ContactLabelsModalContentComponent);
  };

  checkboxClickHandle = (row) => {
    console.log(row);
    this.checkboxClicked(row);
  };

  // isContactSaved = (contact) => {
  //   if (!this.savedContacts) {
  //     this.savedContacts = this.prospectingService.allContacts;
  //   }
  //   console.log(this.savedContacts);
  //   console.log({ contact });
  //   if (this.savedContacts?.length) {
  //     const index = this.savedContacts.findIndex(savedContact => savedContact.details.includes(contact.id));
  //     console.log({ index });
  //     if (index > -1) {
  //       contact['saved'] = true;
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  protected readonly constants = constants;

  backBtnClickHandler = ($event: MouseEvent) => {
    $event.preventDefault();
    this.backBtnClick();
  };

  showHideNavigationInput = () => {
    this.showNavigationInput = !this.showNavigationInput;
  };

  handleNavigate = () => {
    if (this.navigatePageNumber < 1) this.navigatePageNumber = 1;
    if (this.navigatePageNumber > this.totalPage) this.navigatePageNumber = parseInt(this.totalPage);
    this.navigateSpecificPage(this.navigatePageNumber);
    this.showNavigationInput = false;
  };
}
