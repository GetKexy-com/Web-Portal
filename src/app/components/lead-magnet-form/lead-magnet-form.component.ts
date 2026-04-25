import { Component, OnDestroy, OnInit } from '@angular/core';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { NgForOf, NgIf } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { constants } from '../../helpers/constants';
import { Contact, ContactDetails } from '../../models/Contact';
import { Subscription } from 'rxjs';
import { NgbActiveOffcanvas, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { ProspectingService } from '../../services/prospecting.service';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { PageUiService } from '../../services/page-ui.service';
import Swal from 'sweetalert2';
import { AddOrDeleteContactLabelComponent } from '../add-or-delete-contact-label/add-or-delete-contact-label.component';
import { LeadMagnetService } from '../../services/lead-magnet.service';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';

@Component({
  selector: 'app-lead-magnet-form',
  imports: [
    ErrorMessageCardComponent,
    ReactiveFormsModule,
    KexyButtonComponent,
  ],
  templateUrl: './lead-magnet-form.component.html',
  styleUrl: './lead-magnet-form.component.scss',
})
export class LeadMagnetFormComponent implements OnInit, OnDestroy {
  primaryForm: FormGroup;
  userData;
  supplierId;
  isLoading: boolean = false;
  initialLoading: boolean = true;
  invalidWebsite = false;
  submitted: boolean = false;
  canvasTitle: string = 'Edit';
  labelOptions = [];
  countries = [...constants.COUNTRIES];
  selectedCountry: string = constants.UNITED_STATES;
  selectedState;
  isMultipleContactsSelected: boolean = false;
  statesOptions = [];
  usaStatesWithKeyValuePair = [];
  canadaStatesWithKeyValuePair = [];
  marketingStatusOptions = [...constants.MARKETING_STATUS_OPTIONS];
  selectedMarketingStatus;
  selectedLeadMagnet;
  contact: Contact = Contact.empty();
  labelIds = [];
  labelIdFromListContactPage;
  labelIdWhenEditContactFromListContactPage;
  dripCampaignTitles = [];
  contactDripCampaigns = [];
  contactLabelsSubscription: Subscription;
  dripCampaignTitlesSubscription: Subscription;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private _authService: AuthService,
    private leadMagnetService: LeadMagnetService,
    private pageUiService: PageUiService,
  ) {
  }

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    // Get edit data
    if (this.leadMagnetService.clickedEditLeadMagnet.length) {
      this.selectedLeadMagnet = this.leadMagnetService.clickedEditLeadMagnet[0];
      console.log('selectedLeadMagnet', this.selectedLeadMagnet);
    }

    // Set Canvas Title
    if (this.leadMagnetService.isAddNewButtonClicked) {
      this.canvasTitle = 'Create';
      this.selectedLeadMagnet = {
        leadMagnetUrl: 'www.',
        title: '',
        summary: '',
      };
    } else {
      this.canvasTitle = 'Edit';
    }

    this.setPrimaryForm();
  }

  ngOnDestroy() {
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
    if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
    this.leadMagnetService.isAddNewButtonClicked = false;
    this.leadMagnetService.clickedEditLeadMagnet = [];
  }

  setPrimaryForm = () => {
    this.primaryForm = new FormGroup({
      leadMagnetUrl: new FormControl(this.selectedLeadMagnet.leadMagnetUrl, [Validators.required]),
      title: new FormControl(this.selectedLeadMagnet.title, [Validators.required]),
      summary: new FormControl(this.selectedLeadMagnet.summary, [Validators.required]),
    });
  };

  formValidationErrorCheck = (fieldName: string) => {
    return (
      this.primaryForm.controls[fieldName].invalid &&
      (this.submitted || this.primaryForm.controls[fieldName].dirty)
    );
  };


  handleSubmit = async () => {
    this.submitted = true;
    if (!this.primaryForm.valid) {
      return false;
    }
    this.invalidWebsite = false;
    const formData = this.primaryForm.getRawValue();
    formData.leadMagnetUrl = this.pageUiService.urlValidate(formData.leadMagnetUrl);
    if (!formData.leadMagnetUrl) {
      this.invalidWebsite = true;
      return;
    }
    this.isLoading = true;
    //const formData = this.primaryForm.getRawValue();
    formData['companyId'] = this.supplierId;
    console.log(formData);

    try {

      if (this.leadMagnetService.isAddNewButtonClicked) {
        console.log('A');
        // Create Contact
        await this.leadMagnetService.create(formData);
        this.selectedLeadMagnet = {
          leadMagnetUrl: '',
          title: '',
          summary: '',
        };
      } else {
        console.log('B');
        formData['id'] = this.selectedLeadMagnet.id;
        await this.leadMagnetService.update(formData);
      }

      this.leadMagnetService.selectedLeadMagnet = null;
      this.activeCanvas.dismiss('Cross click');
    } catch (e) {
      console.log(e);
      if (Array.isArray(e)) {
        await Swal.fire('Error', e[0]);
      } else {
        await Swal.fire('Error', e);
      }

    } finally {
      this.isLoading = false;
    }
  };

}
