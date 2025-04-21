import { Component, OnInit, Input } from "@angular/core";
import {NgClass} from '@angular/common';

@Component({
  selector: 'kexy-toggle-switch',
  imports: [
    NgClass
  ],
  templateUrl: './kexy-toggle-switch.component.html',
  styleUrl: './kexy-toggle-switch.component.scss'
})
export class KexyToggleSwitchComponent {
  @Input() isSwitchActive;
  @Input() changeSwitchOption;
  @Input() activeText = "On";
  @Input() inactiveText = "Off";

  constructor() {
  }

  ngOnInit() {
  }
}
