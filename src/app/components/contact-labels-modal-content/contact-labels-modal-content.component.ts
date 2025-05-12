import { Component, inject, OnInit } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingService } from "../../services/prospecting.service";
import {CommonModule} from '@angular/common';

@Component({
  selector: 'contact-lists-modal-content',
  imports: [CommonModule],
  templateUrl: './contact-labels-modal-content.component.html',
  styleUrl: './contact-labels-modal-content.component.scss'
})
export class ContactLabelsModalContentComponent {
  activeModal = inject(NgbActiveModal);
  labels;

  constructor(private prospectingService: ProspectingService) {
  }

  ngOnInit() {
    console.log(this.prospectingService.selectedContactLabels);
    this.labels = this.prospectingService.selectedContactLabels;
  }
}
