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
    this.contactDetails = this.__toProfile(this.contact?.details);
  }

  /**
   * The row is a drip prospect, and its `details` comes in several shapes: the profile
   * itself (legacy prospects), the whole Contact — `JSON.stringify(contact)` — with the
   * profile nested in its own `details` (string or object, or missing), or empty. Reading
   * `organization.name` off a Contact threw on every change detection, which froze the
   * page behind the half-open modal. Always returns an object with an `organization`.
   */
  private __toProfile = (raw) => {
    let details = this.__parse(raw);
    if (!details.organization && ('details' in details || 'contactName' in details)) {
      const contact = details;
      const profile = this.__parse(contact.details);
      details = {
        ...profile,
        name: profile.name || contact.contactName,
        title: profile.title || contact.jobTitle,
        city: profile.city || contact.city,
        state: profile.state || contact.state,
        country: profile.country || contact.country,
        email_status: profile.email_status || contact.emailStatus,
        organization: profile.organization || { name: contact.companyName },
      };
    }
    return { ...details, organization: details.organization || {} };
  };

  private __parse = (value) => {
    if (!value) return {};
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) || {};
    } catch {
      return {};
    }
  };

  getNameInitials = () => {
    const initials = this.prospectingService.getSalesLeadNameInitials(this.contactDetails);
    if (initials) return initials;
    // A Contact-shaped prospect may have only a full name.
    const [first = '', last = ''] = (this.contactDetails?.name || '').trim().split(/\s+/);
    return (first[0] || '') + (last[0] || '');
  };
}
