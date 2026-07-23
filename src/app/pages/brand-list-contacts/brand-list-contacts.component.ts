import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { constants } from 'src/app/helpers/constants';
import { AuthService } from 'src/app/services/auth.service';
import { routeConstants } from 'src/app/helpers/routeConstants';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { PageUiService } from 'src/app/services/page-ui.service';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import {
  ProspectingCommonCardComponent,
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import { ContactListCardComponent } from '../../components/contact-list-card/contact-list-card.component';
import {
  UploadFileModalContentComponent,
} from '../../components/upload-file-modal-content/upload-file-modal-content.component';
import {
  ImportResultsModalContentComponent,
} from '../../components/import-results-modal-content/import-results-modal-content.component';
import {
  ImportPreviewModalContentComponent,
} from '../../components/import-preview-modal-content/import-preview-modal-content.component';
import { ProspectingContactsComponent } from '../../components/prospecting-contacts/prospecting-contacts.component';
import { CommonModule } from '@angular/common';
import { Contact } from '../../models/Contact';
import freeEmailDomains from 'free-email-domains';

@Component({
  selector: 'app-brand-list-contacts',
  imports: [
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
    ContactListCardComponent,
    UploadFileModalContentComponent,
    CommonModule,
  ],
  templateUrl: './brand-list-contacts.component.html',
  styleUrl: './brand-list-contacts.component.scss',
})
export class BrandListContactsComponent implements OnInit, OnDestroy {
  contactLabelsSubscription: Subscription;
  listId;
  listObj;
  limit = 100;
  page = 1;
  isWaitingFlag: boolean = true;
  isLoading: boolean = false;
  userData;
  contactList = [];
  contactListSubscription: Subscription;
  totalContactsCount = 0;
  totalPage;
  selectedContacts: Contact[] = [];
  sortBy = '';
  sortType = '';
  selectAllContacts = false;
  // Rows submitted in the last CSV import — kept so we can map the async import's
  // skipped indices back to full rows when it completes.
  private importedContactsSubmitted: any[] = [];
  @ViewChild('contactCard') contactCard: ContactListCardComponent;

  constructor(
    private prospectingService: ProspectingService,
    private route: ActivatedRoute,
    public _router: Router,
    private ngbOffcanvas: NgbOffcanvas,
    private modal: NgbModal,
    private _authService: AuthService,
    private pageUiService: PageUiService,
  ) {
  }

  async ngOnInit() {
    document.title = 'List Contacts - KEXY Brand Portal';
    this.userData = this._authService.userTokenValue;

    // Set pagination limit from localstorage if found
    const limit = localStorage.getItem(constants.CONTACTS_TABLE_PAGINATION_LIMIT);
    if (limit) {
      this.limit = parseInt(limit);
    }

    this.route.queryParams.subscribe((params) => {
      if (params['listId']) {
        this.listId = params['listId'];
      }
      if (params['page']) {
        // Because pagination in API starts from 0 but we show from 1 in frontend, hence we subtract 1
        this.page = parseInt(params['page']);
      }
    });

    await this.getLists();
    await this.getContacts(true);
    this.setContactSubscription();
    this.isWaitingFlag = false;
  }

  ngOnDestroy() {
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
    if (this.contactListSubscription) this.contactListSubscription.unsubscribe();
    this.prospectingService.selectedAllContacts = false;
  }

  getLists = async () => {
    const cachedLabels = this.prospectingService.cachedLabels;
    if (!Object.keys(cachedLabels).length) {
      await this.prospectingService.getLists({});
    }

    this.contactLabelsSubscription = this.prospectingService.lists.subscribe(async (labels) => {
      if (this.listId) {
        const index = labels.findIndex(l => l.id.toString() === this.listId.toString());
        if (index > -1) {
          this.listObj = labels[index];
          this.listObj['user'] = this.userData;
          // This make sure total contact count does not show the count from listobj.
          // We show total count inside of this.setContactSubscription();
          this.listObj['contactListCount'] = this.totalContactsCount;
          console.log(this.listObj);
        }
      }
    });
  };

  getContactApiPostData = () => {
    return {
      companyId: this.userData.supplier_id,
      dripCampaignId: '',
      listIds: [parseInt(this.listId)],
      contactName: '',
      companyName: '',
      jobTitle: '',
      emailStatus: '',
      marketingStatus: '',
      city: '',
      state: '',
      country: '',
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
      sortType: this.sortType,
    };
  };

  getContacts = async (overwrite = false) => {
    const postData = this.getContactApiPostData();
    await this.prospectingService.getContacts(postData, overwrite);
  };

  setContactSubscription = () => {
    this.contactListSubscription = this.prospectingService.contactRes.subscribe((data) => {
      this.contactList = this.prospectingService.setLabelsInContactsList(data.contacts);
      this.totalContactsCount = data.total;
      this.totalPage = Math.ceil(this.totalContactsCount / this.limit);
      this.listObj['contactListCount'] = this.totalContactsCount;

      // Resetting edit and contact button showing condition. Also clear the
      // cross-page "select all" flag — the freshly loaded contacts aren't selected,
      // so leaving it on made the Verify button show the full count after a reload
      // (e.g. right after a CSV import).
      this.selectedContacts = [];
      this.selectAllContacts = false;
      this.prospectingService.selectedAllContacts = false;
    });
  };

  receivedLimitNumber = async (limit) => {
    this.limit = parseInt(limit);
    localStorage.setItem(constants.CONTACTS_TABLE_PAGINATION_LIMIT, limit);
    this.page = 1;

    this.isWaitingFlag = true;
    this._router.navigate(
      [],
      {
        relativeTo: this.route,
        queryParams: { listId: this.listId, page: 1 },
      },
    ).then(async res => {
      console.log(res);
    });
    await this.getContacts(true);
    this.isWaitingFlag = false;
  };

  paginationRightArrowClick = async () => {
    if (this.page === this.totalPage) return; // Here added 1 with page because page starts with 0
    this.page = this.page + 1;
    await this.getPaginatedContacts();

    // Reset select all contact
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };

  paginationLeftArrowClick = async () => {
    if (this.page === 1) return; // Here added 1 with page because page starts with 0
    this.page = this.page - 1;
    await this.getPaginatedContacts();

    // Reset select all contact
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };

  getPaginatedContacts = async () => {
    this.isLoading = true;
    this._router.navigate(
      [],
      {
        relativeTo: this.route,
        queryParams: { listId: this.listId, page: this.page },
        queryParamsHandling: 'merge',
      },
    ).then(async res => {
      await this.getContacts(false);

      // if (res) {
      //   await this.getContacts(true);
      // }
      this.isLoading = false;
    });
  };

  handleSortByCreatedAt = async (column) => {
    if (column === constants.TITLE) {
      this.sortBy = constants.JOB_TITLE;

    } else if (column === constants.COMPANY_NAME) {
      this.sortBy = constants.COMPANY_NAME;

    } else {
      this.sortBy = constants.CREATED_AT;
    }

    this.page = 1;
    if (!this.sortType || this.sortType === constants.DESENDING.toLowerCase()) {
      this.sortType = constants.ASENDING.toLowerCase();
    } else {
      this.sortType = constants.DESENDING.toLowerCase();
    }

    await this.getPaginatedContacts();

    // Clear contact cache
    this.prospectingService.cachedContactPages = {};
  };

  navigateSpecificPage = async (page) => {
    if (page < 1) this.page = 1;
    if (page > this.totalPage) this.page = this.totalPage;
    this.page = page;
    await this.getPaginatedContacts();

    // Reset select all contact
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };

  handleContactSelect = (selectedRow, isSelectAll) => {
    if (isSelectAll) {
      // Toggle the whole page. Use a Set for membership so this stays O(n)
      // instead of O(n²) (findIndex/splice inside a loop lagged on big pages).
      const anySelected = this.contactList.some((i) => i.isSelected);
      if (anySelected) {
        const pageIds = new Set(this.contactList.map((i) => i.id));
        this.contactList.forEach((i) => (i.isSelected = false));
        this.selectedContacts = this.selectedContacts.filter((j) => !pageIds.has(j.id));
      } else {
        const existingIds = new Set(this.selectedContacts.map((j) => j.id));
        this.contactList.forEach((i) => {
          i.isSelected = true;
          if (!existingIds.has(i.id)) {
            this.selectedContacts.push(i);
            existingIds.add(i.id);
          }
        });
      }
    } else {
      const row = this.contactList.find((i) => i.id === selectedRow.id);
      if (!row) return;
      row.isSelected = !row.isSelected;
      if (row.isSelected) {
        if (!this.selectedContacts.some((j) => j.id === row.id)) {
          this.selectedContacts.push(row);
        }
      } else {
        this.selectedContacts = this.selectedContacts.filter((j) => j.id !== row.id);
      }
    }

    // Reset select all contact
    this.selectAllContacts = false;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;

    // Save selected contact in service inorder to use it in contact add or edit sidebar.
    this.prospectingService.selectedContactsInContactsPage = this.selectedContacts;
  };

  backBtnClick = async () => {
    await this._router.navigate([routeConstants.BRAND.MANAGE_LIST]);
  };

  editContactClick = (data = null) => {
    if (data) {
      this.prospectingService.clickedContactInContactPage = [data];
    }
    this.prospectingService.listIdWhenEditContactFromListContactPage = this.listId;
    this.openContactSlider();
  };

  createContactClick = () => {
    this.prospectingService.selectedLabelIdInListContactPage = this.listId;
    this.prospectingService.isAddNewButtonClickedInContactPage = true;
    this.openContactSlider();
  };

  openContactSlider = () => {
    this.ngbOffcanvas.open(ProspectingContactsComponent, {
      panelClass: 'contact-slide-content edit-rep-canvas',
      backdropClass: 'edit-rep-canvas-backdrop',
      position: 'end',
      scroll: false,
    });
  };

  __isConfirmed = async (text = 'This action can not be undone.') => {
    let isConfirm = await Swal.fire({
      title: `Are you sure?`,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Delete!',
    });

    return !isConfirm.dismiss;
  };

  deleteContacts = async () => {
    let isConfirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
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

    const contactIds = [];
    this.selectedContacts.map((contact: Contact) =>
      contactIds.push({
        id: contact.id,
        // email: contact.email,
        // firstName: contact.details.firstName,
        // lastName: contact.details.lastName,
        // name: contact.contactName,
        // title: contact.jobTitle,
      }),
    );
    const postData = {
      companyId: this.userData.supplier_id,
      contacts: contactIds,
    };
    // "Select all" spans every page, not just the loaded contactIds — tell the
    // API to delete the whole filtered set (scoped to this list) instead of the
    // current page. Mirrors the brand-contacts page's deleteContacts.
    if (this.selectAllContacts) {
      postData['selectedAllContacts'] = true;
      postData['selectedAllContactsPayload'] = this.getContactApiPostData();
      postData['contacts'] = [];
    }
    try {
      await this.prospectingService.deleteContacts(postData);
      await this.getContacts(true);
      this.prospectingService.selectedContacts = [];
      Swal.close();
    } catch (e) {
      Swal.close();
      await Swal.fire('Error', e.message);
    }
  };


  deleteContactsFromList = async () => {
    const confirmed = await this.__isConfirmed("");
    if (!confirmed) return;
    console.log(this.selectedContacts);
    const contactIds = [];
    this.selectedContacts.forEach(c => {
      let labelIds = c.listIds;
      const index = labelIds.indexOf(this.listId);
      if (index > -1) {
        labelIds.splice(index, 1);
      }
      c.listIds = labelIds;
      contactIds.push({ id: c.id });
    });
    const postData = {
      companyId: this.userData.supplier_id,
      contacts: contactIds,
      listId: this.listId,
    };
    if (this.selectAllContacts) {
      postData['selectedAllContacts'] = true;
      postData['selectedAllContactsPayload'] = this.getContactApiPostData();
      postData['contacts'] = [];
    }

    const swlLoading = this.pageUiService.showSweetAlertLoading();
    try {
      swlLoading.showLoading();
      await this.prospectingService.removeContactsFromList(postData);
      await this.prospectingService.getLists({ supplier_id: this.userData.supplier_id });
      await this.getContacts(true);
      swlLoading.close();
    } catch (e) {
      swlLoading.close();
      await Swal.fire('Error', e.message);
    }

  };

  modalReference;
  @ViewChild('uploadContacts', { static: true }) uploadContacts: ElementRef;
  importBtnClick = () => {
    this.modalReference = this.modal.open(this.uploadContacts, { size: 'md' });
  };

  closeModal = () => {
    this.modalReference.close();
  };

  bypassEmailVerification = false;
  handleBypassEmailVerification = (bypass) => {
    this.bypassEmailVerification = bypass;
  };

  // EXPERIMENTAL: open the spreadsheet-style preview (review/remove invalid
  // email/URL rows) before running the actual import.
  showImportPreview = (data) => {
    this.closeModal(); // close the upload modal
    const ref = this.modal.open(ImportPreviewModalContentComponent, {
      size: 'xl',
      windowClass: 'import-preview-window',
      backdrop: 'static',
      keyboard: false,
    });
    ref.componentInstance.parsedData = data;
    ref.componentInstance.closeModal = () => ref.close();
    // Close the preview immediately; the import-progress banner shows in its place
    // (getImportedFileData calls contactCard.beginImport() right away).
    ref.componentInstance.startImport = (cleaned) => {
      ref.close();
      this.getImportedFileData(cleaned);
    };
  };

  getImportedFileData = async (data) => {
    this.isLoading = true;

    const contacts = Contact.parseCsvDataToContact(data);

    const payload = {
      companyId: this.userData.supplier_id,
      contacts: contacts,
      listIds: [this.listId],
    };

    if (this.bypassEmailVerification) {
      payload['bypassEmailVerification'] = true;
    }

    // Show the progress banner immediately (preview already closed), remember the
    // submitted rows, then kick off the async import and switch to live polling.
    this.importedContactsSubmitted = contacts;
    this.contactCard?.beginImport();
    try {
      const res: any = await this.prospectingService.addContacts(payload);
      this.isLoading = false;
      this.contactCard?.startImportPolling(res?.importId);
    } catch (e) {
      this.isLoading = false;
      this.contactCard?.cancelImport();
      await Swal.fire('Error', e.error);
    }
  };

  // Async import finished (status = complete). Refresh lists + contacts, then show
  // the skipped-rows modal (or a success alert when nothing was skipped).
  handleImportCompleted = async (data: any) => {
    // Show the completion feedback IMMEDIATELY — the moment the progress banner
    // disappears — instead of waiting for the reload below.
    if (data?.skipped?.length) {
      this.showImportResults(data, this.importedContactsSubmitted || []);
    } else {
      this.pageUiService.showSweetAlert(
        'Import complete',
        `${data?.importedCount ?? 0} contact(s) imported successfully.`,
        'success',
      );
    }
    // Refresh the freshly imported contacts behind the alert/modal (in-table
    // loader, like the drip-campaign table) so there's no blank gap.
    this.isWaitingFlag = true;
    try {
      await this.prospectingService.getLists({ supplier_id: this.userData.supplier_id });
      await this.getContacts(true);
    } finally {
      this.isWaitingFlag = false;
    }
  };

  // After a CSV import, open a modal listing every SKIPPED contact (full details
  // + the validation errors). `skipped[i].contact` is the index into the submitted
  // `contacts` array; we map it back (falling back to an email match) so the modal
  // can show the full row, not just the email.
  private showImportResults = (res: any, contacts: any[]) => {
    const skippedRaw = res?.skipped || [];
    if (!skippedRaw.length) return;

    const skipped = skippedRaw.map((s: any) => {
      const byIndex = contacts[s.contact];
      // `contacts` items are flat contactPostDto objects (firstName, lastName,
      // title, email, city/state/country, organization.name) — NOT nested .details.
      const m = ((byIndex && byIndex.email === s.email)
        ? byIndex
        : (contacts.find((c: any) => c.email === s.email) || byIndex)) || {};
      return {
        firstName: m.firstName || '',
        lastName: m.lastName || '',
        email: s.email || m.email || '',
        company: m.organization?.name || '',
        jobTitle: m.title || m.headline || '',
        location: [m.city, m.state, m.country].filter(Boolean).join(', '),
        errors: s.errors || [],
      };
    });

    const modalRef = this.modal.open(ImportResultsModalContentComponent, {
      size: 'xl',
      scrollable: true,
      backdrop: 'static', // don't close on outside click
      keyboard: false,     // don't close on Esc — only Done / X
    });
    modalRef.componentInstance.importedCount = res.importedCount ?? 0;
    modalRef.componentInstance.skippedCount = res.skippedCount ?? skipped.length;
    modalRef.componentInstance.skipped = skipped;
    modalRef.componentInstance.closeModal = () => modalRef.close();
  };

  toggleSelectAllContactSelection = () => {
    this.selectAllContacts = !this.selectAllContacts;
    this.prospectingService.selectedAllContacts = this.selectAllContacts;
  };
}
