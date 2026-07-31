import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { constants } from 'src/app/helpers/constants';
import { routeConstants } from 'src/app/helpers/routeConstants';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import { SseService } from 'src/app/services/sse.service';
import { dripCampaignInitialModalData } from 'src/app/helpers/demoData';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NewFeaturePageAccessService } from 'src/app/services/new-feature-page-access.service';
import { CampaignService } from 'src/app/services/campaign.service';
import {
  KexyTutorialModalContentComponent,
} from 'src/app/components/kexy-tutorial-modal-content/kexy-tutorial-modal-content.component';
import { BrandLayoutComponent, IBreadcrumb } from '../../layouts/brand-layout/brand-layout.component';
import { ProgressCountComponent } from '../../components/progress-count/progress-count.component';
import {
  KexyProTipsModalContentComponent,
} from '../../components/kexy-pro-tips-modal-content/kexy-pro-tips-modal-content.component';
import { DripCampaignContentComponent } from '../../components/drip-campaign-content/drip-campaign-content.component';
import {
  GenerateDripCampaignComponent,
} from '../../components/generate-drip-campaign/generate-drip-campaign.component';
import { CommonModule } from '@angular/common';
import { CAMPAIGN_STATUS, DripCampaign } from '../../models/DripCampaign';

@Component({
  selector: 'brand-drip-campaign',
  imports: [
    BrandLayoutComponent,
    ProgressCountComponent,
    KexyProTipsModalContentComponent,
    DripCampaignContentComponent,
    GenerateDripCampaignComponent,
    CommonModule,
  ],
  templateUrl: './brand-drip-campaign.component.html',
  styleUrl: './brand-drip-campaign.component.scss',
})
export class BrandDripCampaignComponent implements OnInit, OnDestroy {
  public currentStep = 1;
  public steps = [
    {
      no: 1,
      title: 'Drip Campaign Content',
    },
    {
      no: 2,
      title: 'Generate Emails',
    },
  ];
  /**
   * Header trail: `Manage Campaigns › <campaign name>`. A FIELD refreshed by
   * `__setBreadcrumbs()` rather than a getter — a getter would allocate a new array on
   * every change-detection pass and make the `*ngFor` re-render each time.
   *
   * A trail rather than a static title because this page is BOTH the create and the
   * edit surface for a campaign (`list-of-drip-campaign-table` and
   * `prospecting-contacts` both route here with an `id`), and a fixed heading can't
   * say which of forty campaigns you have open. The parent crumb doubles as the way
   * back to the list you most likely came from.
   *
   * Seeded with just the parent; the leaf is appended by `__setBreadcrumbs()`.
   */
  public breadcrumbs: IBreadcrumb[] = [
    { label: 'Manage Campaigns', link: routeConstants.BRAND.LIST_DRIP_CAMPAIGN },
  ];
  /**
   * Which of the two paths this screen was opened on — `…/create` or `…/edit`. They
   * load the SAME component (see `EDIT_DRIP_CAMPAIGN`), and the wizard re-navigates to
   * itself when moving between steps, so it has to re-navigate to the path it is
   * already on. Sending an edit session back to `…/create` would put "create" in the
   * address bar and relight the sidebar's Create Campaign item mid-edit.
   */
  public basePath: string = routeConstants.BRAND.CREATE_DRIP_CAMPAIGN;
  public userData;
  public dripCampaignId;
  public dripCampaign: DripCampaign;
  public loadingSubscription: Subscription;
  public dripCampaignInitialModalSubscription: Subscription;
  public isWaitingFlag: boolean = false;
  public dripCampaignDuplicate: boolean = false;
  public features = dripCampaignInitialModalData;
  public routeConstants = routeConstants;

  constructor(
    private router: Router,
    private sseService: SseService,
    private dripCampaignService: DripCampaignService,
    private campaignService: CampaignService,
    private _newFeaturePageAccessService: NewFeaturePageAccessService,
    private _authService: AuthService,
    private modal: NgbModal,
    private route: ActivatedRoute,
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = this.resetDripCampaignData.bind(this);
  }

  @ViewChild('dripCampaignInitialModal', { static: true }) dripCampaignInitialModal: ElementRef;

  resetDripCampaignData = () => {
    this.dripCampaignService.removeDripCampaign();
    this.sseService.removeDripBulkEmailData();
  };

  async ngOnInit() {
    document.title = 'Brand Drip Campaign - KEXY Brand Portal';
    this.userData = this._authService.userTokenValue;
    this.basePath =
      this.removeQueryParams(this.router.url) === '/' + routeConstants.BRAND.EDIT_DRIP_CAMPAIGN
        ? routeConstants.BRAND.EDIT_DRIP_CAMPAIGN
        : routeConstants.BRAND.CREATE_DRIP_CAMPAIGN;

    this.loadingSubscription = this.dripCampaignService.loading.subscribe((loading) => {
      this.isWaitingFlag = loading;
    });

    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        this.currentStep = null;
        this.dripCampaignId = params['id'];
        this.getCampaign().then();
      }

