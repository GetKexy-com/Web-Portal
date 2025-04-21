import { Component, Input, OnInit } from "@angular/core";
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-label-and-value',
  imports: [CommonModule],
  templateUrl: './label-and-value.component.html',
  styleUrl: './label-and-value.component.scss'
})
export class LabelAndValueComponent {
  @Input() label;
  @Input() value;
  @Input() icon;
  @Input() borderRight;

  constructor() {}

  ngOnInit() {}
}
