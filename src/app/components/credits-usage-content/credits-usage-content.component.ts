import { Component, Input, OnInit } from "@angular/core";
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {NgbProgressbar} from '@ng-bootstrap/ng-bootstrap';
import {CommonModule, NgClass} from '@angular/common';

@Component({
  selector: 'credits-usage-content',
  imports: [
    KexyButtonComponent,
    NgbProgressbar,
    NgClass,
    CommonModule,
  ],
  templateUrl: './credits-usage-content.component.html',
  styleUrl: './credits-usage-content.component.scss'
})
export class CreditsUsageContentComponent {
  @Input() creditUsageContent;
  @Input() handleBuyMoreCredit;

  buyMoreBtnClick = () => {
    this.handleBuyMoreCredit();
  };

  ngOnInit(): void {
  }
}
