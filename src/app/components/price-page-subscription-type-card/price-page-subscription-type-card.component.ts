import { Component, Input, OnInit } from "@angular/core";
import { constants } from "../../helpers/constants";
import {CurrencyPipe} from '@angular/common';
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';

@Component({
  selector: 'price-page-subscription-type-card',
  imports: [
    CurrencyPipe,
    KexyButtonComponent
  ],
  templateUrl: './price-page-subscription-type-card.component.html',
  styleUrl: './price-page-subscription-type-card.component.scss'
})
export class PricePageSubscriptionTypeCardComponent {
  @Input() subscriptionDetails;
  @Input() changePlanBtnClick;
  @Input() toggleSubscriptionSelectedBox;
  @Input() isCurrentPlan;

  subscriptionCardClicked = () => {
    this.toggleSubscriptionSelectedBox(this.subscriptionDetails);
  };

  handleChangePlanBtnClick = () => {
    this.subscriptionCardClicked();
    this.changePlanBtnClick(this.subscriptionDetails);
  };

  hasPriceDifference = () => {
    if (this.subscriptionDetails.original_price) {
      return parseInt(this.subscriptionDetails.original_price) - parseInt(this.subscriptionDetails.price) > 1;
    }
    return false;
  };

  protected readonly constants = constants;

  contactUsTap() {
    window.open(constants.KEXY_CALENDLY_URL);
  }

  protected readonly parseInt = parseInt;
}
