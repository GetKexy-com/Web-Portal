// import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewChecked } from "@angular/core";
// import { AuthService } from "../../services/auth.service";
// import { Subscription } from "rxjs";
// import { constants } from "../../helpers/constants";
// import { environment } from "../../../environments/environment";
// import {FormsModule} from '@angular/forms';
// import {NgClass} from '@angular/common';
//
// @Component({
//   selector: 'drip-campaign-promotions-table',
//   imports: [
//     FormsModule,
//     NgClass,
//   ],
//   templateUrl: './drip-campaign-promotions-table.component.html',
//   styleUrl: './drip-campaign-promotions-table.component.scss'
// })
// export class DripCampaignPromotionsTableComponent {
//   @Input() tableHeaderBg;
//   @Input() tableHeaderColor;
//   @Input() cardData;
//   @Input() isLoading: boolean = false;
//   @Input() isWaitingFlag: boolean;
//   @Input() promotionId;
//   @Output() selectedPromotion: EventEmitter<any> = new EventEmitter();
//   @Output() selectedLimit: EventEmitter<any> = new EventEmitter();
//
//   public tableWidth = 500;
//   public columnList: any[];
//   public userData;
//   public limit = 10;
//   public loadingSubscription: Subscription;
//
//   constructor(
//     private _authService: AuthService,
//   ) {
//   }
//
//   ngOnInit(): void {
//     this.userData = this._authService.userTokenValue;
//     this.getListViewData();
//   }
//
//   ngOnDestroy(): void {
//     if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
//   }
//
//   ngAfterViewChecked() {
//     this.calcWidth();
//   }
//
//   getListViewData = () => {
//     let columnList: any;
//     columnList = [
//       { name: "", key: "action" },
//       { name: "Title", key: "title_of_campaign" },
//       { name: `${constants.LANDING_PAGE} Type`, key: "promotion_type" },
//       { name: "Date Created", key: "date_created" },
//       { name: "Copy Url", key: "copy_url" },
//     ];
//
//     columnList.forEach((column) => {
//       column.width = 140;
//
//       if (column.key === "action" || column.key === "copy_url") {
//         column.width = 50;
//       }
//       if (column.key === "date_created") {
//         column.width = 100;
//       }
//       if (column.key === "created_by") {
//         column.width = 140;
//       }
//       if (column.key === "title_of_campaign") {
//         column.width = 180;
//       }
//     });
//     this.columnList = columnList;
//     // this.calcWidth();
//   };
//
//   calcWidth = () => {
//     const sidebarWidth = document.getElementById("main-sidebar")?.clientWidth;
//     const pageMargin = 48;
//     let sum = 300;
//     let map = {};
//     this.columnList.forEach((column) => {
//       sum += column.width;
//       map[column.key] = column.width;
//     });
//     const browserWidthForTable = window.innerWidth - sidebarWidth - pageMargin;
//     // const browserWidthForTable = window.innerWidth - 340;
//     this.tableWidth = browserWidthForTable > sum ? browserWidthForTable : sum;
//   };
//
//   getCellClasses = (column) => {
//     let classes = {
//       "n-cell-only-name": column.key === "no",
//       "col-zip": column.key === "zip_code",
//     };
//
//     return Object.keys(classes)
//       .filter((key) => classes[key])
//       .join(" ");
//   };
//
//   getCellValueToDisplay = (row, column) => this.getCellValue(row, column);
//
//   getCellValue = (row, column) => {
//     let path = column.key.split("#");
//
//     let value = row[path.shift()];
//
//     if (path.length) {
//       value = value[path.shift()];
//     }
//     return value;
//   };
//
//   handleClickRadioButton = (data) => {
//     this.selectedPromotion.emit(data);
//   };
//
//   onShowEntriesSelect = ($event) => {
//     this.selectedLimit.emit(this.limit);
//   };
//
//   protected readonly constants = constants;
//
//   copyUrl = async (promotion: any, event) => {
//     event.stopPropagation();
//
//     const url = environment.siteUrl + "/promotion?id=" + promotion.promotion_data.token;
//     await navigator.clipboard.writeText(url);
//     promotion["copied"] = true;
//   };
// }

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewChecked, inject, signal, effect } from '@angular/core';
import { AuthService } from "../../services/auth.service";
import { Subscription } from "rxjs";
import { constants } from "../../helpers/constants";
import { environment } from "../../../environments/environment";
import { FormsModule } from '@angular/forms';
import {DatePipe, NgClass, NgFor, NgIf} from '@angular/common';

