import { Component, OnInit, Input } from "@angular/core";
import { Location } from "@angular/common";

@Component({
  selector: 'error-message-card',
  imports: [],
  templateUrl: './error-message-card.component.html',
  styleUrl: './error-message-card.component.scss'
})
export class ErrorMessageCardComponent {
  @Input() message;

  constructor(private location: Location) {}

  ngOnInit() {}
}
