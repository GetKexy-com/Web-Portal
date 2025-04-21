// import { Component, Input, Output, OnInit } from "@angular/core";
// import { constants } from "src/app/helpers/constants";
// import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
//
// @Component({
//   selector: 'brand-subscription-card',
//   imports: [
//     KexyButtonComponent
//   ],
//   templateUrl: './brand-subscription-card.component.html',
//   styleUrl: './brand-subscription-card.component.scss'
// })
// export class BrandSubscriptionCardComponent {
//   @Input() title;
//   @Input() priceText;
//   @Input() icon;
//   @Input() chooseBtnClick;
//   @Input() blueBorder;
//   @Input() isLoading;
//   @Input() disableChooseBtn;
//
//   @Input() isFreeAccount;
//   @Input() userData;
//   @Input() bypasStripe;
//   @Input() changePaymentMethod;
//   @Input() initial;
//   @Input() subscriptionType;
//
//   selectedSubscriptionRecurringType: string = constants.MONTH;
//   couponCode: string = "";
//   tabItem1: string = constants.MONTH;
//   tabItem2: string = constants.YEAR;
//
//   selectedChooseBtn: string = "";
//   subscriptionSeatNumber: number = 1;
//
//   submitBtnText;
//
//   constructor() {}
//
//   ngOnInit() {
//     console.log("isadmin", this.userData, this.priceText);
//
//     let coupun = localStorage.getItem(constants.COUPON_CODE);
//     if (coupun) {
//       this.couponCode = coupun;
//     }
//     if (this.initial) {
//       this.submitBtnText = "Choose";
//     }
//     this.submitBtnText = "Choose";
//   }
//
//   handleChooseBtnClick(title) {
//     this.selectedChooseBtn = title;
//     this.chooseBtnClick();
//   }
// }


import { Component, Input, OnInit, signal } from '@angular/core';
import { constants } from '../../helpers/constants';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'brand-subscription-card',
  standalone: true,
  imports: [
    CommonModule,
    KexyButtonComponent
  ],
  templateUrl: './brand-subscription-card.component.html',
  styleUrl: './brand-subscription-card.component.scss'
})
export class BrandSubscriptionCardComponent implements OnInit {
  // Regular @Input properties for compatibility
  @Input() title: string = '';
  @Input() priceText: string = '';
  @Input() icon: string = '';
  @Input() chooseBtnClick!: () => void;
  @Input() blueBorder: boolean = false;
  @Input() isLoading: boolean = false;
  @Input() disableChooseBtn: boolean = false;
  @Input() isFreeAccount: boolean = false;
  @Input() userData: any;
  @Input() bypasStripe: boolean = false;
  @Input() changePaymentMethod: boolean = false;
  @Input() initial: boolean = false;
  @Input() subscriptionType: string = '';

  // Internal signals for reactive properties
  protected _title = signal(this.title);
  protected _priceText = signal(this.priceText);
  protected _icon = signal(this.icon);
  protected _isLoading = signal(this.isLoading);
  protected _blueBorder = signal(this.blueBorder);
  protected _disableChooseBtn = signal(this.disableChooseBtn);
  protected _subscriptionType = signal(this.subscriptionType);

  // Other internal state
  selectedChooseBtn = signal('');
  submitBtnText = signal('Choose');

  ngOnInit() {
    // Initialize signals with input values
    this._title.set(this.title);
    this._priceText.set(this.priceText);
    this._icon.set(this.icon);
    this._isLoading.set(this.isLoading);
    this._blueBorder.set(this.blueBorder);
    this._disableChooseBtn.set(this.disableChooseBtn);
    this._subscriptionType.set(this.subscriptionType);

    const coupon = localStorage.getItem(constants.COUPON_CODE);
    if (this.initial) {
      this.submitBtnText.set('Choose');
    }
  }

  handleChooseBtnClick(title: string) {
    this.selectedChooseBtn.set(title);
    if (this.chooseBtnClick) {
      this.chooseBtnClick();
    }
  }
}
