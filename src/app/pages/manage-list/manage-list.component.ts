import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { constants } from 'src/app/helpers/constants';
import { ExportToCsv } from 'src/app/helpers/CSVHelper';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import { PageUiService } from 'src/app/services/page-ui.service';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { LabelListCardComponent } from '../../components/label-list-card/label-list-card.component';
import {
  AddOrDeleteContactLabelComponent,
} from '../../components/add-or-delete-contact-label/add-or-delete-contact-label.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'manage-list',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    LabelListCardComponent,
    CommonModule,
  ],
  templateUrl: './manage-list.component.html',
  styleUrl: './manage-list.component.scss',
})
export class ManageListComponent implements OnInit, OnDestroy {
  userData;
  supplierId;
  labelOptions = [];
  totalContactsCount = 0;
  isWaitingFlag: boolean = true;
  isLoading: boolean = false;
  selectedLabels = [];
  page = 1;
  limit = 100;
  totalPage;
  labelOptionsSubscription: Subscription;
  contactLabelsSubscription: Subscription;

  constructor(
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private dripCampaignService: DripCampaignService,
    private ngbOffcanvas: NgbOffcanvas,
    private pageUiService: PageUiService,
  ) {
  }

  async ngOnInit() {
    document.title = 'Lists - KEXY Brand Portal';
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    // Set pagination limit from localstorage if found
    const limit = localStorage.getItem(constants.LISTS_TABLE_PAGINATION_LIMIT);
    if (limit) {
      this.limit = parseInt(limit);
    }

    // If redirected from brand-list-contact-page we will show cache data with last visited page
    if (this.prospectingService.manageListCurrentPage) {
      this.page = this.prospectingService.manageListCurrentPage;
    }

    // get lists
    await this.getLabels(true);

    // get all drip campaign titles
    await this.getDripCampaignTitles();

    this.isWaitingFlag = false;
  }

  ngOnDestroy() {
    if (this.labelOptionsSubscription) this.labelOptionsSubscription.unsubscribe();
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
  }

  getLabels = async (overwrite = true) => {
    // Get Label
    const postData = {
      page: this.page,
      limit: this.limit,
    };
    await this.prospectingService.getLists(postData, overwrite);

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.lists.subscribe((labels) => {
      this.labelOptions = labels;
      this.totalContactsCount = this.prospectingService.totalListCount;
      this.totalPage = Math.ceil(this.totalContactsCount / this.limit);
      this.setPreviousSelectedLabels();
    });
  };

  getDripCampaignTitles = async () => {
    // Get dripCampaignTitles api call
    await this.dripCampaignService.getAllDripCampaignTitle({}, false);
  };

  setPreviousSelectedLabels = () => {
    this.selectedLabels = [];
    this.labelOptions.forEach(label => {
      if (label.isSelected) {
        this.selectedLabels.push(label);
      }
    });
  };

  paginationRightArrowClick = async () => {
    if (this.page + 1 === this.totalPage) return; // Here added 1 with page because page starts with 0

    this.isLoading = true;
    this.page += 1;
    await this.getLabels(false);
    this.isLoading = false;
  };

  paginationLeftArrowClick = async () => {
    if (this.page + 1 === 1) return; // Here added 1 with page because page starts with 0

    this.isLoading = true;
    this.page -= 1;
    await this.getLabels(false);
    this.isLoading = false;
  };

  handleContactSelect = (selectedRow, isSelectAll) => {
    this.selectedLabels = []
    const rowIndex = this.labelOptions.findIndex((i) => i.id === selectedRow.id);
    if (this.labelOptions[rowIndex].isSelected) {
      this.labelOptions[rowIndex].isSelected = false;
    } else {
      this.labelOptions.forEach(label => {
        label.isSelected = false;
      })
      this.labelOptions[rowIndex].isSelected = true;
      this.selectedLabels.push(this.labelOptions[rowIndex]);
    }

    // if (isSelectAll) {
    //   if (this.labelOptions.some((i) => i.isSelected)) {
    //     this.labelOptions.map((i) => {
    //       i.isSelected = false;
    //       const index = this.selectedLabels.findIndex((j) => j.id === i.id);
    //       if (index > -1) {
    //         this.selectedLabels.splice(index, 1);
    //       }
    //     });
    //   } else {
    //     this.labelOptions.map((i) => {
    //       i.isSelected = true;
    //       const index = this.selectedLabels.findIndex((j) => j.id === i.id);
    //       if (index === -1) {
    //         this.selectedLabels.push(i);
    //       }
    //     });
    //   }
    // } else {
    //   const rowIndex = this.labelOptions.findIndex((i) => i.id === selectedRow.id);
    //   this.labelOptions[rowIndex].isSelected = !this.labelOptions[rowIndex].isSelected;

    //   if (this.labelOptions[rowIndex].isSelected) {
    //     const index = this.selectedLabels.findIndex((j) => j.id === this.labelOptions[rowIndex].id);
    //     if (index === -1) {
    //       this.selectedLabels.push(this.labelOptions[rowIndex]);
    //     }
    //   } else {
    //     const index = this.selectedLabels.findIndex((j) => j.id === this.labelOptions[rowIndex].id);
    //     if (index > -1) {
    //       this.selectedLabels.splice(index, 1);
    //     }
    //   }
    // }
  };

