// import { Component, inject, Input } from "@angular/core";
// import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
// import { NewFeaturePageAccessService } from "../../services/new-feature-page-access.service";
// import { AuthService } from "../../services/auth.service";
// import { constants } from "../../helpers/constants";
// import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
//
// @Component({
//   selector: 'app-kexy-tutorial-modal-content',
//   imports: [
//     KexyButtonComponent
//   ],
//   templateUrl: './kexy-tutorial-modal-content.component.html',
//   styleUrl: './kexy-tutorial-modal-content.component.scss'
// })
// export class KexyTutorialModalContentComponent {
//   tutorialOptionList = [
//     {
//       title: "Getting Started w/KEXY",
//       proTips: "Get started with KEXY's user-friendly interface in just 10 minutes! Follow our simple steps, and you'll be launching campaigns in a flash.",
//       videoUrl: "https://www.getkexy.com/blog/getting-started-with-kexy-tutorial",
//       proTipsBtnText: "Go to Article",
//       proTipsBtnIcon: "fa-file-text-o",
//     },
//     {
//       title: "Entering Descriptions",
//       proTips: "Want to get the best out of our AI model?  Just remember, the devil's in the details!  The more details we have about your company and products the better our AI model responds!",
//       videoUrl: "https://app.sharefable.com/live/demo/company-description-mpi0yoom7216rb9t",
//     },
//     {
//       title: "Adding Products/Services",
//       proTips: "Want to get the best out of our AI model?  Just remember, the devil's in the details!  The more details we have about your products or services the better our AI model responds!",
//       videoUrl: "https://app.sharefable.com/live/demo/adding-productsservice-ws14vohg4gel06hc",
//     },
//     {
//       title: `Creating ${constants.LANDING_PAGE}s`,
//       proTips: `Your ${constants.LANDING_PAGE} has a higher chance of being viewed by potential customers when you include a photo, video, and sales sheet.`,
//       videoUrl: "https://app.sharefable.com/live/demo/creating-promotions-up-8q301llh0z8teamw",
//     },
//     {
//       title: "Creating Lead Lists",
//       proTips: `We strongly recommend creating two distinct lists to enhance your lead management.<br/><br/>
//                 1. Invalid Leads.<br/>
//                 2. Master Leads.<br/><br/>
//                 <b>IMPORTANT: </b> Adding leads to a list linked to an active drip campaign will automatically include them in that campaign.
//       `,
//       videoUrl: "https://app.sharefable.com/live/demo/create-lead-list-qe8h5bbry4opzfny",
//     },
//     {
//       title: "Finding Leads",
//       proTips: "<b>Time Saver!</b> When selecting leads in bulk, choose all prospects in the page, even if some have been saved before. We do not charge extra credits for leads we've already captured for you.",
//       videoUrl: "https://app.sharefable.com/live/demo/find-leads-zm0vyy7me3x62738",
//     },
//     {
//       title: "Creating Drip Campaigns",
//       proTips: "The fewer words used in email campaigns, the higher the open rate. Use the shortener toggle button to keep your message between 50 and 75 words.",
//       videoUrl: "https://app.sharefable.com/live/demo/creating-campaign-upda-4xh2gphoq6jxad43",
//     },
//     {
//       title: "Launching Drip Campaigns",
//       proTips: "Adding leads to a list tied to an active drip campaign will automatically enroll them in campaign. To prevent a contact from joining, simple avoid adding them to that specific list.",
//       videoUrl: "https://app.sharefable.com/live/demo/launch-campaign-revise-dwybfndu8b8gzhdl",
//     },
//     {
//       title: "Slack Integration",
//       proTips: "When a cold lead becomes warm, it means they've clicked a link related to your campaign. You'll receive notifications of 'warm' leads via email. <br/> <br/> <b>IMPORTANT: </b> To receive real-time notifications, connect to our slack integration!",
//       videoUrl: "https://app.sharefable.com/live/demo/slack-integration-09rc6nb5to86219z",
//     },
//     {
//       title: "Support",
//       proTips: "Got a brilliant feature idea? Spotted a pesky glitch? Or just need to drop us a line? Here's how you make your voice heard. It's simple and straightforward.",
//       videoUrl: "https://app.sharefable.com/live/demo/support-wfsuc8zukmp5koc2",
//     },
//   ];
//   selectedOption = this.tutorialOptionList[0];
//   activeModal = inject(NgbActiveModal);
//   dontShowAgainCheck = false;
//   userId;
//   from = "";
//
//   constructor(private _newFeaturePageAccessService: NewFeaturePageAccessService, private _authService: AuthService) {
//   }
//
//   ngOnInit() {
//     let userToken = this._authService.userTokenValue;
//     this.userId = userToken.id;
//   }
//
//   ngOnDestroy() {
//     this.close();
//   }
//
//   close() {
//     if (this.dontShowAgainCheck) {
//       this.dontShowModalApiCall(this.from);
//     } else {
//       this._newFeaturePageAccessService.setBusinessOperationPageData(true);
//     }
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
//   changeSelectedOption = (value) => {
//     this.selectedOption = value;
//   };
//
//   openVideoUrl = (videoUrl: string) => {
//     window.open(videoUrl, "_blank");
//   };
// }


import {Component, inject, Input, signal, OnInit, OnDestroy} from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NewFeaturePageAccessService } from '../../services/new-feature-page-access.service';
import { AuthService } from '../../services/auth.service';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { CommonModule } from '@angular/common';
import { constants } from "src/app/helpers/constants";
import {routeConstants} from '../../helpers/routeConstants';

