import { Component, OnInit, ViewChild, Input } from "@angular/core";
// import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'modal',
  imports: [],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input() modalClose;
  @Input() title;
  @Input() bigModal;

  constructor(
    // public activeModal: NgbActiveModal
  ) {}

  ngOnInit() {}

  close() {
    // this.activeModal.close();
    this.modalClose();
  }
}
