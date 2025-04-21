import { Component, OnInit, Input, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { CampaignService } from "../../services/campaign.service";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { SseService } from "../../services/sse.service";
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'campaign-layout-bottm-btns',
  imports: [
    KexyButtonComponent,
    CommonModule
  ],
  templateUrl: './campaign-layout-bottm-btns.component.html',
  styleUrl: './campaign-layout-bottm-btns.component.scss'
})
export class CampaignLayoutBottmBtnsComponent {
  @Input() rightFirstBtnClick;
  @Input() rightSecondBtnClick;
  @Input() handleClickSaveDraft;
  @Input() leftSideFirstBtnClick;
  @Input() showLeftSideBtn;
  @Input() showNextButton: boolean = true;
  @Input() showRightSideFirstBtn: boolean = true;
  @Input() showSaveDraftBtn: boolean = false;
  @Input() rightSecondBtnLabel: string = "Next";
  public isWaitingFlag: boolean = false;
  public loadingSubscription: Subscription;
  public dripCampaignLoadingSubscription: Subscription;
  emailContentLoadingSubscription: Subscription;


  constructor(
    private campaignService: CampaignService,
    private sseService: SseService,
    private dripCampaignService: DripCampaignService
  ) {}

  ngOnInit() {
    this.loadingSubscription = this.campaignService.loading.subscribe((loading) => {
      this.isWaitingFlag = loading;
    });
    this.emailContentLoadingSubscription = this.sseService.dripBulkEmailLoading.subscribe((loading) => {
      this.isWaitingFlag = loading;
    });
    this.dripCampaignLoadingSubscription = this.dripCampaignService.loading.subscribe((loading) => {
      this.isWaitingFlag = loading;
    });
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
    if (this.emailContentLoadingSubscription) this.emailContentLoadingSubscription.unsubscribe();
  }

  handleClickRightFirstBtn = () => {
    this.rightFirstBtnClick();
  };

  onClickSaveDraft = () => {
    this.handleClickSaveDraft();
  };

  handleClickRightSecondBtn = () => {
    this.rightSecondBtnClick();
  };

  handleClickLeftFirstBtn = () => {
    this.leftSideFirstBtnClick();
  };
}
