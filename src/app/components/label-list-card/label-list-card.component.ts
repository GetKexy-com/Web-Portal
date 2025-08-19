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
  public columnList: any[];
  public userData;
  public loadingSubscription: Subscription;

  constructor(private _authService: AuthService, private modal: NgbModal, private router: Router, private prospectingService: ProspectingService, private pageUiService: PageUiService) {
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    // Clear the previous cached contacts
    this.prospectingService.cachedContactPages = {};
    this.getListViewData();
    this.calcWidth();
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
  }

  ngAfterViewInit() {
    this.calcWidth();
  }

  ngAfterViewChecked() {
    this.calcWidth();
  }

  getListViewData = () => {
    let columnList: any;
    columnList = [
      { name: '', key: 'action', width: 50 },
      { name: 'Name', key: 'label', width: 200 },
      { name: 'List Size', key: 'list_size', width: 80 },
      { name: 'Creator', key: 'creator', width: 120 },
      { name: 'Used In', key: 'used_in', width: 140 },
      { name: 'Date Created', key: 'date_created', width: 180 },
      // { name: "", key: "edit", width: 50 },
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
    this.browserWidthForTable = window.innerWidth - sidebarWidth - pageMargin;
    this.tableWidth = this.browserWidthForTable > sum ? this.browserWidthForTable : sum;
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
