import { Component, Input, OnInit } from "@angular/core";
import { constants } from "../../helpers/constants";
import { ExportToCsv } from "../../helpers/CSVHelper";
import {NgbTooltip} from '@ng-bootstrap/ng-bootstrap';
import {KexyTabComponent} from '../kexy-tab/kexy-tab.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'insights-contacts-or-links',
  imports: [
    NgbTooltip,
    KexyTabComponent,
    CommonModule
  ],
  templateUrl: './insights-contacts-or-links.component.html',
  styleUrl: './insights-contacts-or-links.component.scss'
})
export class InsightsContactsOrLinksComponent {
  @Input() cardTitle;
  selectedTabItem: string = constants.CLICKS;
  @Input() showTab = false;
  @Input() showLinks = false;
  @Input() showContacts = false;
  @Input() isLoading;
  @Input() links;
  @Input() clickedContacts;
  @Input() openedContacts;
  currentPage: number = 1;
  totalPage: number;
  limit: number = 10;
  paginatedClickedContacts: object[] = [];
  paginatedOpenedContacts: object[] = [];
  paginatedLinks: object[] = [];
  protected readonly constants = constants;

  ngOnInit() {
  }

  switchTabItem = (item) => {
    this.selectedTabItem = item;
    this.currentPage = 1;
    this.setAndGetPaginationInfo();
  }

  setAndGetPaginationInfo = (): number => {
    if (this.showTab) {
      if (this.selectedTabItem === constants.CLICKS) {
        this.totalPage = Math.ceil(this.clickedContacts.length / this.limit);
        if (this.totalPage) this.setPaginatedClickedContacts();
      }
      if (this.selectedTabItem === constants.OPENS) {
        this.totalPage = Math.ceil(this.openedContacts.length / this.limit);
        if (this.totalPage) this.setPaginatedOpenedContacts();
      }
    } else {
      this.totalPage = Math.ceil(this.links.length / this.limit);
      if (this.totalPage) this.setPaginatedLinks();
    }
    return this.totalPage || 0;
  }

  paginationLeftArrowClick = () => {
    if (this.currentPage === 1) return;
    this.currentPage -= 1;
    this.setPagination();
  }

  setPagination = () => {
    if (this.showTab) {
      if (this.selectedTabItem === constants.CLICKS) {
        this.setPaginatedClickedContacts();
      }
      if (this.selectedTabItem === constants.OPENS) {
        this.setPaginatedOpenedContacts();
      }
    } else {
      this.setPaginatedLinks();
    }
  }

  paginationRightArrowClick = () => {
    if (this.currentPage === this.totalPage) return;
    this.currentPage += 1;
    this.setPagination();
  }

  downloadIconClickedInLink = (insights) => {
    console.log(insights);
    this.downloadEngagedContactsInLinks(insights.data);
  }

  downloadEngagedContactsInLinks = async (data) => {
    const headers = `Full Name, Email, Job Title, City, State, Country`;
    let rows = "";
    let contacts = {};
    data.forEach((row) => {
      let contact = row["kexy_contact"];
      if (contact && !contacts[contact.email]) {
        contacts[contact.email] = contact;
        rows += `${contact.contact_name?.length ? contact.contact_name?.replace(/,/g, " ") : ""}, `;
        rows += `${contact.email?.length ? contact.email?.replace(/,/g, " ") : ""}, `;
        rows += `${contact.job_title?.length ? contact.job_title?.replace(/,/g, " ") : ""}, `;
        rows += `${contact.city?.length ? contact.city?.replace(/,/g, " ") : ""}, `;
        rows += `${contact.state?.length ? contact.state?.replace(/,/g, " ") : ""}, `;
        rows += `${contact.country?.length ? contact.country?.replace(/,/g, " ") : ""}\n`;
      }
    });

    await ExportToCsv.download("contacts.csv", headers + "\n" + rows);
  }

  setPaginatedClickedContacts = () => {
    this.paginatedClickedContacts = this.clickedContacts.slice((this.currentPage-1) * this.limit, this.currentPage * this.limit);
  }

  setPaginatedOpenedContacts = () => {
    this.paginatedOpenedContacts = this.openedContacts.slice((this.currentPage-1) * this.limit, this.currentPage * this.limit);
    console.log(this.paginatedOpenedContacts);
  }

  setPaginatedLinks = () => {
    this.paginatedLinks = this.links.slice((this.currentPage-1) * this.limit, this.currentPage * this.limit);
  }
}
