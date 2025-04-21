import { Component, Input, OnInit } from "@angular/core";
import {CommonModule} from '@angular/common';

@Component({
  selector: 'kexy-tab',
  imports: [CommonModule],
  templateUrl: './kexy-tab.component.html',
  styleUrl: './kexy-tab.component.scss'
})
export class KexyTabComponent {
  @Input() tabItemList;
  @Input() tabBgColor;
  @Input() tabItemColor;
  @Input() tabItemActiveColor;
  @Input() setSelectedRestaurantSearchType;
  @Input() handleSetSelectedTab;
  @Input() selectedTab;

  constructor() {}

  ngOnInit() {

  }

  setSelectedTab = (value) => {
    if (this.setSelectedRestaurantSearchType) {
      this.setSelectedRestaurantSearchType(value);
    } else {
      this.handleSetSelectedTab(value);
    }
  };
}