@Component({
  selector: 'drip-campaign-promotions-table',
  standalone: true,
  imports: [
    FormsModule,
    NgClass,
    DatePipe,
  ],
  templateUrl: './drip-campaign-promotions-table.component.html',
  styleUrl: './drip-campaign-promotions-table.component.scss'
})
export class DripCampaignPromotionsTableComponent implements OnInit, OnDestroy, AfterViewChecked {
  private _authService = inject(AuthService);

  // Inputs
  @Input() tableHeaderBg!: string;
  @Input() tableHeaderColor!: string;
  @Input() set cardData(value: any[]) {
    this._cardData.set(value);
  }
  @Input() isLoading = false;
  @Input() set isWaitingFlag(value: boolean) {
    this._isWaitingFlag.set(value);
  }
  @Input() promotionId?: string;

  // Outputs
  @Output() selectedPromotion = new EventEmitter<any>();
  @Output() selectedLimit = new EventEmitter<number>();

  // Signals
  _cardData = signal<any[]>([]);
  _isWaitingFlag = signal(false);
  tableWidth = signal(500);
  columnList = signal<any[]>([]);
  limit = signal(10);
  userData = signal<any>(null);

  // Constants
  constants = constants;

  // Subscriptions
  private loadingSubscription?: Subscription;

  ngOnInit(): void {
    this.userData.set(this._authService.userTokenValue);
    this.getListViewData();
  }

  ngOnDestroy(): void {
    this.loadingSubscription?.unsubscribe();
  }

  ngAfterViewChecked() {
    this.calcWidth();
  }

  getListViewData() {
    const columnList = [
      { name: "", key: "action" },
      { name: "Title", key: "title_of_campaign" },
      { name: `${constants.LANDING_PAGE} Type`, key: "promotion_type" },
      { name: "Date Created", key: "date_created" },
      { name: "Copy Url", key: "copy_url" },
    ];

    columnList.forEach((column) => {
      column["width"] = 140;

      if (column.key === "action" || column.key === "copy_url") {
        column["width"] = 50;
      }
      if (column.key === "date_created") {
        column["width"] = 100;
      }
      if (column.key === "created_by") {
        column["width"] = 140;
      }
      if (column.key === "title_of_campaign") {
        column["width"] = 180;
      }
    });

    this.columnList.set(columnList);
  }

  calcWidth() {
    const sidebarWidth = document.getElementById("main-sidebar")?.clientWidth ?? 0;
    const pageMargin = 48;
    let sum = 300;

    this.columnList().forEach((column) => {
      sum += column.width;
    });

    const browserWidthForTable = window.innerWidth - sidebarWidth - pageMargin;
    this.tableWidth.set(browserWidthForTable > sum ? browserWidthForTable : sum);
  }

  getCellClasses(column: any): string {
    const classes = {
      "n-cell-only-name": column.key === "no",
      "col-zip": column.key === "zip_code",
    };

    return Object.keys(classes)
      .filter(key => classes[key as keyof typeof classes])
      .join(" ");
  }

  // getCellValueToDisplay(row: any, column: any): string {
  //   return this.getCellValue(row, column);
  // }
  //
  // getCellValue(row: any, column: any): string {
  //   const path = column.key.split("#");
  //   let value: any = row[path.shift()];
  //
  //   if (path.length) {
  //     value = value[path.shift()];
  //   }
  //   return value ?? '';
  // }

  handleClickRadioButton(data: any) {
    this.selectedPromotion.emit(data);
  }

  onShowEntriesSelect(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.limit.set(Number(value));
    this.selectedLimit.emit(this.limit());
  }

  async copyUrl(promotion: any, event: MouseEvent) {
    event.stopPropagation();

    const url = environment.siteUrl + "/promotion?id=" + promotion.promotion_data.token;
    await navigator.clipboard.writeText(url);
    promotion["copied"] = true;
  }
}
