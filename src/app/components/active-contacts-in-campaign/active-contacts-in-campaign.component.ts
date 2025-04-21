import { Component, OnInit } from "@angular/core";
import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { ActivatedRoute } from "@angular/router";
import Swal from "sweetalert2";
import { PageUiService } from "../../services/page-ui.service";
import {ActiveContactsTableComponent} from '../active-contacts-table/active-contacts-table.component';

@Component({
  selector: 'app-active-contacts-in-campaign',
  imports: [
    ActiveContactsTableComponent
  ],
  templateUrl: './active-contacts-in-campaign.component.html',
  styleUrl: './active-contacts-in-campaign.component.scss'
})
export class ActiveContactsInCampaignComponent {
  public isLoading: boolean = false;
  public submitted: boolean = false;
  public contacts = [];
  public dripCampaignId;
  public selectedContacts = [];
  public page = 1;
  public limit = 25;
  public totalPage = 1;
  public paginatedContacts = [];

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private dripCampaignService: DripCampaignService,
    private pageUiService: PageUiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params["id"]) {
        this.dripCampaignId = params["id"];
      }
    });

    this.contacts = this.dripCampaignService.emailProspects;
    this.setContactsWithPagination();
  }

  handleContactSelect = (selectedRow, isSelectAll) => {
    if (isSelectAll) {
      if (this.paginatedContacts.some((i) => i.is_selected)) {
        this.paginatedContacts.map((i) => {
          i.is_selected = false;
          const index = this.selectedContacts.findIndex((j) => j.id === i.id);
          if (index > -1) {
            this.selectedContacts.splice(index, 1);
          }
        });
      } else {
        this.paginatedContacts.map((i) => {
          i.is_selected = true;
          const index = this.selectedContacts.findIndex((j) => j.id === i.id);
          if (index === -1) {
            this.selectedContacts.push(i);
          }
        });
      }
    } else {
      const rowIndex = this.paginatedContacts.findIndex((i) => i.id === selectedRow.id);
      this.paginatedContacts[rowIndex].is_selected = !this.paginatedContacts[rowIndex].is_selected;

      if (this.paginatedContacts[rowIndex].is_selected) {
        const index = this.selectedContacts.findIndex((j) => j.id === this.paginatedContacts[rowIndex].id);
        if (index === -1) {
          this.selectedContacts.push(this.paginatedContacts[rowIndex]);
        }
      } else {
        const index = this.selectedContacts.findIndex((j) => j.id === this.paginatedContacts[rowIndex].id);
        if (index > -1) {
          this.selectedContacts.splice(index, 1);
        }
      }
    }
  };

  unenrollBtnClicked = async () => {
    let isConfirm = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: "Yes",
      showLoaderOnConfirm: true,
    });
    if (isConfirm.dismiss) {
      return;
    }

    const contactEmails = [];
    this.selectedContacts.forEach(c => {
      contactEmails.push(c.email);
    })
    const postData = {
      drip_campaign_id: this.dripCampaignId,
      contact_emails: contactEmails
    };

    const swlLoading = this.pageUiService.showSweetAlertLoading();
    try {
      swlLoading.showLoading();
      await this.dripCampaignService.unEnrollProspects(postData);

      delete postData.contact_emails;
      contactEmails.forEach(email => {
        const index = this.contacts.findIndex(c => c.email === email);
        if (index > -1) {
          this.contacts.splice(index, 1);
        }

        const i = this.paginatedContacts.findIndex(c => c.email === email);
        if (i > -1) {
          this.paginatedContacts.splice(index, 1);
        }
      })
      this.selectedContacts = [];
      await this.dripCampaignService.getProspects(postData);
      swlLoading.close();

    } catch (e) {
      swlLoading.close();
      await Swal.fire("Error", e.message)
    }
  }

  setContactsWithPagination = () => {
    const startIndex = (this.page - 1) * this.limit;
    const endIndex = startIndex + this.limit;

    this.paginatedContacts = this.contacts.slice(startIndex, endIndex);
    this.totalPage = Math.ceil(this.contacts.length / this.limit);
  }

  paginationLeftArrowClick = () => {
    if (this.page === 1) return;
    this.page = this.page - 1;
    this.setContactsWithPagination();
  }

  paginationRightArrowClick = () => {
    if (this.page === this.totalPage) return;
    this.page = this.page + 1;
    this.setContactsWithPagination();
  }

  receivedLimitNumber = async (limit) => {
    this.limit = parseInt(limit);
    this.page = 1;
    this.setContactsWithPagination();
  }
}
