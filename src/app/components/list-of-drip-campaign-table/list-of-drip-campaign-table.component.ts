import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { constants } from '../../helpers/constants';
import { routeConstants } from '../../helpers/routeConstants';
import { Router } from '@angular/router';
import { ProspectingService } from '../../services/prospecting.service';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import {
  ContactLabelsModalContentComponent,
} from '../contact-labels-modal-content/contact-labels-modal-content.component';
import { DripCampaign } from '../../models/DripCampaign';

@Component({
  selector: 'list-of-drip-campaign-table',
  imports: [
    FormsModule,
    DatePipe,
    NgClass,
    DecimalPipe,
    CommonModule,
  ],
  templateUrl: './list-of-drip-campaign-table.component.html',
  // OnPush: these tables render hundreds of cells, and under the default
  // strategy every one of them was re-checked on every event anywhere in the app.
  // Every async boundary in here therefore has to markForCheck() explicitly.
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './list-of-drip-campaign-table.component.scss',
})
export class ListOfDripCampaignTableComponent implements OnInit, AfterViewInit, OnDestroy {
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

  constructor(private router: Router, private modal: NgbModal, private prospectingService: ProspectingService, private host: ElementRef, private cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
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

  ngOnDestroy(): void {
    this.__widthObserver?.disconnect();
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
      { name: 'Drip Campaign Title', key: 'drip_campaign_title', width: '30%' },
      { name: 'Number Of Emails', key: 'number_of_emails', width: '12%' },
      { name: 'Email Tone', key: 'email_tone', width: '12%' },
      { name: 'Status', key: 'status', width: '12%' },
      // `auto` on purpose: list names are user-chosen and unpredictable, and a
      // percentage here forced them to ellipsise. Under `table-layout: auto` (see the
      // scss) this column sizes to its content and the table scrolls if the row
      // needs more than the viewport, instead of hiding the name behind a "…".
      { name: 'Lists', key: 'label', width: 'auto' },
      { name: 'Date Created', key: 'date_created', width: '18%' },
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

  redirectToEditPage = (dripCampaign) => {
    const queryParams: any = {
      id: dripCampaign.id,
    };
    this.router.navigate([routeConstants.BRAND.EDIT_DRIP_CAMPAIGN], {
      queryParams,
    });
  };

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
    this.modal.open(ContactLabelsModalContentComponent);
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
