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
  @Input() deleteContactsFromList;
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
  // Emitted when an async CSV import finishes (status = complete) with the final
  // status body ({ importedCount, skippedCount, skipped[], total }). The parent
  // reloads contacts and opens the import-results modal.
  @Output() importCompleted: EventEmitter<any> = new EventEmitter();

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
      // Seed the card-local status from the bound list (e.g. a list already
      // mid-verification when the card loads). On pages without a listInfo
      // (brand-contacts) this branch never runs, so a selected-contacts run's
      // status is preserved.
      this.validationStatus = this.listInfo?.validationStatus ?? null;
      if (this.isValidationProgress()) this.startValidationPolling();
      else this.stopValidationPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
    this.stopValidationPolling();
    this.stopImportPolling();
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
  // Contacts being verified when only a checked subset was submitted — polling
  // then reads status from lists/contacts/validation-status?contactIds=… instead
  // of the whole-list endpoint. null means a full-list run.
  private validatingContactIds: number[] | null = null;
  // Card-local verification status — the single source of truth for the banner
  // and polling. On list pages it's seeded from (and mirrored back to)
  // listInfo.validationStatus so siblings sharing the same listObj (e.g.
  // prospecting-common-card's verified badge) stay in sync. On the brand-contacts
  // page there's no listInfo, so this tracks a selected-contacts run on its own.
  public validationStatus: string | null = null;

  isValidationProgress = () => {
    return this.validationStatus === 'pending' ||
      this.validationStatus === 'inprogress' ||
      this.validationStatus === 'in_queue';
  };

  // Update the card status and mirror it onto the shared listObj when present.
  private setValidationStatus = (status: string) => {
    this.validationStatus = status;
    if (this.listInfo) this.listInfo.validationStatus = status;
  };

  validateList = async () => {
    const selectedIds = this.contacts.filter((c) => c.isSelected).map((c) => c.id);
    // "Select all" spans every page, so verify the WHOLE list by id (backend
    // verifies all its contacts) rather than just the loaded page's ids. Otherwise
    // verify the checked subset, or — with nothing checked — the whole list.
    // The API wants EXACTLY ONE of listId / contactIds.
    const useWholeList = (this.selectAllContacts && !!this.listInfo?.id) || !selectedIds.length;
    // Whole-list verification needs a list. Without one (brand-contacts page) a
    // selection is required — guard so we never post an empty/invalid payload.
    if (useWholeList && !this.listInfo?.id) {
      await this.pageUiService.showSweetAlert(
        'No contacts selected',
        'Please select the contact(s) you want to verify.',
        'info',
      );
      return;
    }
    const postData: { listId?: number; contactIds?: number[] } = useWholeList
      ? { listId: this.listInfo.id }
      : { contactIds: selectedIds };
    // Remember the subset (if any) so polling reads its status from the contactIds
    // endpoint; null means a whole-list run.
    this.validatingContactIds = useWholeList ? null : selectedIds;
    try {
      this.validationLoading = true;
      await this.prospectingService.validateList(postData);
      this.setValidationStatus('pending');
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
    // Need something to poll: a checked subset (contactIds) or a whole list (listInfo.id).
    if (this.validationPoll || !this.isValidationProgress()) return;
    if (!this.validatingContactIds?.length && !this.listInfo?.id) return;

    const poll = async () => {
      try {
        const res: any = this.validatingContactIds?.length
          ? await this.prospectingService.getContactsValidationStatus(this.validatingContactIds)
          : await this.prospectingService.getValidationStatus(this.listInfo.id);
        const data = res?.data ?? res; // tolerate wrapped { success, data } or bare body
        if (data) {
          const wasInProgress = this.isValidationProgress();
          if (data.validationStatus != null) this.setValidationStatus(data.validationStatus);
          if (typeof data.progress === 'number') this.validationProgress = data.progress;

          if (wasInProgress && !this.isValidationProgress()) {
            if (this.validationStatus === 'complete') this.onValidationComplete(data);
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
    this.validatingContactIds = null;
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
      ? `${verified} of ${total} email(s) valid.`
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

  // ── Async CSV import progress ─────────────────────────────────────────────
  // A CSV import is queued via POST contacts (returns { importId }); the card
  // then polls GET contacts/import/:id and shows a live-progress banner (same
  // model as list validation above). On completion it emits importCompleted with
  // the final body so the parent can refresh + open the import-results modal.
  public importStatus: string | null = null;
  public importProgress: number = 0;
  private importId: number | null = null;
  private importPoll: any = null;
  // Adaptive poll: 2s normally, but back off to 4s after several identical
  // progress readings (import stalled/slow), then snap back to 2s once it moves.
  private readonly IMPORT_POLL_FAST = 2000;
  private readonly IMPORT_POLL_SLOW = 4000;
  private readonly IMPORT_STALE_LIMIT = 3;
  private importLastProgress = -1;
  private importSameCount = 0;

  isImportProgress = () => {
    return this.importStatus === 'in_queue' ||
      this.importStatus === 'inprogress';
  };

  // Show the progress banner IMMEDIATELY (before the importId is known) so it
  // appears the moment the preview modal closes. startImportPolling() then takes
  // over once POST contacts responds; cancelImport() clears it if that POST fails.
  beginImport = () => {
    this.importId = null;
    this.importStatus = 'in_queue';
    this.importProgress = 0;
  };

  cancelImport = () => {
    this.stopImportPolling();
    this.importStatus = null;
    this.importProgress = 0;
  };

  // Called by the parent page right after POST contacts returns an importId.
  startImportPolling = (importId: number) => {
    if (importId == null) return;
    this.importId = importId;
    this.importStatus = 'in_queue';
    this.importProgress = 0;
    if (this.importPoll) return;
    this.importLastProgress = -1;
    this.importSameCount = 0;

    // Recursive setTimeout (not setInterval) so the delay can adapt each tick.
    const scheduleNext = () => {
      const delay = this.importSameCount >= this.IMPORT_STALE_LIMIT
        ? this.IMPORT_POLL_SLOW
        : this.IMPORT_POLL_FAST;
      this.importPoll = setTimeout(poll, delay);
    };

    const poll = async () => {
      this.importPoll = null;
      try {
        const res: any = await this.prospectingService.getImportStatus(this.importId);
        const data = res?.data ?? res; // tolerate wrapped { success, data } or bare body
        if (data) {
          const wasInProgress = this.isImportProgress();
          if (data.status != null) this.importStatus = data.status;
          if (typeof data.progress === 'number') {
            // Track how many consecutive polls returned the same progress to
            // decide the next interval.
            if (data.progress === this.importLastProgress) {
              this.importSameCount++;
            } else {
              this.importSameCount = 0;
              this.importLastProgress = data.progress;
            }
            this.importProgress = data.progress;
          }

          if (wasInProgress && !this.isImportProgress()) {
            if (this.importStatus === 'complete') this.onImportComplete(data);
            else this.onImportFailed(data); // 'failed'
          }
        }
      } catch {
        // Ignore transient errors and keep polling.
      }
      if (this.isImportProgress()) scheduleNext();
      else this.stopImportPolling();
    };

    poll();
  };

  private stopImportPolling = () => {
    if (this.importPoll) {
      clearTimeout(this.importPoll);
      this.importPoll = null;
    }
    this.importId = null;
  };

  private onImportComplete = (data: any) => {
    this.importProgress = 100;
    // Parent reloads contacts and opens the import-results modal (skipped rows).
    this.importCompleted.emit(data);
  };

  private onImportFailed = (data: any) => {
    this.pageUiService.showSweetAlert(
      'Import failed',
      data?.error || 'Something went wrong while importing contacts. Please try again.',
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
