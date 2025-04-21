import { Component, OnInit, Input } from "@angular/core";
import {FormsModule} from '@angular/forms';
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {LearningScoreCardComponent} from '../learning-score-card/learning-score-card.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'prospecting-common-card',
  imports: [
    FormsModule,
    KexyButtonComponent,
    LearningScoreCardComponent,
    CommonModule
  ],
  templateUrl: './prospecting-common-card.component.html',
  styleUrl: './prospecting-common-card.component.scss'
})
export class ProspectingCommonCardComponent {
  @Input() cardTitle;
  @Input() cardTitleLogo;
  @Input() cardDetails;
  @Input() textAreaLabel;
  @Input() bottomBtnLabel;
  @Input() showLearningScoreCard;
  @Input() listInfo;
  @Input() handleBottomBtnClick;
  @Input() rowIndex;
  @Input() description: string = "";
  @Input() textAreaMargin = "20px 0 0 0";
  @Input() cardBoxShadow = "0px 2px 5px rgba(167, 172, 176, 0.21)";
  @Input() cardPadding = "16px";
  @Input() textAreaLabelFontSize = "13px";

  constructor() {}

  ngOnInit() {}

  bottomBtnClicked = () => {
    if (this.rowIndex >= 0) {
      this.handleBottomBtnClick(this.rowIndex);
    } else {
      this.handleBottomBtnClick(this.description);
    }
  };
}
