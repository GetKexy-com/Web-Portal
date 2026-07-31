import { Component, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { CACHE_SCOPE, CacheVersionService } from '../../services/cache-version.service';
import { IDripCampaignListCacheEntry } from '../../services/drip-campaign.service';
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
import { TimeAgoComponent } from '../../components/time-ago/time-ago.component';
import { DripCampaign } from '../../models/DripCampaign';

@Component({
  selector: 'brand-list-of-drip-campaigns',
  standalone: true,
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    ListOfDripCampaignTableComponent,
    TimeAgoComponent,
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
  private cacheVersions = inject(CacheVersionService);

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
  /**
   * A revalidation is in flight while rows are ALREADY on screen.
   *
   * Distinct from `isWaitingFlag`, which blanks the table for a skeleton. This one
   * only dims the refresh button, because replacing a populated table with a skeleton
   * to fetch data the user is already looking at is the exact jank this page had.
   */
  isRefreshing = signal(false);
  /**
   * When the rows on screen were fetched. Rendered beside the refresh button.
   *
   * This is what makes the freshness window honest rather than a hidden staleness bug:
   * a table that is quietly seconds behind is broken, a table that says when it was
   * taken is a snapshot, and the refresh control is then the obvious remedy. It is the
   * ingredient that makes the AWS-console pattern work.
   */
  lastUpdatedAt = signal<number | null>(null);

  /**
   * How long a snapshot is reused without asking the server again.
   *
   * Bounds every kind of staleness the local write-tracking cannot see: another user's
   * changes, another tab's, and backend-driven status flips (a campaign going
   * `active` -> `complete` when its sequence finishes). A user's OWN writes bypass this
   * entirely — see `CacheInvalidationInterceptor`.
   */
  private static readonly STALE_AFTER_MS = 15_000;

  // Constants
  protected readonly constants = constants;

  /**
   * The list is a SNAPSHOT, with its age on display and a refresh control — the
   * pattern the AWS console uses for its resource tables.
   *
   * This page is re-created on every navigation, so it used to blank the table and
   * refetch on every return, including the list -> campaign -> list trip users make
   * constantly. Now a snapshot younger than `STALE_AFTER_MS` is simply reused and no
   * request is made at all, which is the only lever available that avoids the database
   * query entirely (a conditional GET still runs it and merely declines to send the
   * bytes).
   *
   * Three things keep that honest:
   *  - the user's OWN writes bypass the window completely, via the version bumped by
   *    `CacheInvalidationInterceptor` — otherwise renaming a campaign and coming back
   *    would show the old name, which reads as data loss;
   *  - everything the local tracking cannot see (other users, other tabs, the backend
   *    flipping a campaign to `complete`) is bounded by the window;
   *  - `lastUpdatedAt` is rendered, so the age is disclosed rather than hidden.
   */
  async ngOnInit() {
    document.title = 'List of Drip Campaign - KEXY Brand Portal';
    this.userData.set(this.authService.userTokenValue);

    const limit = localStorage.getItem(constants.BRAND_DRIP_CAMPAIGN_PAGE_LIMIT);
    this.setPageLimit(limit ? parseInt(limit) : this.limit());

    const cached = this.dripCampaignService.peekListOfDripCampaigns(
      this.userData()?.supplier_id,
      this.limit(),
      this.page(),
      this.filterStatus(),
    );
    if (cached) {
      this.__applyDripCampaigns(cached.data);
      this.lastUpdatedAt.set(cached.at);
    }

    // The subscription must be established either way — it is a BehaviorSubject, so
    // it replays the last titles immediately. Only the FETCH behind it is skippable.
    this.__subscribeToDripCampaignTitles();

    if (this.__canReuseSnapshot(cached)) {
      this.initialLoads.set(false);
      return;
    }

    // Skeleton only when there is nothing to show; otherwise revalidate underneath the
    // rows already on screen.
    this.isWaitingFlag.set(!cached);
    this.isRefreshing.set(!!cached);

    await Promise.all([
      this.dripCampaignService.getAllDripCampaignTitle({
        supplier_id: this.userData().supplier_id,
      }),
      this.getListOfDripCampaigns(),
      // this.getLabels()
    ]);

    this.isWaitingFlag.set(false);
    this.isRefreshing.set(false);
    this.initialLoads.set(false);
  }

  /**
   * True when the cached snapshot can stand in for a fetch.
   *
   * Both conditions are required. The version check alone would show stale rows after
   * anyone else's change; the age check alone would show stale rows after the user's
   * own edit, within the window — which is the common flow and the worse bug.
   */
  private __canReuseSnapshot(cached: IDripCampaignListCacheEntry | null): boolean {
    if (!cached) return false;
    if (cached.version !== this.cacheVersions.version(CACHE_SCOPE.DRIP_CAMPAIGNS)) return false;
    return Date.now() - cached.at < BrandListOfDripCampaignsComponent.STALE_AFTER_MS;
  }

  /**
   * Refetch on demand. The rows stay on screen throughout — the button's own spinner
   * is the feedback, so pressing refresh never costs you the table you were reading.
   */
  refresh = async () => {
    if (this.isRefreshing() || this.isWaitingFlag()) return;
    this.isRefreshing.set(true);
    try {
      await this.getListOfDripCampaigns();
    } finally {
      this.isRefreshing.set(false);
    }
  };

  async getLabels() {
    await this.prospectingService.getLists({ supplier_id: this.userData().supplier_id });
  }


  getListOfDripCampaigns = async () => {
    const data = await this.dripCampaignService.getListOfDripCampaigns(
      this.limit(),
      this.page(),
      this.filterStatus(),
      // Cache scope — see the service. Without it the business switcher would show
      // the previous company's campaigns for one round trip.
      this.userData()?.supplier_id,
      this.cacheVersions.version(CACHE_SCOPE.DRIP_CAMPAIGNS),
    );

    this.__applyDripCampaigns(data);
    this.lastUpdatedAt.set(Date.now());
  };

  /** Shared by the cached read and the live response so the two can't diverge. */
  private __applyDripCampaigns = (data: any) => {
    this.dripCampaignList.set(data['dripCampaigns']);
    this.totalPageCounts.set(data['totalPageCounts']);
    this.totalRecordsCount.set(data['totalRecordsCount']);
  };

  /**
   * Subscribe only — the fetch is a separate call in `ngOnInit`, because it is
   * skippable while this is not.
   *
   * `dripCampaignTitles` is a BehaviorSubject, so subscribing replays the last titles
   * immediately. That is what lets a reused snapshot render with its titles intact
   * without a request.
   */
  private __subscribeToDripCampaignTitles = () => {
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

  /**
   * Start a new campaign. No query params — an `id` is what makes the builder open an
   * EXISTING campaign, so passing none is what distinguishes create from edit.
   */
  redirectToCreatePage = () => {
    this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN]);
  };

  redirectToEditPage = (duplicate = false) => {
    const queryParams: any = {
      id: this.selectedDripCampaigns()[0]?.id,
    };

    if (duplicate) {
      queryParams.action = 'duplicate';
    }

    // Duplicating lands on CREATE, editing on EDIT. A duplicate makes a NEW campaign
    // out of the one named by `id`, so `create?id=…&action=duplicate` is the accurate
    // URL — and the sidebar highlighting "Create Campaign" is then correct too.
    this.router.navigate(
      [duplicate ? routeConstants.BRAND.CREATE_DRIP_CAMPAIGN : routeConstants.BRAND.EDIT_DRIP_CAMPAIGN],
      { queryParams },
    );
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

  paginationFirstClick = async () => {
    if (this.page() === 1) return;
    this.isLoading.set(true);
    this.page.set(1);
    await this.getListOfDripCampaigns();
    this.isLoading.set(false);
  };

  paginationLastClick = async () => {
    if (this.page() === this.totalPageCounts()) return;
    this.isLoading.set(true);
    this.page.set(this.totalPageCounts());
    await this.getListOfDripCampaigns();
    this.isLoading.set(false);
  };

  navigateToPage = async (pageNum: number) => {
    if (!pageNum || pageNum === this.page()) return;
    this.isLoading.set(true);
    this.page.set(pageNum);
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
