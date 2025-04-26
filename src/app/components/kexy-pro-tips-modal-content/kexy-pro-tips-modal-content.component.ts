// import { Component, OnInit, Input, ViewChild, ElementRef } from "@angular/core";
// import { NewFeaturePageAccessService } from "src/app/services/new-feature-page-access.service";
// import { constants } from "src/app/helpers/constants";
// import { routeConstants } from "src/app/helpers/routeConstants";
// import { AuthService } from "src/app/services/auth.service";
// import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
// import {CardWithIconAndContentComponent} from '../card-with-icon-and-content/card-with-icon-and-content.component';
//
// @Component({
//   selector: 'kexy-pro-tips-modal-content',
//   imports: [
//     KexyButtonComponent,
//     CardWithIconAndContentComponent
//   ],
//   templateUrl: './kexy-pro-tips-modal-content.component.html',
//   styleUrl: './kexy-pro-tips-modal-content.component.scss'
// })
// export class KexyProTipsModalContentComponent {
//   @Input() closeModal;
//   @Input() features;
//   @Input() titlePart1;
//   @Input() titlePart2;
//   @Input() bookCallBtnShow;
//   @Input() proTip;
//   @Input() from;
//   @Input() aurdioUrl;
//   @Input() audioPlayBtnText = constants.MORE_INFO_SARAH;
//   @Input() audioPlayBtnIconLeft = "fa-play";
//   @Input() audioOrTutorialBtnClick;
//   dontShowAgainCheck = false;
//   userId;
//   proTipBusinessOperation = false;
//   proTipMenuPerformance = false;
//   proTipReports = false;
//   proTipInventoryOrders = false;
//   proTipDripCampaign = false;
//   proTipPromotion = false;
//
//   constructor(
//     private _newFeaturePageAccessService: NewFeaturePageAccessService,
//     private _authService: AuthService
//   ) {}
//
//   ngOnInit() {
//     let userToken = this._authService.userTokenValue;
//     this.userId = userToken.id;
//     if (this.from === routeConstants.BRAND.CREATE_DRIP_CAMPAIGN) {
//       this.proTipDripCampaign = true;
//     } else if (this.from === routeConstants.BRAND.PROMOTIONS) {
//       this.proTipPromotion = true;
//     }
//   }
//
//   ngOnDestroy() {
//     this.close();
//   }
//
//   close() {
//     this.closeModal();
//     if (this.dontShowAgainCheck) {
//       this.dontShowModalApiCall(this.from);
//     } else {
//       if (this.from === routeConstants.BRAND.PROMOTIONS) this._newFeaturePageAccessService.setPromotionPageData(true);
//       if (this.from === routeConstants.BRAND.CREATE_DRIP_CAMPAIGN) this._newFeaturePageAccessService.setDripCampaignPageData(true);
//     }
//
//     if (this.audioSubs) {
//       clearInterval(this.audioSubs);
//     }
//     console.log('from pro tips close');
//
//   }
//
//   dontShowModalApiCall = (from) => {
//     this._newFeaturePageAccessService.setPageAccessDataForUser(this.userId, from);
//   };
//
//   toggleDontShowCheckbox = (event) => {
//     this.dontShowAgainCheck = event.target.checked;
//   };
//
//   audioSubs;
//   playAudio(audio) {
//     if (this.from === routeConstants.BRAND.CREATE_DRIP_CAMPAIGN || this.from === routeConstants.BRAND.PROMOTIONS) {
//       this.audioOrTutorialBtnClick();
//       return;
//     }
//     if (!audio.currentTime || audio.paused) {
//       audio.play();
//       this.audioPlayBtnText = "Pause Audio";
//       this.audioPlayBtnIconLeft = "fa-pause";
//     } else {
//       audio.pause();
//       this.audioPlayBtnText = constants.MORE_INFO_SARAH;
//       this.audioPlayBtnIconLeft = "fa-play";
//     }
//
//     this.audioSubs = setInterval(() => {
//       if (audio.ended) {
//         this.audioPlayBtnText = constants.MORE_INFO_SARAH;
//         this.audioPlayBtnIconLeft = "fa-play";
//       }
//     }, 1000);
//   }
// }

