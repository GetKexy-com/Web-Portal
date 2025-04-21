import { Component, Input } from '@angular/core';
import {NgbTooltip} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-kexy-button',
  imports: [
    NgbTooltip
  ],
  templateUrl: './kexy-button.component.html',
  styleUrl: './kexy-button.component.scss'
})
export class KexyButtonComponent {
  @Input() label;
  @Input() iconLeft;
  @Input() iconRight;
  @Input() type = "button";
  @Input() title = "";
  @Input() fontSize = "14px";
  @Input() bgColor = "#12a5f4";
  @Input() textColor = "white";
  @Input() align = "center";
  @Input() flexAlignItems = "center";
  @Input() radius = "8px";
  @Input() borderColor = "transparent";
  @Input() disabled = false;
  @Input() iconSize = "medium";
  @Input() tooltip = "";

  iconLarge = "large";
  iconSmall = "small";

  constructor() {}

  ngOnInit() {}
}
