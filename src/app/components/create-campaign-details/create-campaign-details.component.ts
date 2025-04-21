// import { Component, OnInit } from "@angular/core";
// import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
// import { AuthService } from "src/app/services/auth.service";
// import { CampaignService } from "../../services/campaign.service";
// import { constants } from "../../helpers/constants";
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
//
// @Component({
//   selector: 'create-campaign-details',
//   imports: [
//     ReactiveFormsModule,
//     ErrorMessageCardComponent
//   ],
//   templateUrl: './create-campaign-details.component.html',
//   styleUrl: './create-campaign-details.component.scss'
// })
// export class CreateCampaignDetailsComponent {
//   primaryForm: FormGroup;
//   userData;
//   supplierId;
//   isLoading: boolean = false;
//   submitted: boolean = false;
//   editData;
//   canvasTitle: string = "Create";
//
//   constructor(
//     public activeCanvas: NgbActiveOffcanvas,
//     private _authService: AuthService,
//     private campaignService: CampaignService,
//   ) {
//   }
//
//   ngOnInit(): void {
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//
//     // Get edit data if any
//     this.editData = this.campaignService.getEditCampaignDetailItem();
//     if (this.editData?.inner_detail) {
//       this.campaignService.setEditCampaignDetailItem("");
//       this.canvasTitle = "Edit";
//     }
//
//     this.setPrimaryForm();
//   }
//
//   setPrimaryForm = () => {
//     this.primaryForm = new FormGroup({
//       campaign_details: new FormControl(
//         this.editData?.inner_detail ? this.editData.inner_detail : "",
//         Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(1500)]),
//       ),
//     });
//     console.log("primaryFrm", this.primaryForm);
//   };
//
//   formValidationErrorCheck = (fieldName: string) => {
//     return (
//       this.primaryForm.controls[fieldName].invalid && (this.submitted || this.primaryForm.controls[fieldName].dirty)
//     );
//   };
//
//   handleSubmit = async () => {
//     this.submitted = true;
//     if (!this.primaryForm.valid) {
//       console.log("primaryForm", this.primaryForm);
//       return false;
//     }
//     this.isLoading = true;
//
//     const formData = this.primaryForm.getRawValue();
//     const payload = {
//       supplier_id: this.supplierId,
//       inner_detail: formData.campaign_details,
//     };
//     try {
//       if (this.editData?.inner_detail) {
//         payload["inner_detail_id"] = this.editData.id;
//         await this.campaignService.editCampaignInnerDetails(payload);
//       } else {
//         await this.campaignService.addCampaignInnerDetails(payload);
//       }
//       this.activeCanvas.dismiss("Cross click");
//       this.isLoading = false;
//     } catch (e) {
//       console.log(e);
//     }
//   };
//   protected readonly constants = constants;
// }

import { Component, inject, signal } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { CampaignService } from 'src/app/services/campaign.service';
import { constants } from 'src/app/helpers/constants';
import { ErrorMessageCardComponent } from 'src/app/components/error-message-card/error-message-card.component';

@Component({
  selector: 'create-campaign-details',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ErrorMessageCardComponent
  ],
  templateUrl: './create-campaign-details.component.html',
  styleUrl: './create-campaign-details.component.scss'
})
export class CreateCampaignDetailsComponent {
  // Services
  public activeCanvas = inject(NgbActiveOffcanvas);
  private authService = inject(AuthService);
  private campaignService = inject(CampaignService);

  // State signals
  isLoading = signal(false);
  submitted = signal(false);
  userData = signal<any>(null);
  supplierId = signal<string>('');
  editData = signal<any>(null);
  canvasTitle = signal<string>('Create');

  // Constants
  protected readonly constants = constants;

  // Form
  primaryForm = new FormGroup({
    campaign_details: new FormControl('', [
      Validators.required,
      Validators.minLength(0),
      Validators.maxLength(1500)
    ]),
  });

  constructor() {
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);

    // Get edit data if any
    const editData = this.campaignService.getEditCampaignDetailItem();
    this.editData.set(editData);

    if (editData?.inner_detail) {
      this.campaignService.setEditCampaignDetailItem("");
      this.canvasTitle.set("Edit");
    }

    this.setPrimaryForm();
  }

  setPrimaryForm() {
    this.primaryForm.patchValue({
      campaign_details: this.editData()?.inner_detail || ''
    });
  }

  formValidationErrorCheck(fieldName: string): boolean {
    const control = this.primaryForm.get(fieldName);
    return !!control && control.invalid && (this.submitted() || control.dirty);
  }

  async handleSubmit() {
    this.submitted.set(true);
    if (!this.primaryForm.valid) {
      return false;
    }

    this.isLoading.set(true);
    const formData = this.primaryForm.getRawValue();

    const payload: any = {
      supplier_id: this.supplierId(),
      inner_detail: formData.campaign_details,
    };

    try {
      if (this.editData()?.inner_detail) {
        payload.inner_detail_id = this.editData().id;
        await this.campaignService.editCampaignInnerDetails(payload);
      } else {
        await this.campaignService.addCampaignInnerDetails(payload);
      }

      this.activeCanvas.dismiss("Cross click");
    } catch (error) {
      console.error('Error saving campaign details:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
