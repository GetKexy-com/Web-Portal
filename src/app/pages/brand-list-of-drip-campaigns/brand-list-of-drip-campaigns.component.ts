import { Component, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { constants } from 'src/app/helpers/constants';
import { routeConstants } from 'src/app/helpers/routeConstants';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { PageUiService } from 'src/app/services/page-ui.service';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import {
  ListOfDripCampaignTableComponent,
} from '../../components/list-of-drip-campaign-table/list-of-drip-campaign-table.component';
import { DripCampaign } from '../../models/DripCampaign';

@Component({
  selector: 'brand-list-of-drip-campaigns',
  standalone: true,
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    ListOfDripCampaignTableComponent,
    BrandLayoutComponent,
    KexyButtonComponent,
  ],
  templateUrl: './brand-list-of-drip-campaigns.component.html',
  styleUrl: './brand-list-of-drip-campaigns.component.scss',
})
export class BrandListOfDripCampaignsComponent implements OnInit {
  // Services
  private authService = inject(AuthService);
  private router = inject(Router);
  private dripCampaignService = inject(DripCampaignService);
  private prospectingService = inject(ProspectingService);
  private httpService = inject(HttpService);
  private pageUiService = inject(PageUiService);
  private destroyRef = inject(DestroyRef);

  // State signals
  isWaitingFlag = signal(false);
  initialLoads = signal(true);
  isLoading = signal(false);
  dripCampaignList = signal<DripCampaign[]>([]);
  page = signal(1);
  limit = signal(25);
  filterStatus = signal(constants.DRIP_CAMPAIGN_STATUS[0].key);
  userData = signal<any>(null);
  dripCampaignTitles = signal<any[]>([]);
  totalPageCounts = signal(1);
  totalRecordsCount = signal(0);
  selectedDripCampaigns = signal<any[]>([]);
  selectedAllDripCampaigns = signal(false);

  // Constants
  protected readonly constants = constants;

  async ngOnInit() {
    document.title = 'List of Drip Campaign - KEXY Brand Portal';
    this.isWaitingFlag.set(true);
    this.userData.set(this.authService.userTokenValue);

    const limit = localStorage.getItem(constants.BRAND_DRIP_CAMPAIGN_PAGE_LIMIT);
    this.setPageLimit(limit ? parseInt(limit) : this.limit());

    await Promise.all([
      this.getAndSetDripCampaignTitleSubscription(),
      this.getListOfDripCampaigns(),
      // this.getLabels()
    ]);
    console.log('dripCampaignList', this.dripCampaignList());

    this.isWaitingFlag.set(false);
    this.initialLoads.set(false);
  }

  async getLabels() {
    await this.prospectingService.getLists({ supplier_id: this.userData().supplier_id });
  }


  getListOfDripCampaigns = async () => {
    const data = await this.dripCampaignService.getListOfDripCampaigns(
      this.limit(),
      this.page(),
      this.filterStatus(),
    );

    this.dripCampaignList.set(data['dripCampaigns']);
    this.totalPageCounts.set(data['totalPageCounts']);
    this.totalRecordsCount.set(data['totalRecordsCount']);
  };

  getAndSetDripCampaignTitleSubscription = async () => {
    await this.dripCampaignService.getAllDripCampaignTitle({
      supplier_id: this.userData().supplier_id,
    });

    this.dripCampaignService.dripCampaignTitles
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(titles => {
        const processedTitles = titles.map(i => ({
          ...i,
          value: i.title.length > 100 ? `${i.title.slice(0, 100)}...` : i.title,
        }));
        this.dripCampaignTitles.set(processedTitles);
      });
  };

  setPageLimit = (newLimit: number) => {
    localStorage.setItem(constants.BRAND_DRIP_CAMPAIGN_PAGE_LIMIT, newLimit.toString());
    this.limit.set(newLimit);
  };

  pauseOrResumeOrDeleteDripCampaign = async (forDelete = false) => {
    const dripCampaign: DripCampaign = this.selectedDripCampaigns()[0];
    if (!dripCampaign) return;

    const confirmText = forDelete
      ? 'Yes, Delete!'
      : (dripCampaign.status === constants.ACTIVE ? 'Yes, Pause!' : 'Yes, Resume!');

    const isConfirm = await Swal.fire({
      title: 'Are you sure?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: confirmText,
    });

    if (isConfirm.dismiss) return;

    const payload = {
      dripCampaignId: dripCampaign.id,
      companyId: this.userData().supplier_id,
      dripCampaignTitleId: dripCampaign.details.title.id,
      numberOfEmails: dripCampaign.details.numberOfEmails,
      emailTone: dripCampaign.details.emailTone,
      emailLength: dripCampaign.details.emailLength || '',
      websiteUrl: dripCampaign.details.websiteUrl,
      calendlyLink: dripCampaign.details.calendlyLink,
      campaignId: dripCampaign.details.campaignId,
      status: forDelete
        ? constants.DELETED
        : (dripCampaign.status === constants.ACTIVE ? constants.PAUSE : constants.ACTIVE),
      targetAudience: dripCampaign.targetAudience,
      emailAbout: dripCampaign.emailAbout,
      audienceType: dripCampaign.audienceType,
    };

    const swal = this.pageUiService.showSweetAlertLoading();

    try {
      swal.showLoading();
      await this.dripCampaignService.createOrUpdateDripCampaign(payload);

      if (forDelete) {
        await this.getListOfDripCampaigns();
        this.selectedDripCampaigns.set([]);
      } else {
        // const updatedList = this.dripCampaignList().map(item =>
        //   item.id === dripCampaign.id ? { ...item, status: payload.status } : item
        // );
        // this.dripCampaignList.set(updatedList);

        dripCampaign.status = payload.status;
      }

    } catch (e) {
      Swal.fire('Error', e.message);
      console.error(e);
    } finally {
      swal.close();
    }
  };

