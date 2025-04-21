import { Component, OnInit, Input } from "@angular/core";
import {CommonModule, Location} from "@angular/common";

@Component({
  selector: 'card-with-icon-and-content',
  imports: [CommonModule],
  templateUrl: './card-with-icon-and-content.component.html',
  styleUrl: './card-with-icon-and-content.component.scss'
})
export class CardWithIconAndContentComponent {
  @Input() data;

  constructor(private location: Location) {}

  ngOnInit() {
  }
}
