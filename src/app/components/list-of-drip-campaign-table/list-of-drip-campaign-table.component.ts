import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { constants } from '../../helpers/constants';
import { routeConstants } from '../../helpers/routeConstants';
import { RouterLink } from '@angular/router';
import { ProspectingService } from '../../services/prospecting.service';
import { Subscription } from 'rxjs';
import { NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import {
  ContactLabelsModalContentComponent,
} from '../contact-labels-modal-content/contact-labels-modal-content.component';
import { DripCampaign, ICampaignIssue } from '../../models/DripCampaign';
import { ICampaignNextSend } from '../../models/EmailSendProgress';
import { SendCountdownComponent } from '../send-countdown/send-countdown.component';

/** Short words for each problem, shown in the row's chip (the popover has the full reason). */
const ISSUE_LABELS: Record<ICampaignIssue['code'], string> = {
  no_smtp: "Can't send · No SMTP",
  insights_blocked: "Can't send · emails on hold",
  sending_paused: 'On hold · sending paused',
  ai_paused: 'On hold · AI service',
  insights_paused: 'On hold · AI service',
  insights_daily_limit: 'Waiting · retries tomorrow',
};

@Component({
  selector: 'list-of-drip-campaign-table',
  imports: [
    FormsModule,
    DatePipe,
    NgClass,
    DecimalPipe,
    CommonModule,
    SendCountdownComponent,
    RouterLink,
    NgbPopover,
  ],
  templateUrl: './list-of-drip-campaign-table.component.html',
  // OnPush: these tables render hundreds of cells, and under the default
  // strategy every one of them was re-checked on every event anywhere in the app.
  // Every async boundary in here therefore has to markForCheck() explicitly.
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './list-of-drip-campaign-table.component.scss',
})
export class ListOfDripCampaignTableComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() tableHeaderBg;
  @Input() tableHeaderColor;
  @Input() cardData: DripCampaign[] = [];
  @Input() dripCampaignTitles = [];
  @Input() selectedDripCampaigns;
  @Input() isLoading: boolean = false;
  @Input() isWaitingFlag: boolean;
  @Input() checkboxClicked;
  @Input() paginationLeftArrowClick;
  @Input() paginationRightArrowClick;
  @Input() paginationFirstClick;
  @Input() paginationLastClick;
  @Input() navigateSpecificPage;
  @Input() totalPage = 1;
  @Input() currentPage;
  @Input() limit;
  @Input() totalRecordsCount;
  @Input() selectedAllDripCampaigns;
  @Input() toggleSelectAllSelection;
  @Input() initialStatusKey: string;
  /**
   * Each ACTIVE campaign's next send, by id (`GET drip-campaigns/next-sends`, loaded by
   * the page after the rows). Absent until loaded; null when nobody is owed an email.
   */
  @Input() nextSends: Record<number, ICampaignNextSend | null> = {};
  /** Why an ACTIVE campaign is not sending as it should, by id (`campaigns-attention`). */
  @Input() issues: Record<number, ICampaignIssue[]> = {};

  hasStop = (issues: ICampaignIssue[]) => issues.some((i) => i.severity === 'stop');

  /** How a row is coloured: red when it can't send until fixed, amber while it waits. */
  rowIssueTone = (row: any): 'stop' | 'wait' | null => {
    const list = row?.status === constants.ACTIVE ? this.issues[row.id] : null;
    if (!list?.length) return null;
    return this.hasStop(list) ? 'stop' : 'wait';
  };

  /** The chip's plain words for the most serious problem, "+N" when there are more. */
  issueLabel = (list: ICampaignIssue[]): string => {
    const main = list.find((i) => i.severity === 'stop') ?? list[0];
    const words = ISSUE_LABELS[main.code] ?? (main.severity === 'stop' ? "Can't send" : 'On hold');
    return list.length > 1 ? `${words} +${list.length - 1}` : words;
  };
  /** The "Next Email" column is only rendered when the page turns it on. */
  @Input() showNextEmail = false;
  /** Server clock minus browser clock, for those countdowns. */
  @Input() clockOffsetMs = 0;
  @Output() selectedLimit: EventEmitter<any> = new EventEmitter();
  @Output() selectedStatus: EventEmitter<any> = new EventEmitter();

  public tableWidth = 500;
  // True once the table is scrolled horizontally — drives the frozen column shadow.
  public scrolledX = false;
  public navigatePageNumber: number | null = null;
  public columnList: any[];
  public labelOptions: any[] = [];
  public list;
  public contactLabelsSubscription: Subscription;
  dripCampaignStatuses = constants.DRIP_CAMPAIGN_STATUS;
  selectedStatusKey = constants.DRIP_CAMPAIGN_STATUS[0];

  constructor(private modal: NgbModal, private prospectingService: ProspectingService, private host: ElementRef, private cdr: ChangeDetectorRef) {
  }

  // The page can change the filter itself ("Show only these" on the attention card).
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialStatusKey'] && !changes['initialStatusKey'].firstChange) {
      const matched = this.dripCampaignStatuses.find((s) => s.key === this.initialStatusKey);
      if (matched) this.selectedStatusKey = matched;
    }
  }

  ngOnInit(): void {
    if (this.initialStatusKey) {
      const matched = this.dripCampaignStatuses.find((s) => s.key === this.initialStatusKey);
      if (matched) this.selectedStatusKey = matched;
    }

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.lists.subscribe((labels) => {
      // Set label dropdown options
      this.labelOptions = labels;
      // OnPush: a service emission is not an event on this view, so nothing marks it
      // dirty and the dropdown would keep rendering the previous options.
      this.cdr.markForCheck();
    });
    this.getListViewData();
    this.calcWidth();
  }

  /**
   * The card's top bar (title, Status, Per Page, paging) sticks to the top of the page, and
   * the column header sticks right under it, so it needs the bar's real height: it wraps to
   * two lines on narrower screens. Published as `--kx-card-head-h` on the host.
   */
  private __headObserver?: ResizeObserver;
  private __trackHeaderHeight() {
    const host: HTMLElement | undefined = this.host?.nativeElement;
    const head = host?.querySelector('.kexy-table-card > .card-header') as HTMLElement | null;
    if (!head || typeof ResizeObserver === 'undefined') return;
    const publish = () => host!.style.setProperty('--kx-card-head-h', `${head.offsetHeight}px`);
    publish();
    this.__headObserver = new ResizeObserver(publish);
    // border-box: the pinned state changes the bar's PADDING, which a content-box watch misses.
    this.__headObserver.observe(head, { box: 'border-box' });
  }

  /**
   * Marks the card `is-stuck` while its top bar is pinned (styles in the scss). Listens to
   * the nearest scrolling ancestor (the page's content area); the class is toggled on the
   * element directly, so scrolling never runs change detection.
   */
  private __stuckScroller?: HTMLElement;
  private __onStuckScroll = () => {
    const card = this.host?.nativeElement?.querySelector('.kexy-table-card') as HTMLElement | null;
    const head = card?.querySelector(':scope > .card-header') as HTMLElement | null;
    if (!card || !head || !this.__stuckScroller) return;
    const stuck =
      getComputedStyle(head).position === 'sticky' &&
      card.getBoundingClientRect().top < this.__stuckScroller.getBoundingClientRect().top;
    card.classList.toggle('is-stuck', stuck);
  };
  private __trackStuck() {
    let el: HTMLElement | null = this.host?.nativeElement?.parentElement ?? null;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    if (!el) return;
    this.__stuckScroller = el;
    el.addEventListener('scroll', this.__onStuckScroll, { passive: true });
    this.__onStuckScroll();
  }

  ngOnDestroy(): void {
    this.__widthObserver?.disconnect();
    this.__headObserver?.disconnect();
    this.__stuckScroller?.removeEventListener('scroll', this.__onStuckScroll);
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
  }

  /**
   * Measure ONCE the view exists, then only when the wrapper actually resizes.
   *
   * This used to be `ngAfterViewInit() { this.calcWidth(); }`. `calcWidth` reads
   * `clientWidth`, which forces the browser to flush layout synchronously — so every
   * change-detection pass triggered a reflow, on the app's biggest tables. A
   * ResizeObserver fires only on real geometry changes and catches the cases a
   * `window:resize` listener misses, notably the sidebar collapsing.
   */
  ngAfterViewInit() {
    this.calcWidth();
    this.cdr.markForCheck();
    this.__trackHeaderHeight();
    this.__trackStuck();

    const wrapper = this.host?.nativeElement?.querySelector('.new-table-wrapper');
    if (!wrapper || typeof ResizeObserver === 'undefined') return;
    this.__widthObserver = new ResizeObserver(() => {
      const before = this.browserWidthForTable;
      this.calcWidth();
      // Only re-render when the number actually moved; the observer also fires for
      // height changes, which nothing here depends on.
      if (before !== this.browserWidthForTable) this.cdr.markForCheck();
    });
    this.__widthObserver.observe(wrapper);
  }

  private __widthObserver?: ResizeObserver;

  onStatusSelect = (status, index = null, rowIndex = null) => {
    console.log(status);
    this.selectedStatusKey = status;
    console.log(status);
    this.selectedStatus.emit(status.key);
  };


  getListViewData = () => {
    let columnList: any;
    columnList = [
      // Unit-string widths: checkbox fixed px, the rest percentages so columns
      // proportionally FILL the width (table-layout:fixed + width:100%). No flex
      // column (a greedy width:100% ballooned while loading).
      // Title is the column people scan, so it gets the most room; the rest were
      // trimmed to keep the total at 100%. Long values now ellipsise inside the
      // cell (see the SCSS) rather than being hard-cut.
      { name: '', key: 'action', width: '58px' },
      { name: 'Drip Campaign Title', key: 'drip_campaign_title', width: this.showNextEmail ? '26%' : '42%' },
      { name: 'Number Of Emails', key: 'number_of_emails', width: '10%' },
      { name: 'Email Tone', key: 'email_tone', width: '10%' },
      { name: 'Status', key: 'status', width: '10%' },
      // When an ACTIVE campaign's next email goes out — the soonest of its Delay cards.
      // Hidden for now (`showNextEmail`); Title takes its 16% back while it is.
      ...(this.showNextEmail ? [{ name: 'Next Email', key: 'next_email', width: '16%' }] : []),
      // `auto` on purpose: list names are user-chosen and unpredictable, and a
      // percentage here forced them to ellipsise. Under `table-layout: auto` (see the
      // scss) this column sizes to its content and the table scrolls if the row
      // needs more than the viewport, instead of hiding the name behind a "…".
      { name: 'Lists', key: 'label', width: 'auto' },
      { name: 'Date Created', key: 'date_created', width: '16%' },
    ];
    this.columnList = columnList;
  };

  browserWidthForTable;
  calcWidth = () => {
    // Table is width:100% (percentage columns fill it via table-layout:fixed);
    // only need the visible width for the centered empty/loading state.
    const sidebarWidth = document.getElementById('main-sidebar')?.clientWidth || 0;
    const pageMargin = 48;
    const wrapper = this.host?.nativeElement?.querySelector('.new-table-wrapper') as HTMLElement | null;
    this.browserWidthForTable = wrapper?.clientWidth || (window.innerWidth - sidebarWidth - pageMargin);
  };

  // Keep *ngFor stable when toggling a checkbox.
  trackByRow = (_: number, row: any) => row?.id ?? _;

  // Toggle the frozen-column shadow on horizontal scroll.
  onTableScroll = (event: Event) => {
    const scrolled = (event.target as HTMLElement).scrollLeft > 0;
    if (scrolled !== this.scrolledX) this.scrolledX = scrolled;
  };

  // Pagination bounds + first/last/jump.
  isFirstPage = () => Number(this.currentPage) <= 1;
  isLastPage = () => Number(this.currentPage) >= Number(this.totalPage);
  goToFirstPage = () => { if (!this.isFirstPage() && this.paginationFirstClick) this.paginationFirstClick(); };
  goToLastPage = () => { if (!this.isLastPage() && this.paginationLastClick) this.paginationLastClick(); };
  handleNavigate = () => {
    if (!this.navigatePageNumber || !this.navigateSpecificPage) return;
    let n = this.navigatePageNumber;
    if (n < 1) n = 1;
    if (n > this.totalPage) n = this.totalPage;
    this.navigateSpecificPage(n);
    this.navigatePageNumber = null;
  };

  onShowEntriesSelect = ($event) => {
    this.selectedLimit.emit(this.limit);
  };

  // getCampaignTitle = (title_id) => {
  //   const index = this.dripCampaignTitles && this.dripCampaignTitles.findIndex(i => i.id.toString() === title_id.toString());
  //   if (index < 0) return;
  //
  //   return this.dripCampaignTitles[index].title;
  // };

  readonly editDripCampaignRoute = routeConstants.BRAND.EDIT_DRIP_CAMPAIGN;
  readonly smtpSettingsRoute = routeConstants.BRAND.SMTP_SETTINGS;

  isRowSelected = (row) => {
    // For radio like functionality
    // return this.selectedDripCampaigns.length > 0 && this.selectedDripCampaigns[0].id === contact.id;

    // For multiselect like functionality
    return this.selectedDripCampaigns.findIndex(i => i.id.toString() === row.id.toString()) > -1;
  };

  enrolledLists = [];
  getList = (lists) => {
    this.enrolledLists = lists.filter(i => i.type === 'enroll_list');
    if (!this.enrolledLists.length) {
      this.list = {};
      return false;
    }

    if (this.enrolledLists[0].list) {
      this.list = this.enrolledLists[0].list;
      return true;
    }

    this.list = {};
    return false;
  };

  openShowAllLabelModal = (labelsArray) => {
    this.prospectingService.selectedContactLabels = labelsArray;
    this.modal.open(ContactLabelsModalContentComponent, { windowClass: 'kx-dialog-modal', centered: true });
  };

  selectedItemCount;
  getSelectedItemCount = () => {
    this.selectedItemCount = this.cardData.filter((i) => i.isSelected).length;
    return this.selectedItemCount;
  };

  getCheckboxIcon(): string {
    if (this.selectedItemCount === 0) return 'fa fa-square-o checkbox-icon';
    if (this.selectedItemCount > 0 && this.selectedItemCount < this.cardData.length) return 'fa fa-minus-square-o checkbox-icon selected';
    return 'fa fa-check-square-o checkbox-icon selected';
  }

  protected readonly constants = constants;
}
