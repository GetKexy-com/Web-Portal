import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import {NgbModal, NgbTooltip} from "@ng-bootstrap/ng-bootstrap";
import { AuthService } from "../../services/auth.service";
import { constants } from "../../helpers/constants";
import Swal from "sweetalert2";
import {
  PurchaseAdditioanlCreditModalContentComponent
} from "../purchase-additioanl-credit-modal-content/purchase-additioanl-credit-modal-content.component";
import { routeConstants } from "../../helpers/routeConstants";
import { Router } from "@angular/router";
import {CommonModule, DatePipe} from '@angular/common';
import {CreditsUsageContentComponent} from '../credits-usage-content/credits-usage-content.component';
import {
  CreditsPageSubscriptionCardComponent
} from '../credits-page-subscription-card/credits-page-subscription-card.component';

@Component({
  selector: 'brand-credits-usage-card',
  imports: [
    DatePipe,
    CreditsUsageContentComponent,
    CreditsPageSubscriptionCardComponent,
    CommonModule,
    NgbTooltip,
  ],
  templateUrl: './brand-credits-usage-card.component.html',
  styleUrl: './brand-credits-usage-card.component.scss'
})
export class BrandCreditsUsageCardComponent implements OnInit {
  monthlyCreditUsage = constants.MONTHLY_CREDIT_INFO;
  additionalCreditUsage = constants.ADDITIONAL_CREDIT_INFO;
  isLoading: boolean = false;
  couponCode: string = "";
  subscription;
  userData;

  constructor(
    private modal: NgbModal,
    private authService: AuthService,
    private router: Router,
  ) {
  }

  ngOnInit(): void {
    this.userOrganisationApiCall().then(() => {
      // Check if suer had just purchased additional credits.
      const boughtAdditionalCredits = localStorage.getItem(constants.ADDITIONAL_CREDIT_PURCHASE);
      const lastAdditionalCredits = localStorage.getItem(constants.CURRENT_ADDITIONAL_CREDIT);
      if (boughtAdditionalCredits === "true" && this.additionalCreditUsage.total_credits > parseInt(lastAdditionalCredits)) {
        Swal.fire("Congrats!", "Additional credits have been added to your account!", "success").then(() => {
          localStorage.removeItem(constants.ADDITIONAL_CREDIT_PURCHASE);
          localStorage.removeItem(constants.CURRENT_ADDITIONAL_CREDIT);
        });
      }
      this.isLoading = false;
    });
    this.userData = this.authService.userTokenValue;

  }

  userOrganisationApiCall = async () => {
    this.isLoading = true;
    this.subscription = await this.authService.getSubscriptionData(true);
    if (!this.subscription) {
      await this.router.navigate([routeConstants.BRAND.SUBSCRIPTION_SELECTION]);
      return;
    }
    this.monthlyCreditUsage = { ...this.monthlyCreditUsage, ...this.subscription.subscription_credits[0] };
    this.additionalCreditUsage = { ...this.additionalCreditUsage, ...this.subscription.subscription_additional_credits };
  };


  handleBuyMoreCredit = () => {
    this.modal.open(PurchaseAdditioanlCreditModalContentComponent, { size: "lg" });
  };
}