@Component({
  selector: 'app-kexy-tutorial-modal-content',
  standalone: true,
  imports: [
    CommonModule,
    KexyButtonComponent
  ],
  templateUrl: './kexy-tutorial-modal-content.component.html',
  styleUrl: './kexy-tutorial-modal-content.component.scss'
})
export class KexyTutorialModalContentComponent implements OnInit, OnDestroy {
  // Tutorial options as a constant array
  readonly tutorialOptionList = [
    {
      title: "Getting Started w/KEXY",
      proTips: "Get started with KEXY's user-friendly interface in just 10 minutes! Follow our simple steps, and you'll be launching campaigns in a flash.",
      videoUrl: "https://www.getkexy.com/blog/getting-started-with-kexy-tutorial",
      // videoUrl: "https://app.sharefable.com/live/demo/kexy-demo-5fk84q24zaw9d3mg",
      proTipsBtnText: "Go to Article",
      proTipsBtnIcon: "fa-file-text-o",
    },
    {
      title: "Entering Descriptions",
      proTips: "Want to get the best out of our AI model?  Just remember, the devil's in the details!  The more details we have about your company and products the better our AI model responds!",
      videoUrl: "https://app.sharefable.com/live/demo/company-description-mpi0yoom7216rb9t",
    },
    {
      title: "Adding Products/Services",
      proTips: "Want to get the best out of our AI model?  Just remember, the devil's in the details!  The more details we have about your products or services the better our AI model responds!",
      videoUrl: "https://app.sharefable.com/live/demo/adding-productsservice-ws14vohg4gel06hc",
    },
    {
      title: `Creating ${constants.LANDING_PAGE}s`,
      proTips: `Your ${constants.LANDING_PAGE} has a higher chance of being viewed by potential customers when you include a photo, video, and sales sheet.`,
      videoUrl: "https://app.sharefable.com/live/demo/creating-promotions-up-8q301llh0z8teamw",
    },
    {
      title: "Creating Lead Lists",
      proTips: `We strongly recommend creating two distinct lists to enhance your lead management.<br/><br/>
                1. Invalid Leads.<br/>
                2. Master Leads.<br/><br/>
                <b>IMPORTANT: </b> Adding leads to a list linked to an active drip campaign will automatically include them in that campaign.
      `,
      videoUrl: "https://app.sharefable.com/live/demo/create-lead-list-qe8h5bbry4opzfny",
    },
    {
      title: "Finding Leads",
      proTips: "<b>Time Saver!</b> When selecting leads in bulk, choose all prospects in the page, even if some have been saved before. We do not charge extra credits for leads we've already captured for you.",
      videoUrl: "https://app.sharefable.com/live/demo/find-leads-zm0vyy7me3x62738",
    },
    {
      title: "Creating Drip Campaigns",
      proTips: "The fewer words used in email campaigns, the higher the open rate. Use the shortener toggle button to keep your message between 50 and 75 words.",
      videoUrl: "https://app.sharefable.com/live/demo/creating-campaign-upda-4xh2gphoq6jxad43",
    },
    {
      title: "Launching Drip Campaigns",
      proTips: "Adding leads to a list tied to an active drip campaign will automatically enroll them in campaign. To prevent a contact from joining, simple avoid adding them to that specific list.",
      videoUrl: "https://app.sharefable.com/live/demo/launch-campaign-revise-dwybfndu8b8gzhdl",
    },
    {
      title: "Slack Integration",
      proTips: "When a cold lead becomes warm, it means they've clicked a link related to your campaign. You'll receive notifications of 'warm' leads via email. <br/> <br/> <b>IMPORTANT: </b> To receive real-time notifications, connect to our slack integration!",
      videoUrl: "https://app.sharefable.com/live/demo/slack-integration-09rc6nb5to86219z",
    },
    {
      title: "Support",
      proTips: "Got a brilliant feature idea? Spotted a pesky glitch? Or just need to drop us a line? Here's how you make your voice heard. It's simple and straightforward.",
      videoUrl: "https://app.sharefable.com/live/demo/support-wfsuc8zukmp5koc2",
    },
  ];

  // Reactive state with signals
  selectedOption = signal(this.tutorialOptionList[0]);
  dontShowAgainCheck = signal(false);
  userId = signal<string | null>(null);
  from = signal(routeConstants.BRAND.CREATE_DRIP_CAMPAIGN);

  // Services
  activeModal = inject(NgbActiveModal);
  private _newFeaturePageAccessService = inject(NewFeaturePageAccessService);
  private _authService = inject(AuthService);

  ngOnInit() {
    const userToken = this._authService.userTokenValue;
    this.userId.set(userToken?.id ?? null);
  }

  ngOnDestroy() {
    this.close();
  }

  close() {
    if (this.dontShowAgainCheck()) {
      this.dontShowModalApiCall(this.from());
    } else {
      this._newFeaturePageAccessService.setBusinessOperationPageData(true);
    }
  }

  dontShowModalApiCall(from: string) {
    const userId = this.userId();
    if (userId) {
      this._newFeaturePageAccessService.setPageAccessDataForUser(userId, from);
    }
  }

  toggleDontShowCheckbox(event: Event) {
    this.dontShowAgainCheck.set((event.target as HTMLInputElement).checked);
  }

  changeSelectedOption(value: typeof this.tutorialOptionList[0]) {
    this.selectedOption.set(value);
  }

  openVideoUrl(videoUrl: string) {
    window.open(videoUrl, "_blank");
  }
}
