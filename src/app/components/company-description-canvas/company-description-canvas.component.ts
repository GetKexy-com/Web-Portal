import { Component, OnDestroy, OnInit } from '@angular/core';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { KexyRichEditorComponent } from '../kexy-rich-editor/kexy-rich-editor.component';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule, NgIf } from '@angular/common';
import { NgbActiveOffcanvas, NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { SseService } from '../../services/sse.service';
import Swal from 'sweetalert2';
import { constants } from '../../helpers/constants';
import { Contact, ContactDetails } from '../../models/Contact';
import { Subscription } from 'rxjs';
import { ProspectingService } from '../../services/prospecting.service';
import { PageUiService } from '../../services/page-ui.service';
import { AddOrDeleteContactLabelComponent } from '../add-or-delete-contact-label/add-or-delete-contact-label.component';

@Component({
  selector: 'app-company-description-canvas',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ErrorMessageCardComponent,
    KexyButtonComponent,
  ],
  templateUrl: './company-description-canvas.component.html',
  styleUrl: './company-description-canvas.component.scss',
})
export class CompanyDescriptionCanvasComponent implements OnInit, OnDestroy {
  primaryForm: FormGroup;
  supplierId;
  isLoading: boolean = false;
  initialLoading: boolean = true;
  submitted: boolean = false;
  canvasTitle: string = 'Add';

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private _authService: AuthService,
    private prospectingService: ProspectingService,
  ) {
  }

  ngOnInit(): void {
    this.supplierId = this._authService.userTokenValue.supplier_id;


    // Set Canvas Title
    if (this.prospectingService.selectedCompanyDescription) {
      this.canvasTitle = 'Edit';
    }


    this.setPrimaryForm();
  }

  ngOnDestroy() {
    this.prospectingService.selectedCompanyDescription = null;
  }


  setPrimaryForm = () => {
    this.primaryForm = new FormGroup({
      companyName: new FormControl(
        this.prospectingService.selectedCompanyDescription.name || '',
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
        ]),
      ),
      description: new FormControl(
        this.prospectingService.selectedCompanyDescription.description || '',
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
        ]),
      ),
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
    this.isLoading = true;
    const formData = this.primaryForm.getRawValue();

    try {
      await this.__createOrUpdateDescription(formData);
      this.activeCanvas.dismiss('Cross click');
    } catch (e) {
      await Swal.fire('Error', e.message);
    } finally {
      this.isLoading = false;
    }
  };

  async __createOrUpdateDescription(product: any) {
    if (this.prospectingService.selectedCompanyDescription.id) {
      await this.updateDescription({ ...product, id: this.prospectingService.selectedCompanyDescription.id });
      return;
    }

    const newDesc = {
      ...product,
      companyId: this.supplierId,
    };

    console.log(newDesc);
    if (newDesc.description === '') {
      await Swal.fire('Error!', 'Description is missing.', 'warning');
      return;
    }
    try {
      await this.prospectingService.createDescription(newDesc);
    } catch (e) {
      console.error('Error creating product:', e);
    }
  }

  async updateDescription(product: any) {
    const p = {
      ...product,
      id: product.id,
    };

    delete p.status;
    delete p.createdAt;
    delete p.user;
    //delete p.name;
    console.log(p);
    try {
      await this.prospectingService.updateDescription(p);
    } catch (e) {
      console.error('Error updating product:', e);
    }
  }


}
