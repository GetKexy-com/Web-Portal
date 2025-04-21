import { Component, OnInit, Input } from "@angular/core";

@Component({
  selector: 'learning-score-card',
  imports: [],
  templateUrl: './learning-score-card.component.html',
  styleUrl: './learning-score-card.component.scss'
})
export class LearningScoreCardComponent {
  @Input() cardTitle;

  constructor() {}

  ngOnInit() {}
}
