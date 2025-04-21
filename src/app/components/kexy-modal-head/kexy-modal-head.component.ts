import { Component, OnInit, Input } from "@angular/core";
import { Location } from "@angular/common";

@Component({
  selector: 'kexy-modal-head',
  imports: [],
  templateUrl: './kexy-modal-head.component.html',
  styleUrl: './kexy-modal-head.component.scss'
})
export class KexyModalHeadComponent {
  @Input() title;
  @Input() closeModal;

  constructor(private location: Location) {}

  ngOnInit() {}

  async close() {
    this.closeModal();
  }
}
