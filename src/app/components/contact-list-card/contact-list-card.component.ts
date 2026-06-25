import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
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
export class ContactListCardComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
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
  // Emitted when email verification finishes so the parent page can reload the
  // contacts and show the updated email statuses.
  @Output() refreshContacts: EventEmitter<void> = new EventEmitter();

  public tableWidth = 500;
  public columnList: any[];
  public userData;
  public showNavigationInput: boolean = false;
  public navigatePageNumber;
  public loadingSubscription: Subscription;

  constructor(private _authService: AuthService, private modal: NgbModal, private prospectingService: ProspectingService, private pageUiService: PageUiService, private host: ElementRef) {
  }

  ngAfterViewInit() {
    this.getListViewData();
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    console.log(this.contacts);
  }

  // Start/stop polling whenever the bound list changes (e.g. a list that's
  // already mid-verification when the card loads).
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['listInfo']) {
      if (this.isValidationProgress()) this.startValidationPolling();
      else this.stopValidationPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
    this.stopValidationPolling();
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

    // Prefer the table wrapper's own width so the table fills the available space
    // on first render, instead of depending on #main-sidebar (not measurable for
    // ~1-2s after load → table snapped from the narrow column-sum to full width).
    const wrapper = this.host?.nativeElement?.querySelector('.new-table-wrapper') as HTMLElement | null;
    if (wrapper?.clientWidth) {
      this.browserWidthForTable = wrapper.clientWidth;
    } else if (sidebarWidth) {
      // In smaller devices there is no fixed sidebar
      this.browserWidthForTable = window.innerWidth - sidebarWidth - pageMargin;
    } else {
      this.browserWidthForTable = window.innerWidth - pageMargin;
    }
    this.tableWidth = this.browserWidthForTable > sum ? this.browserWidthForTable : sum;
  };

  public validationLoading: boolean = false;
  // Live verification progress 0–100 from the backend (climbs to 99 while running,
  // hits 100 only when status flips to complete). Drives the banner % + bar.
  public validationProgress: number = 0;
  private validationPoll: any = null;
  private readonly VALIDATION_POLL_MS = 5000;

  isValidationProgress = () => {
    return this.listInfo && (
      this.listInfo.validationStatus === 'pending' ||
      this.listInfo.validationStatus === 'inprogress' ||
      this.listInfo.validationStatus === 'in_queue'
    );
  };

  validateList = async () => {
    const postData = {
      listId: this.listInfo.id,
    };
    try {
      this.validationLoading = true;
      await this.prospectingService.validateList(postData);
      this.listInfo.validationStatus = 'pending';
      this.startValidationPolling();
      await this.pageUiService.showSweetAlert(
        'Verification started',
        'We\'ll notify you by email when the verification process is complete.',
        'info',
      );
    } catch (e) {
      await Swal.fire('Error', e.message);
    } finally {
      this.validationLoading = false;
    }
  };

  // Poll GET lists/:id/validation-status while verification is running so the
  // banner shows a LIVE progress % (data.progress, real-time 0–100). Progress
  // climbs to 99 max during the run, then hits 100 only when validationStatus
  // becomes "complete" (that's when the breakdown is populated). On complete we
  // show the verified breakdown; on "not_validated" the job failed (progress
  // frozen) — the user can retry via the Verify button. Stops polling either way.
  private startValidationPolling = () => {
    if (this.validationPoll || !this.listInfo?.id || !this.isValidationProgress()) return;

    const poll = async () => {
      try {
        const res: any = await this.prospectingService.getValidationStatus(this.listInfo.id);
        const data = res?.data ?? res; // tolerate wrapped { success, data } or bare body
        if (data) {
          const wasInProgress = this.isValidationProgress();
          if (data.validationStatus != null) this.listInfo.validationStatus = data.validationStatus;
          if (typeof data.progress === 'number') this.validationProgress = data.progress;

          if (wasInProgress && !this.isValidationProgress()) {
            if (this.listInfo.validationStatus === 'complete') this.onValidationComplete(data);
            else this.onValidationFailed(); // 'not_validated' — job failed
          }
        }
      } catch {
        // Ignore transient errors and keep polling.
      }
      if (!this.isValidationProgress()) this.stopValidationPolling();
    };

    poll();
    this.validationPoll = setInterval(poll, this.VALIDATION_POLL_MS);
  };

  private stopValidationPolling = () => {
    if (this.validationPoll) {
      clearInterval(this.validationPoll);
      this.validationPoll = null;
    }
  };

  // Verification finished — surface the verified count from the (now-populated)
  // breakdown of the total.
  private onValidationComplete = (data: any) => {
    this.validationProgress = 100;
    // Reload the contacts so the new email statuses show without a manual refresh.
    this.refreshContacts.emit();
    const verified = data?.breakdown?.verified;
    const total = data?.total;
    const message = (verified != null && total != null)
      ? `${verified} of ${total} email(s) verified.`
      : 'Email verification has finished.';
    this.pageUiService.showSweetAlert('Verification complete', message, 'success');
  };

  // Verification failed (status "not_validated", progress frozen). Prompt a retry
  // — the existing "Verify Email(s)" button re-runs the job.
  private onValidationFailed = () => {
    this.pageUiService.showSweetAlert(
      'Verification failed',
      'Something went wrong while verifying emails. Please try again.',
      'error',
    );
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
