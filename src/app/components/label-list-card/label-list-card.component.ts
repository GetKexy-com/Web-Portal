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
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProspectingService } from '../../services/prospecting.service';
import { PageUiService } from '../../services/page-ui.service';
import { constants } from '../../helpers/constants';
import { routeConstants } from '../../helpers/routeConstants';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ListDripCampaignsModalContentComponent,
} from '../list-drip-campaigns-modal-content/list-drip-campaigns-modal-content.component';

@Component({
  selector: 'label-list-card',
  imports: [
    DatePipe,
    FormsModule,
    CommonModule,
  ],
  templateUrl: './label-list-card.component.html',
  // OnPush: these tables render hundreds of cells, and under the default
  // strategy every one of them was re-checked on every event anywhere in the app.
  // Every async boundary in here therefore has to markForCheck() explicitly.
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './label-list-card.component.scss',
})
export class LabelListCardComponent implements OnInit, OnDestroy, AfterViewInit {
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
  @Input() searchLabels;
  @Input() searchContactName;
  @Input() searchContactCity;
  @Input() searchContactState;
  @Input() searchContactCountry;
  @Input() searchContactMarketingStatus;
  @Input() searchContactEmailStatus;
  @Input() resetSearchData;
  // @Input() editLabel;
  @Input() limit;
  @Output() selectedLimit: EventEmitter<any> = new EventEmitter();

  public tableWidth = 500;
  // True once the table is scrolled horizontally — drives the frozen column's
  // right-edge shadow. Only flipped on the 0↔scrolled boundary.
  public scrolledX = false;
  public columnList: any[];
  public userData;
  public loadingSubscription: Subscription;

  constructor(private _authService: AuthService, private modal: NgbModal, private router: Router, private prospectingService: ProspectingService, private pageUiService: PageUiService, private host: ElementRef, private cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    // Clear the previous cached contacts
    this.prospectingService.cachedContactPages = {};
    this.getListViewData();
    this.calcWidth();
  }

  ngOnDestroy(): void {
    this.__widthObserver?.disconnect();
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
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

  getListViewData = () => {
    let columnList: any;
    columnList = [
      // Widths are unit strings and, under `table-layout: auto` (see the SCSS), act
      // as PREFERENCES rather than hard sizes — the checkbox stays a fixed px column
      // and the percentages keep the rest proportional, but slack can go where it is
      // needed. Name is `auto` because list names are user-chosen and a percentage
      // forced them to ellipsise however much room the row had spare; it now sizes to
      // its content and the wrapper scrolls if a name is longer than the viewport.
      { name: '', key: 'action', width: '58px' },
      { name: 'Name', key: 'label', width: 'auto' },
      { name: 'List Size', key: 'list_size', width: '10%' },
      { name: 'Creator', key: 'creator', width: '16%' },
      { name: 'Used In', key: 'used_in', width: '20%' },
      { name: 'Date Created', key: 'date_created', width: '22%' },
      // { name: "", key: "edit", width: 50 },
    ];
    this.columnList = columnList;
  };

  browserWidthForTable;
  calcWidth = () => {
    // The table is width:100% (percentage columns fill it via table-layout:fixed),
    // so we only need the visible width for the centered empty/loading state.
    const wrapper = this.host?.nativeElement?.querySelector('.new-table-wrapper') as HTMLElement | null;
    const sidebarWidth = document.getElementById('main-sidebar')?.clientWidth || 0;
    const pageMargin = 48;
    this.browserWidthForTable = wrapper?.clientWidth || (window.innerWidth - sidebarWidth - pageMargin);
  };

  // Keep *ngFor stable so toggling a checkbox doesn't rebuild every row.
  trackByRow = (_: number, row: any) => row?.id ?? _;

  // Boundary checks for disabling the pager arrows (display only; the handlers
  // guard themselves).
  isFirstPage = () => Number(this.currentPage) <= 1;
  isLastPage = () => Number(this.currentPage) >= Number(this.totalPage);

  // Toggle the frozen-column shadow when the table scrolls horizontally.
  onTableScroll = (event: Event) => {
    const scrolled = (event.target as HTMLElement).scrollLeft > 0;
    if (scrolled !== this.scrolledX) this.scrolledX = scrolled;
  };

  getCellClasses = (column) => {
    let classes = {
      'n-cell-only-name': column.key === 'no',
      'col-zip': column.key === 'zip_code',
      // The two column-specific width treatments the SCSS needs — see the
      // `table-layout: auto` note there. They go together: `name-cell` is the one
      // uncapped column, `creator-cell` is capped so it can't compete for the slack.
      'name-cell': column.key === 'label',
      'creator-cell': column.key === 'creator',
    };

    return Object.keys(classes)
      .filter((key) => classes[key])
      .join(' ');
  };

  selectedItemCount;
  isNoItemSelected = () => {
    this.selectedItemCount = this.cardData.filter((i) => i.isSelected).length;
    return this.selectedItemCount === 0;
  };

  stopPropagation = (event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();
  };

  openShowAllLabelModal = (event, dripCampaignsArray) => {
    this.stopPropagation(event);
    this.prospectingService.listDripCampaigns = dripCampaignsArray;
    this.modal.open(ListDripCampaignsModalContentComponent);
  };

  protected readonly constants = constants;

  onShowEntriesSelect = ($event) => {
    this.selectedLimit.emit(this.limit);
  };

  redirectListContactsPage = async (list) => {
    await this.router.navigate(
      [routeConstants.BRAND.LIST_CONTACTS],
      { queryParams: { listId: list.id, page: 1 } },
    );
  };
}
