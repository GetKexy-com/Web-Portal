import { AfterViewChecked, Component, OnDestroy, OnInit } from '@angular/core';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { DatePipe, DecimalPipe, NgForOf, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProspectingService } from '../../services/prospecting.service';
import { Router } from '@angular/router';
import { constants } from '../../helpers/constants';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Contact } from '../../models/Contact';

@Component({
  selector: 'app-lead-magnets',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    NgIf,
    DatePipe,
    DecimalPipe,
    FormsModule,
    NgForOf,
    ReactiveFormsModule,
  ],
  templateUrl: './lead-magnets.component.html',
  styleUrl: './lead-magnets.component.scss',
})
export class LeadMagnetsComponent implements OnInit, OnDestroy, AfterViewChecked {
  userData;
  supplierId;
  contactList = [];
  totalContactsCount = 0;
  isWaitingFlag: boolean = true;
  isLoading: boolean = false;
  selectedContacts = [];
  page = 1;
  limit = 100;
  totalPage;
  lmListSubscription: Subscription;
  contacts: any[] = [];
  public tableWidth = 500;
  public columnList: any[];
  public showNavigationInput: boolean = false;
  public navigatePageNumber;
  public loadingSubscription: Subscription;

  tableHeaderBg = '#0047CC';
  tableHeaderColor = '#FFFFFF';


  constructor(
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private router: Router,
  ) {
    // override the route reuse strategy
    this.router.routeReuseStrategy.shouldReuseRoute = function() {
      return false;
    };
  }

  async ngOnInit() {
    document.title = 'Lead Magnets - KEXY Brand Portal';
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    this.columnList = [
      { name: '', key: 'action', width: 40 },
      { name: 'Lead Magnet Url', key: 'lead_magnet_url', width: 120 },
      { name: 'Anchor Text', key: 'anchor_text', width: 70 },
      { name: 'Summary', key: 'summary', width: 180 },
      { name: 'Created', key: 'created', width: 160 },
    ];


    // Set pagination limit from localstorage if found
    const limit = localStorage.getItem(constants.CONTACTS_TABLE_PAGINATION_LIMIT);
    if (limit) {
      this.limit = parseInt(limit);
    }

    // set pagination data in service
    this.prospectingService.lmCurrentPage = this.page;
    this.prospectingService.lmLimit = this.limit;
    this.isWaitingFlag = false;
  }

  ngOnDestroy() {
    if (this.lmListSubscription) this.lmListSubscription.unsubscribe();
  }

  editLeadMagnetClick = () => {

  };

  addLeadMagnetClick = () => {

  };

  deleteLeadMagnets = () => {

  };

  editContact = (data) => {

  };

  getCellClasses = (column) => {
    let classes = {
      'n-cell-only-name': column.key === 'no',
      'col-zip': column.key === 'zip_code',
    };

    return Object.keys(classes)
      .filter((key) => classes[key])
      .join(' ');
  };

  getCellValueToDisplay = (row, column) => this.getCellValue(row, column);

  getCellValue = (row, column) => {
    const details = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;

    if (details[column.key]) {
      return details[column.key];
    }
  };


  onCheckboxClicked = (event, data) => {
    this.stopPropagation(event);
    console.log('contact', data);
    this.handleContactSelect(data);
  };

  handleContactSelect = (selectedRow) => {
    const rowIndex = this.contactList.findIndex((i) => i.id === selectedRow.id);
    this.contactList[rowIndex].isSelected = !this.contactList[rowIndex].isSelected;

    if (this.contactList[rowIndex].isSelected) {
      const index = this.selectedContacts.findIndex(
        (j) => j.id === this.contactList[rowIndex].id,
      );
      if (index === -1) {
        this.selectedContacts.push(this.contactList[rowIndex]);
      }
    } else {
      const index = this.selectedContacts.findIndex(
        (j) => j.id === this.contactList[rowIndex].id,
      );
      if (index > -1) {
        this.selectedContacts.splice(index, 1);
      }
    }

    // Reset select all contact
    // this.selectAllContacts = false;
    // this.prospectingService.selectedAllContacts = this.selectAllContacts;

    // Save selected contact in service inorder to use it in contact add or edit sidebar.
    this.prospectingService.selectedContactsInContactsPage = this.selectedContacts;
  };


  stopPropagation = (event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();
  };

  onShowEntriesSelect = ($event) => {
    this.receivedLimitNumber(this.limit);
  };

  receivedLimitNumber = async (limit) => {
    this.limit = parseInt(limit);
    localStorage.setItem(constants.CONTACTS_TABLE_PAGINATION_LIMIT, limit);
    this.page = 1;

    // set pagination data in service
    this.prospectingService.brandContactCurrentPage = this.page;
    this.prospectingService.brandContactContactLimit = this.limit;

    this.isWaitingFlag = true;
    // await this.getContacts(true);
    this.isWaitingFlag = false;
  };

  showHideNavigationInput = () => {
    this.showNavigationInput = !this.showNavigationInput;
  };

  paginationRightArrowClick = async () => {
    if (this.page === this.totalPage) return;

    this.page += 1;
    // await this.getPaginatedContacts();
  };

  paginationLeftArrowClick = async () => {
    if (this.page === 1) return; // Here added 1 with page because page starts with 0

    this.page -= 1;
    // await this.getPaginatedContacts();
  };


  ngAfterViewChecked() {
    this.calcWidth();
  }

  browserWidthForTable;
  calcWidth = () => {
    const sidebarWidth = document.getElementById('main-sidebar')?.clientWidth;
    const pageMargin = 48;
    let sum = 300;
    let map = {};
    this.columnList.forEach((column) => {
      sum += column.width;
      map[column.key] = column.width;
    });

    // In smaller devices there is no fixed sidebar
    if (sidebarWidth) {
      this.browserWidthForTable = window.innerWidth - sidebarWidth - pageMargin;
    } else {
      this.browserWidthForTable = window.innerWidth - pageMargin;
    }
    this.tableWidth = this.browserWidthForTable > sum ? this.browserWidthForTable : sum;
  };


}