      if (params['action'] && params['action'] === constants.DUPLICATE) {
        this.dripCampaignDuplicate = true;
      }

      // Runs after the branches above, so it sees the final `dripCampaignId` /
      // `dripCampaignDuplicate` for this navigation. `getCampaign()` is async, so an
      // existing campaign shows the placeholder leaf until its name arrives — it
      // calls this again once it has one.
      this.__setBreadcrumbs();
    });

    await this._newFeaturePageAccessService.getPageAccessDataForUser(this.userData.id);
    this.dripCampaignInitialModalSubscription = this._newFeaturePageAccessService.dripCampaignPage.subscribe((hidePopup) => {
      if (!hidePopup) {
        if (window.innerWidth < 992) {
          this.modal.open(KexyTutorialModalContentComponent, { size: 'sm' });
        } else {
          this.modal.open(KexyTutorialModalContentComponent, { size: 'lg' });
        }
      }
    });

    // this._authService.sendSlackNotification();
  }

  ngOnDestroy(): void {
    // `shouldReuseRoute` is overridden to always return falsy, so this component is
    // destroyed and rebuilt even when the wizard navigates to ITSELF between steps.
    // Bailing out when the next URL is still this screen is what stops that
    // self-navigation from wiping the campaign the user is part-way through. Both
    // paths have to be listed: an edit session re-navigates to `…/edit`, and a miss
    // here would clear the campaign right before step 2 renders it.
    const nextPath = this.removeQueryParams(this.router.url);
    if (
      nextPath === '/' + routeConstants.BRAND.CREATE_DRIP_CAMPAIGN ||
      nextPath === '/' + routeConstants.BRAND.EDIT_DRIP_CAMPAIGN
    ) return;
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
    if (this.dripCampaignInitialModalSubscription) this.dripCampaignInitialModalSubscription.unsubscribe();
    this.dripCampaignService.removeDripCampaign();
    this.campaignService.resetCampaignDataToDefault();
  }


  removeQueryParams(url: string): string {
    const parts = url.split('?');
    return parts[0];
  }

  getCampaign = async () => {
    if (!this.dripCampaignId) {
      return false;
    }
    const postData = {
      drip_campaign_id: this.dripCampaignId,
      supplier_id: this.userData.supplier_id,
    };
    const campaign = await this.dripCampaignService.getCampaign(postData);
    if (campaign && campaign['currentStep'] === constants.CAMPAIGN_CONTENT) {
      this.currentStep = 1;
    }
    if (campaign && campaign['currentStep'] === constants.GENERATE_EMAILS) {
      this.currentStep = 2;
    }
    if (campaign && this.dripCampaignDuplicate) {
      this.currentStep = 1;
    }

    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    this.__setBreadcrumbs();
  };

  /**
   * Rebuilds the header trail. Called whenever the campaign (and so its name) changes.
   *
   * There is ALWAYS a leaf crumb. The layout renders the last crumb as the page's
   * `<h1>`, so dropping the leaf while the name loads would leave "Manage Campaigns"
   * as the heading — which reads as being on the list page rather than inside a
   * campaign.
   */
  private __setBreadcrumbs = () => {
    const crumbs: IBreadcrumb[] = [
      { label: 'Manage Campaigns', link: routeConstants.BRAND.LIST_DRIP_CAMPAIGN },
    ];

    // Duplicating starts a NEW campaign from an existing one, so the source's name
    // would be naming a campaign this page isn't editing.
    if (this.dripCampaignDuplicate || !this.dripCampaignId) {
      crumbs.push({ label: 'New Campaign' });
    } else {
      // Falls back while the campaign loads — a blank or "…" crumb is worse than a
      // generic one that is still true.
      const title = this.dripCampaign?.details?.title?.title?.trim();
      crumbs.push({ label: title || 'Campaign Builder' });
    }

    this.breadcrumbs = crumbs;
  };


  nextBtnClick = async (campaignId = '', overwrite = false) => {
    this.currentStep = ++this.currentStep;

    const cId = this.dripCampaignId && !overwrite ? this.dripCampaignId : campaignId;
    if (cId) {
      // `basePath`, not a hardcoded CREATE — see the field. Keeps an edit session on
      // `…/edit` when it advances to step 2.
      await this.router.navigate([this.basePath], { queryParams: { id: cId } });
    }
  };

  backBtnClick = () => {
    if (this.currentStep === 1) return;
    this.currentStep = --this.currentStep;
  };

  handleTutorialBtnClick = () => {
    window.open(environment.dripCampaignCreateTutorialUrl, '_blank');
  };
  protected readonly CAMPAIGN_STATUS = CAMPAIGN_STATUS;
}
