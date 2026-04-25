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
import { ProspectingContactsComponent } from '../../components/prospecting-contacts/prospecting-contacts.component';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { LeadMagnetFormComponent } from '../../components/lead-magnet-form/lead-magnet-form.component';

@Component({
  selector: 'app-lead-magnets',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    NgIf,
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
    private ngbOffcanvas: NgbOffcanvas,
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
      { name: 'Title', key: 'title', width: 150 },
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
      companyId: this.supplierId,
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
    console.log(this.selectedLeadMagnet);
    this.leadMagnetService.clickedEditLeadMagnet = this.selectedLeadMagnet;
    this.leadMagnetService.isAddNewButtonClicked = false;
    // Open slider
    this.openContactSlider();
  };

  addLeadMagnetClick = () => {
    // Set reference for add new button because we need to show blank form in slider...
    // We can select contact and then we can try to create new contact that's why
    this.leadMagnetService.isAddNewButtonClicked = true;

    // Open slider
    this.openContactSlider();

  };

  editContact = (data) => {
    console.log({ data });
    if (data) {
      this.leadMagnetService.clickedEditLeadMagnet = [data];
    }
    this.openContactSlider();
  };

  openContactSlider = () => {
    this.openSlider(LeadMagnetFormComponent);
  };

  openSlider = (component, sliderClass = 'contact-slide-content') => {
    this.ngbOffcanvas.open(component, {
      panelClass: `${sliderClass} edit-rep-canvas`,
      backdropClass: 'edit-rep-canvas-backdrop',
      position: 'end',
      scroll: false,
    });
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
      if (column.key !== 'leadMagnetUrl') {
        return this.truncateIfLong(row[column.key]);
      }
      return row[column.key];
    }
  };

  truncateIfLong(text, limit = 5) {
    const words = text.trim().split(/\s+/); // Splits by any whitespace

    if (words.length > limit) {
      return words.slice(0, limit).join(' ') + '...';
    }

    return text; // Returns original if 5 words or fewer
  }

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


  deleteLeadMagnets = async () => {
    let isConfirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: 'Yes, delete it!',
      showLoaderOnConfirm: true,
    });

    if (isConfirm.dismiss) {
      return;
    }

    Swal.fire({
      title: '',
      text: 'Please wait...',
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    Swal.showLoading();

    const ids = [];
    this.selectedLeadMagnet.forEach((magnet) => {
      ids.push(magnet.id);
    });
    // if (this.selectAllContacts) {
    //   postData['selectedAllContacts'] = true;
    //   postData['selectedAllContactsPayload'] = this.getContactsApiPostData();
    //   postData['contacts'] = [];
    // }
    try {
      await this.leadMagnetService.delete({ ids });
      await this.getLeadMagnets();
      this.selectedLeadMagnet = [];
      Swal.close();
    } catch (e) {
      Swal.close();
      await Swal.fire('Error', e.message);
    }
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
