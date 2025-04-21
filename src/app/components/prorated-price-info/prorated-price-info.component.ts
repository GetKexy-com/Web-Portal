import {Component, Input} from "@angular/core";
import { constants } from "../../helpers/constants";
import {CurrencyPipe} from '@angular/common';
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';

@Component({
  selector: 'prorated-price-info',
  imports: [
    CurrencyPipe,
    KexyButtonComponent
  ],
  templateUrl: './prorated-price-info.component.html',
  styleUrl: './prorated-price-info.component.scss'
})
export class ProratedPriceInfoComponent {
  @Input() isLoading = false;
  @Input() subscriptionData;
  @Input() subscriptionRecuring;
  @Input() usersCount;
  @Input() prorationPrice;
  @Input() switchSubscriptionForBrandsApi;
  @Input() couponInputChange;
  isShowCouponInput: boolean = false;

  ngOnInit() {
    console.log('subscirip', this.subscriptionData);
  }

  purchaseTaped = () => {
    this.switchSubscriptionForBrandsApi();
  };

  nextButtonDisable = () => {
    return this.isLoading || this.subscriptionData.title === constants.ENTERPRISE || this.subscriptionData.title === constants.LIFETIME;
  };

  applyCouponClicked = () => {
    this.isShowCouponInput = !this.isShowCouponInput;
  }

  handleCouponInputChange = (e) => {
    this.couponInputChange(e.target.value);
  }

  protected readonly constants = constants;
}
