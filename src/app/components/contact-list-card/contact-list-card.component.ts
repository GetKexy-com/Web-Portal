import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { constants } from '../../helpers/constants';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  ContactLabelsModalContentComponent,
} from '../contact-labels-modal-content/contact-labels-modal-content.component';
import { ProspectingService } from '../../services/prospecting.service';
import { PageUiService } from '../../services/page-ui.service';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Contact } from '../../models/Contact';
import Swal from 'sweetalert2';

@Component({
  selector: 'contact-list-card',
  imports: [
    KexyButtonComponent,
    DecimalPipe,
    FormsModule,
    DatePipe,
    CommonModule,
  ],
  templateUrl: './contact-list-card.component.html',
  styleUrl: './contact-list-card.component.scss',
})
export class ContactListCardComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() tableHeaderBg;
  @Input() tableHeaderColor;
  @Input() contacts: Contact[] = [];
  @Input() selectedContacts = [];
  @Input() isLoading: boolean = false;
  @Input() isWaitingFlag: boolean;
  @Input() listInfo;
  @Input() checkboxClicked;
  @Input() createContactClick;
  @Input() importBtnClick;
  @Input() deleteContacts;
  @Input() editContact;
  @Input() paginationLeftArrowClick;
  @Input() paginationRightArrowClick;
  @Input() navigateSpecificPage;
  @Input() totalPage;
  @Input() totalContactsCount;
  @Input() currentPage;
  @Input() searchLabels;
  @Input() searchContactName;
  @Input() searchContactCity;
  @Input() searchContactState;
  @Input() searchContactCountry;
  @Input() searchContactMarketingStatus;
  @Input() searchContactEmailStatus;
  @Input() resetSearchData;
  @Input() limit;
  @Input() backBtnClick;
  @Input() showBackBtn = false;
  @Input() showTitle = true;
  @Input() showActionBtns = false;
  @Input() sortByCreatedAt;
  @Input() activeFilterClick;
  @Input() activeFilterCount;
  @Input() selectAllContacts;
  @Input() toggleSelectAllContactSelection;
  @Output() selectedLimit: EventEmitter<any> = new EventEmitter();

  public tableWidth = 500;
  public columnList: any[];
  public userData;
  public showNavigationInput: boolean = false;
  public navigatePageNumber;
  public loadingSubscription: Subscription;

  constructor(private _authService: AuthService, private modal: NgbModal, private prospectingService: ProspectingService, private pageUiService: PageUiService) {
  }

  ngAfterViewInit() {
    this.getListViewData();
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    console.log(this.contacts);
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
      { name: '', key: 'action', width: 40 },
      { name: 'Name', key: 'name', width: 120 },
      { name: 'Linkedin', key: 'linkedinUrl', width: 70 },
      { name: 'Email Address', key: 'email', width: 180 },
      { name: 'Email Status', key: 'email_status', width: 120 },
      { name: 'Job Title', key: 'title', width: 170 },
      { name: 'Company Name', key: 'company_name', width: 160 },
      { name: 'Phone Number', key: 'phone_number', width: 120 },
      { name: 'City', key: 'city', width: 100 },
      { name: 'State/Province', key: 'state', width: 100 },
      { name: 'Country', key: 'country', width: 120 },
      { name: 'Lists', key: 'label', width: 130 },
      { name: 'Marketing Status', key: 'marketing_status', width: 120 },
      { name: 'Created', key: 'created', width: 160 },
    ];
    this.columnList = columnList;
  };

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

  public validationLoading: boolean = false;

  isValidationProgress = () => {
    return this.listInfo && (this.listInfo.validationStatus === 'pending' || this.listInfo.validationStatus === 'inprogress');
  };

  validateList = async () => {
    const postData = {
      listId: this.listInfo.id,
    };
    try {
      this.validationLoading = true;
      await this.prospectingService.validateList(postData);
      this.listInfo.validationStatus = 'pending';
      await this.pageUiService.showSweetAlert(
        'Verification started',
        'An email notification will be sent to you upon completion of the varification process.',
        'info',
      );
    } catch (e) {
      await Swal.fire('Error', e.message);
    } finally {
      this.validationLoading = false;
    }
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
    if (column.key === 'company_name') {
      return details.organization?.name || '';
    }
    if (column.key === 'phone_number') {
      return `${details.organization?.phone || ''}`;
    }
  };

  selectedItemCount;
  getSelectedItemCount = () => {
    this.selectedItemCount = this.contacts.filter((i) => i.isSelected).length;
    return this.selectedItemCount;
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

  onCheckboxClicked = (event, data) => {
    this.stopPropagation(event);
    console.log('contact', data);
    this.checkboxClicked(data);
  };

  protected readonly constants = constants;

  // resetSearchDataClicked($event) {
  //   $event.preventDefault();
  //   this.resetSearchData();
  // }

  onShowEntriesSelect = ($event) => {
    this.selectedLimit.emit(this.limit);
  };

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

  isValidLinkedinUrl(url: string): boolean {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();

    // Basic validation: must start with linkedin.com/in/ or linkedin.com/company/
    return trimmed.includes('linkedin.com/in/') || trimmed.includes('linkedin.com/company/');
  }
}
