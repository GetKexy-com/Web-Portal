import { AfterViewChecked, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { constants } from "../../helpers/constants";
import { routeConstants } from "../../helpers/routeConstants";
import { Router } from "@angular/router";
import { ProspectingService } from "../../services/prospecting.service";
import { Subscription } from "rxjs";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import {FormsModule} from '@angular/forms';
import {CommonModule, DatePipe, DecimalPipe, NgClass} from '@angular/common';
import {
  ContactLabelsModalContentComponent
} from '../contact-labels-modal-content/contact-labels-modal-content.component';
import {DripCampaign} from '../../models/DripCampaign';

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
  styleUrl: './list-of-drip-campaign-table.component.scss'
})
export class ListOfDripCampaignTableComponent implements OnInit, AfterViewChecked, OnDestroy {
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
  @Input() totalPage;
  @Input() currentPage;
  @Input() limit;
  @Input() totalRecordsCount;
  @Input() selectedAllDripCampaigns;
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
    this.contactLabelsSubscription = this.prospectingService.lists.subscribe((labels) => {
      // Set label dropdown options
      this.labelOptions = labels;
    });
    this.getListViewData();
    this.calcWidth();
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
      { name: "Drip Campaign Title", key: "drip_campaign_title", width: 200 },
      { name: "Number Of Emails", key: "number_of_emails", width: 142 },
      { name: "Email Tone", key: "email_tone", width: 120 },
      { name: "Status", key: "status", width: 100 },
      { name: "Lists", key: "label", width: 130 },
      { name: "Date Created", key: "date_created", width: 180 },
      { name: "", key: "edit", width: 50 },
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
    this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN], {
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
    this.enrolledLists = lists.filter(i => i.type === "enroll_list");
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
    if (this.selectedItemCount === 0) return "fa fa-square-o checkbox-icon";
    if (this.selectedItemCount > 0 && this.selectedItemCount < this.cardData.length) return "fa fa-minus-square-o";
    return "fa fa-check-square-o";
  }

  protected readonly constants = constants;
}
