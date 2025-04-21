import { Component, inject, OnInit } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingService } from "../../services/prospecting.service";
import {BrandConvoAvatarComponent} from '../brand-convo-avatar/brand-convo-avatar.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'contact-details-modal-content',
  imports: [
    BrandConvoAvatarComponent,
    CommonModule,
  ],
  templateUrl: './contact-details-modal-content.component.html',
  styleUrl: './contact-details-modal-content.component.scss'
})
export class ContactDetailsModalContentComponent {
  activeModal = inject(NgbActiveModal);
  contact;
  contactDetails;

  constructor(private prospectingService: ProspectingService) {
  }

  ngOnInit() {
    this.contact = this.prospectingService.selectedContactForShowDetails;
    this.contactDetails = JSON.parse(this.contact.details);
    console.log('contact', this.contact);
    console.log('details', this.contactDetails);
  }

  getNameInitials = () => {
    return this.prospectingService.getSalesLeadNameInitials(this.contactDetails);
  };
}