import { Component, Input, OnDestroy, inject, signal, effect } from '@angular/core';
import { NewFeaturePageAccessService } from 'src/app/services/new-feature-page-access.service';
import { constants } from 'src/app/helpers/constants';
import { routeConstants } from 'src/app/helpers/routeConstants';
import { AuthService } from 'src/app/services/auth.service';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { CardWithIconAndContentComponent } from '../card-with-icon-and-content/card-with-icon-and-content.component';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'kexy-pro-tips-modal-content',
  standalone: true,
  imports: [
    KexyButtonComponent,
    CardWithIconAndContentComponent,
    NgFor,
    NgIf
  ],
  templateUrl: './kexy-pro-tips-modal-content.component.html',
  styleUrl: './kexy-pro-tips-modal-content.component.scss'
})
export class KexyProTipsModalContentComponent implements OnDestroy {
  private _newFeaturePageAccessService = inject(NewFeaturePageAccessService);
  private _authService = inject(AuthService);

  // Inputs remain the same as they're part of the component API
  @Input() closeModal!: () => void;
  @Input() features!: any[];
  @Input() titlePart1!: string;
  @Input() titlePart2?: string;
  @Input() bookCallBtnShow?: boolean;
  @Input() proTip?: string;
  @Input() from?: string;
  @Input() aurdioUrl?: string;
  @Input() audioPlayBtnText = constants.MORE_INFO_SARAH;
  @Input() audioPlayBtnIconLeft = "fa-play";
  @Input() audioOrTutorialBtnClick?: () => void;

  // Converted local state to Signals
  dontShowAgainCheck = signal(false);
  userId = signal<string | undefined>(undefined);
  proTipBusinessOperation = signal(false);
  proTipMenuPerformance = signal(false);
  proTipReports = signal(false);
  proTipInventoryOrders = signal(false);
  proTipDripCampaign = signal(false);
  proTipPromotion = signal(false);
  audioSubs?: any;

  // Audio button state signals
  audioPlayBtnTextSig = signal(this.audioPlayBtnText);
  audioPlayBtnIconLeftSig = signal(this.audioPlayBtnIconLeft);

  constructor() {
    const userToken = this._authService.userTokenValue;
    this.userId.set(userToken.id);

    // Using effect to react to input changes
    effect(() => {
      if (this.from === routeConstants.BRAND.CREATE_DRIP_CAMPAIGN) {
        this.proTipDripCampaign.set(true);
      } else if (this.from === routeConstants.BRAND.PROMOTIONS) {
        this.proTipPromotion.set(true);
      }
    });

    // Sync input values with signals
    effect(() => {
      this.audioPlayBtnTextSig.set(this.audioPlayBtnText);
      this.audioPlayBtnIconLeftSig.set(this.audioPlayBtnIconLeft);
    });
  }

  ngOnDestroy() {
    this.close();
  }

  close() {
    this.closeModal();
    if (this.dontShowAgainCheck()) {
      this.dontShowModalApiCall(this.from!);
    } else {
      if (this.from === routeConstants.BRAND.PROMOTIONS) {
        this._newFeaturePageAccessService.setPromotionPageData(true);
      }
      if (this.from === routeConstants.BRAND.CREATE_DRIP_CAMPAIGN) {
        this._newFeaturePageAccessService.setDripCampaignPageData(true);
      }
    }

    if (this.audioSubs) {
      clearInterval(this.audioSubs);
    }
    console.log('from pro tips close');
  }

  dontShowModalApiCall(from: string) {
    this._newFeaturePageAccessService.setPageAccessDataForUser(from);
  }

  toggleDontShowCheckbox(event: Event) {
    this.dontShowAgainCheck.set((event.target as HTMLInputElement).checked);
  }

  playAudio(audio: HTMLAudioElement) {
    if (this.from === routeConstants.BRAND.CREATE_DRIP_CAMPAIGN ||
      this.from === routeConstants.BRAND.PROMOTIONS) {
      this.audioOrTutorialBtnClick?.();
      return;
    }

    if (!audio.currentTime || audio.paused) {
      audio.play();
      this.audioPlayBtnTextSig.set("Pause Audio");
      this.audioPlayBtnIconLeftSig.set("fa-pause");
    } else {
      audio.pause();
      this.audioPlayBtnTextSig.set(constants.MORE_INFO_SARAH);
      this.audioPlayBtnIconLeftSig.set("fa-play");
    }

    this.audioSubs = setInterval(() => {
      if (audio.ended) {
        this.audioPlayBtnTextSig.set(constants.MORE_INFO_SARAH);
        this.audioPlayBtnIconLeftSig.set("fa-play");
      }
    }, 1000);
  }
}