  receivedLimitNumber = async (limit) => {
    this.limit = parseInt(limit);
    localStorage.setItem(constants.LISTS_TABLE_PAGINATION_LIMIT, limit);
    this.page = 0;

    this.isWaitingFlag = true;
    await this.getLabels();
    this.isWaitingFlag = false;
  };

  editLabel = () => {
    const data = this.selectedLabels[0];
    data['itemBgColor'] = data.bg_color;
    data['value'] = data.label;
    data['itemTextColor'] = data.text_color;
    this.prospectingService.selectedLabelForEdit = data;
    this.openLabelCanvas();
  };

  addLabelBtnClick = () => {
    this.prospectingService.selectedLabelForEdit = null;
    this.openLabelCanvas();
  };

  openLabelCanvas = () => {
    this.ngbOffcanvas.open(AddOrDeleteContactLabelComponent, {
      panelClass: 'attributes-bg edit-rep-canvas',
      backdropClass: 'edit-rep-canvas-backdrop label-offcanvas-backdrop',
      position: 'end',
      scroll: false,
    });
  };

  deleteLabels = async () => {
    let isConfirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'List(s) used in active drip campaign(s) will not be deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: 'Yes, delete it!',
      showLoaderOnConfirm: true,
    });

    if (isConfirm.dismiss) {
      return;
    }

    Swal.fire({
      title: '',
      text: 'Please wait...',
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    Swal.showLoading();

    const labelIds = [];
    // filter out lists that used in drip campaigns
    console.log('selectedLabels', this.selectedLabels);
    this.selectedLabels = this.selectedLabels.filter(label => !label.dripCampaignList.length);
    this.selectedLabels.forEach(i => labelIds.push(i.id));
    const postData = {
      supplier_id: this.supplierId,
      label_ids: labelIds[0],
    };
    try {
      await this.prospectingService.deleteLabel(postData);
      await this.getLabels();
      Swal.close();
    } catch (e) {
      Swal.close();
      await Swal.fire('Error', e.message);
    }
  };

  duplicateLabel = async () => {
    const postData = {
      supplier_id: this.supplierId,
      label_id: this.selectedLabels[0].id,
    };
    const swlLoading = this.pageUiService.showSweetAlertLoading();
    try {
      swlLoading.showLoading();
      await this.prospectingService.duplicateLabel(postData);
      await this.getLabels();
      this.selectedLabels = [];
      swlLoading.close();
    } catch (e) {
      swlLoading.close();
      await Swal.fire('Error', e.message);
    }
  };

  getAllContacts = async () => {
    this.exportBtnLoading = true;

    const labelIds = [];
    this.selectedLabels.forEach(l => labelIds.push(l.id));

    const postData = {
      supplier_id: this.supplierId,
      drip_campaign_id: '',
      label_ids: labelIds,
      contact_name: '',
      company_name: '',
      job_title: '',
      marketing_status: '',
      email_status: '',
      city: '',
      state: '',
      country: '',
      page: 1,
      limit: 9999999,
      get_total_count: true,
      sort_by: '',
    };
    try {
      const contacts = await this.prospectingService.getAllContacts(postData, true);
      this.exportBtnLoading = false;
      return contacts;
    } catch (e) {
      this.exportBtnLoading = false;
      Swal.fire('Error', e.message);
    }
  };

  exportBtnLoading = false;
  exportCSV = async () => {
    const contacts = await this.getAllContacts();

    const headers = `First Name,Last Name,Linkedin,Email,Email Status,Job Title,Company Name,Phone Number,City,State,Country,Marketing Status,List`;
    let rows = '';
    contacts.forEach((contact) => {
      // console.log('contact', contact);
      let labels = [];
      contact.kexy_contact_labels.forEach(label => {
        labels.push(label.kexy_label.label);
      });

      let contactDetails = JSON.parse(contact.details);
      rows += `${contactDetails.first_name?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.last_name?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.linkedin_url?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.email?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.email_status?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.title?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.organization.name?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.organization.phone?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.city?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.state?.replace(/,/g, ' ')}, `;
      rows += `${contactDetails.country?.replace(/,/g, ' ')}, `;
      rows += `${contact.marketing_status?.replace(/,/g, ' ')}, `;
      rows += `${labels.length ? labels.join('/') : ''}\n`;
    });
    // console.log(rows);
    await ExportToCsv.download('Contacts.csv', headers + '\n' + rows);
    this.isWaitingFlag = false;
  };
}
