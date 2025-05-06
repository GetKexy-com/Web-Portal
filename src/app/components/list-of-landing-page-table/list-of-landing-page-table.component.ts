import { AfterViewChecked, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { constants } from "../../helpers/constants";
import { routeConstants } from "../../helpers/routeConstants";
import { Router } from "@angular/router";
import { ProspectingService } from "../../services/prospecting.service";
import { Subscription } from "rxjs";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import {CommonModule, DecimalPipe, NgClass} from '@angular/common';
import {FormsModule} from '@angular/forms';
import { LandingPage } from '../../models/LandingPage';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'list-of-landing-page-table',
  imports: [
    DecimalPipe,
    FormsModule,
    NgClass,
    CommonModule,
  ],
  templateUrl: './list-of-landing-page-table.component.html',
  styleUrl: './list-of-landing-page-table.component.scss'
})
export class ListOfLandingPageTableComponent {
  @Input() tableHeaderBg;
  @Input() tableHeaderColor;
  @Input() landingPages: LandingPage[] = [];
  @Input() selectedLandingPages;
  @Input() isLoading: boolean = false;
  @Input() isWaitingFlag: boolean;
  @Input() checkboxClicked;
  @Input() paginationLeftArrowClick;
  @Input() paginationRightArrowClick;
  @Input() totalPage;
  @Input() currentPage;
  @Input() limit;
  @Input() totalRecordsCount;
  @Input() selectedAllLandingPages;
  @Input() toggleSelectAllSelection;
  @Output() selectedLimit: EventEmitter<any> = new EventEmitter();

  public tableWidth = 500;
  public columnList: any[];
  public labelOptions: any[] = [];
  public list;
  public contactLabelsSubscription: Subscription;

  constructor(private router: Router, private modal: NgbModal, private prospectingService: ProspectingService) {
  }

  ngOnInit(): void {
    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.labels.subscribe((labels) => {
      // Set label dropdown options
      this.labelOptions = labels;
    });

    this.getListViewData();
  }

  ngOnDestroy(): void {
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
  }

  ngAfterViewChecked() {
    this.calcWidth();
  }

  getListViewData = () => {
    let columnList: any;
    columnList = [
      { name: "", key: "action", width: 50 },
      { name: "Image", key: "deal_image", width: 100 },
      { name: "Title", key: "campaign_title_text", width: 200 },
      { name: "Landing Page Type", key: "type_of_campaign", width: 150 },
      { name: "Price", key: "deal_price", width: 100 },
      { name: "Status", key: "status", width: 100 },
      // { name: "Expire Date", key: "end_at", width: 180 },
    ];
    this.columnList = columnList;
  };

  browserWidthForTable;
  calcWidth = () => {
    const sidebarWidth = document.getElementById("main-sidebar")?.clientWidth;
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

  // selectedItemCount;
  // isNoItemSelected = () => {
  //   this.selectedItemCount = this.landingPages.filter((i) => i.is_selected).length;
  //   return this.selectedItemCount === 0;
  // };

  onShowEntriesSelect = ($event) => {
    this.selectedLimit.emit(this.limit);
  };

  redirectToEditPage = (dripCampaign) => {
    const queryParams: any = {
      id: dripCampaign.id,
    };
    this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN], {
      queryParams,
    });
  };

  isRowSelected = (row) => {
    return this.selectedLandingPages.findIndex(i => i.id.toString() === row.id.toString()) > -1;
  };

  selectedItemCount;
  getSelectedItemCount = () => {
    this.selectedItemCount = this.landingPages.filter((i) => i.isSelected).length;
    return this.selectedItemCount;
  };

  getCheckboxIcon(): string {
    if (this.selectedItemCount === 0) return "fa fa-square-o checkbox-icon";
    if (this.selectedItemCount > 0 && this.selectedItemCount < this.landingPages.length) return "fa fa-minus-square-o";
    return "fa fa-check-square-o";
  }

  protected readonly constants = constants;
  protected readonly environment = environment;
}
