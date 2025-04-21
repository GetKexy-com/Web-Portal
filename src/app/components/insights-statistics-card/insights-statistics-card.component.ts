import { Component, Input, OnInit } from "@angular/core";
import { constants } from "../../helpers/constants";
import {NgbProgressbar} from '@ng-bootstrap/ng-bootstrap';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'insights-statistics-card',
  imports: [
    NgbProgressbar,
    CommonModule,
  ],
  templateUrl: './insights-statistics-card.component.html',
  styleUrl: './insights-statistics-card.component.scss'
})
export class InsightsStatisticsCardComponent {
  @Input() cardTitle;
  @Input() insightRate;
  @Input() clickedContacts;
  @Input() openedContacts;
  @Input() links;
  @Input() cardPadding = "16px";
  @Input() showProgressbar = true;
  @Input() bgColor = "#ffffff";
  @Input() showTab = false;
  @Input() showLinks = false;
  @Input() showContacts = false;
  @Input() isLoading;
  currentPage: number = 1;
  totalPage: number;
  contacts: object[] = [];
  limit: number = 10;
  protected readonly constants = constants;

  constructor() {
  }

  ngOnInit() {
  }
}
