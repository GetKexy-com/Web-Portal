import { Component, Input } from "@angular/core";

@Component({
  selector: 'app-download-modal-content',
  imports: [],
  templateUrl: './download-modal-content.component.html',
  styleUrl: './download-modal-content.component.scss'
})
export class DownloadModalContentComponent {
  @Input() closeModal;

  constructor() {}

  close() {
    this.closeModal();
  }
}