  deleteDripCampaigns = async () => {
    if (!this.selectedDripCampaigns().length) return;

    const isConfirm = await Swal.fire({
      title: 'Are you sure?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Delete!',
    });

    if (isConfirm.dismiss) return;

    const swal = this.pageUiService.showSweetAlertLoading();
    swal.showLoading();

    const postData = {
      ids: this.selectedAllDripCampaigns()
        ? []
        : this.selectedDripCampaigns().map(i => i.id),
      selectedAll: this.selectedAllDripCampaigns() ? 'true' : undefined,
    };

    try {
      await this.dripCampaignService.deleteDripCampaigns(postData);
      await this.getListOfDripCampaigns();
      this.selectedDripCampaigns.set([]);
      this.selectedAllDripCampaigns.set(false);
    } catch (e) {
      Swal.fire('Error', e.message);
    } finally {
      swal.close();
    }
  };

  redirectToEditPage = (duplicate = false) => {
    const queryParams: any = {
      id: this.selectedDripCampaigns()[0]?.id,
    };

    if (duplicate) {
      queryParams.action = 'duplicate';
    }

    this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN], { queryParams });
  };

  setBtnLabelBasedOnCampaignStatus = () => {
    const dripCampaign = this.selectedDripCampaigns()[0];
    if (!dripCampaign) return '';
    return dripCampaign.status === constants.ACTIVE ? 'Pause' : 'Resume';
  };

  setBtnIconBasedOnCampaignStatus = () => {
    const dripCampaign = this.selectedDripCampaigns()[0];
    if (!dripCampaign) return '';
    return dripCampaign.status === constants.ACTIVE ? 'fa-pause-circle-o' : 'fa-play-circle-o';
  };

  receivedLimitNumber = async (limit: number) => {
    this.setPageLimit(limit);
    this.page.set(1);
    this.isWaitingFlag.set(true);
    await this.getListOfDripCampaigns();
    this.isWaitingFlag.set(false);
  };

  receivedDripStatusFilter = async (status: any) => {
    console.log(status);
    this.page.set(1);
    this.filterStatus.set(status);
    this.isWaitingFlag.set(true);
    await this.getListOfDripCampaigns();
    this.isWaitingFlag.set(false);
  };

  paginationRightArrowClick = async () => {
    if (this.page() === this.totalPageCounts()) return;
    this.isLoading.set(true);
    this.page.update(p => p + 1);
    await this.getListOfDripCampaigns();
    this.isLoading.set(false);
  };

  paginationLeftArrowClick = async () => {
    if (this.page() === 1) return;
    this.isLoading.set(true);
    this.page.update(p => p - 1);
    await this.getListOfDripCampaigns();
    this.isLoading.set(false);
  };

  handleContactSelect = (selectedRow: any, isSelectAll: boolean) => {
    if (isSelectAll) {
      const hasSelected = this.dripCampaignList().some(i => i.isSelected);

      const updatedList = this.dripCampaignList().map(i => ({
        ...i,
        isSelected: !hasSelected,
      }));

      this.dripCampaignList.set(updatedList);

      this.selectedDripCampaigns.set(
        !hasSelected
          ? [...this.dripCampaignList()]
          : [],
      );
    } else {
      const rowIndex = this.dripCampaignList().findIndex(i => i.id === selectedRow.id);
      if (rowIndex === -1) return;

      const updatedList = [...this.dripCampaignList()];
      updatedList[rowIndex] = {
        ...updatedList[rowIndex],
        isSelected: !updatedList[rowIndex].isSelected,
      };

      this.dripCampaignList.set(updatedList);

      this.selectedDripCampaigns.update(selected =>
        updatedList[rowIndex].isSelected
          ? [...selected, updatedList[rowIndex]]
          : selected.filter(j => j.id !== updatedList[rowIndex].id),
      );
    }

    this.selectedAllDripCampaigns.set(false);
  };

  addContactBtnClick = () => {
    this.router.navigate([routeConstants.BRAND.MANAGE_CONTACTS], {
      queryParams: { addToDripCampaignId: this.selectedDripCampaigns()[0]?.id },
    });
  };

  toggleSelectAllSelection = () => {
    this.selectedAllDripCampaigns.update(v => !v);
  };
}
