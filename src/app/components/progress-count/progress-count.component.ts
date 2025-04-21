import { Component, OnInit, Input } from "@angular/core";
import {CommonModule, Location} from "@angular/common";

@Component({
  selector: 'progress-count',
  imports: [CommonModule],
  templateUrl: './progress-count.component.html',
  styleUrl: './progress-count.component.scss'
})
export class ProgressCountComponent {
  @Input() currentStep;
  @Input() steps;
  constructor(private location: Location) {}

  ngOnInit() {}
}
