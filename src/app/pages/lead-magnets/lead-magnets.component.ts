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
import Swal from 'sweetalert2';
import { LeadMagnetService } from '../../services/lead-magnet.service';
import { PaginationComponent } from '../../components/pagination/pagination.component';

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
    PaginationComponent,
  ],
  templateUrl: './lead-magnets.component.html',
  styleUrl: './lead-magnets.component.scss',
})
export class LeadMagnetsComponent implements OnInit, OnDestroy, AfterViewChecked {
  userData;
  supplierId;
  totalContactsCount;
  isWaitingFlag: boolean = true;
  isLoading: boolean = false;
  selectedLeadMagnet = [];
  page = 1;
  limit = 100;
  totalPage;
  lmListSubscription: Subscription;
  leadMagnets: any[] = [];
  public tableWidth = 500;
  public columnList: any[];
  public showNavigationInput: boolean = false;
  public navigatePageNumber;
  public loadingSubscription: Subscription;

  tableHeaderBg = '#0047CC';
  tableHeaderColor = '#FFFFFF';


  constructor(
    private _authService: AuthService,
    private leadMagnetService: LeadMagnetService,
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
      { name: 'Lead Magnet Url', key: 'leadMagnetUrl', width: 150 },
      { name: 'Anchor Text', key: 'anchorText', width: 150 },
      { name: 'Summary', key: 'summary', width: 300 },
    ];


    // Set pagination limit from localstorage if found
    const limit = localStorage.getItem(constants.LEAD_MAGNET_PAGINATION_LIMIT);
    if (limit) {
      this.limit = parseInt(limit);
    }

    this.lmListSubscription = this.leadMagnetService.leadMagnets.subscribe((data) => {
      console.log({ data });
      this.leadMagnets = data.leadMagnets;
      this.totalContactsCount = data.total || 1;
      this.totalPage = Math.ceil(this.totalContactsCount / this.limit);
    });


    await this.getLeadMagnets();
    // set pagination data in service
    this.leadMagnetService.lmCurrentPage = this.page;
    this.leadMagnetService.lmLimit = this.limit;
    this.isWaitingFlag = false;
  }

  getLeadMagnets = async () => {
    const postData = {
      limit: this.limit,
      page: this.page,
      companyId: this.supplierId
    };
    try {
      await this.leadMagnetService.getAll(postData);
    } catch (e) {
      await Swal.fire('Error', e, 'error');
    }
  };


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
    if (row[column.key]) {
      return row[column.key];
    }
  };


  onCheckboxClicked = (event, data) => {
    this.stopPropagation(event);
    console.log('lead', data);
    this.handleContactSelect(data);
  };

  handleContactSelect = (selectedRow) => {
    const rowIndex = this.leadMagnets.findIndex((i) => i.id === selectedRow.id);
    this.leadMagnets[rowIndex].isSelected = !this.leadMagnets[rowIndex].isSelected;

    if (this.leadMagnets[rowIndex].isSelected) {
      const index = this.selectedLeadMagnet.findIndex(
        (j) => j.id === this.leadMagnets[rowIndex].id,
      );
      if (index === -1) {
        this.selectedLeadMagnet.push(this.leadMagnets[rowIndex]);
      }
    } else {
      const index = this.selectedLeadMagnet.findIndex(
        (j) => j.id === this.leadMagnets[rowIndex].id,
      );
      if (index > -1) {
        this.selectedLeadMagnet.splice(index, 1);
      }
    }

    // Reset select all contact
    // this.selectAllContacts = false;
    // this.prospectingService.selectedAllContacts = this.selectAllContacts;

    // Save selected contact in service inorder to use it in contact add or edit sidebar.
    this.leadMagnetService.selectedLeadMagnet = this.selectedLeadMagnet;
  };


  stopPropagation = (event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();
  };

  onShowEntriesSelect = (limit) => {
    this.receivedLimitNumber(limit).then();
  };

  receivedLimitNumber = async (limit) => {
    this.limit = parseInt(limit);
    localStorage.setItem(constants.LEAD_MAGNET_PAGINATION_LIMIT, limit);
    this.page = 1;

    // set pagination data in service
    this.leadMagnetService.lmCurrentPage = this.page;
    this.leadMagnetService.lmLimit = this.limit;

    this.isWaitingFlag = true;
    await this.getLeadMagnets();
    this.isWaitingFlag = false;
  };

  showHideNavigationInput = () => {
    this.showNavigationInput = !this.showNavigationInput;
  };

  paginationRightArrowClick = async () => {
    if (this.page === this.totalPage) return;

    this.page += 1;
    await this.getLeadMagnets();
  };

  paginationLeftArrowClick = async () => {
    if (this.page === 1) return; // Here added 1 with page because page starts with 0

    this.page -= 1;
    await this.getLeadMagnets();
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
