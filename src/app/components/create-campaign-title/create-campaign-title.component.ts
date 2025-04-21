// import { Component, OnInit } from "@angular/core";
// import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
// import { HttpService } from "src/app/services/http.service";
// import { AuthService } from "src/app/services/auth.service";
// import { CampaignService } from "../../services/campaign.service";
// import { constants } from "../../helpers/constants";
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
//
// @Component({
//   selector: 'create-campaign-title',
//   imports: [
//     ReactiveFormsModule,
//     ErrorMessageCardComponent
//   ],
//   templateUrl: './create-campaign-title.component.html',
//   styleUrl: './create-campaign-title.component.scss'
// })
// export class CreateCampaignTitleComponent {
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
//     private fb: FormBuilder,
//     private httpService: HttpService,
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
//     this.editData = this.campaignService.getEditCampaignTitleItem();
//     if (this.editData?.title) {
//       this.campaignService.setEditCampaignTitleItem("");
//       this.canvasTitle = "Edit";
//     }
//
//     this.setPrimaryForm();
//   }
//
//   setPrimaryForm = () => {
//     this.primaryForm = new FormGroup({
//       campaign_title: new FormControl(
//         this.editData?.title ? this.editData.title : "",
//         Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(50)]),
//       ),
//     });
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
//       title: formData.campaign_title,
//     };
//     try {
//       if (this.editData?.title) {
//         payload["title_id"] = this.editData.id;
//         await this.campaignService.editCampaignTitle(payload);
//       } else {
//         await this.campaignService.addCampaignTitle(payload);
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
import { HttpService } from 'src/app/services/http.service';
import { AuthService } from 'src/app/services/auth.service';
import { CampaignService } from 'src/app/services/campaign.service';
import { constants } from 'src/app/helpers/constants';
import { ErrorMessageCardComponent } from 'src/app/components/error-message-card/error-message-card.component';

@Component({
  selector: 'create-campaign-title',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ErrorMessageCardComponent
  ],
  templateUrl: './create-campaign-title.component.html',
  styleUrl: './create-campaign-title.component.scss'
})
export class CreateCampaignTitleComponent {
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
    campaign_title: new FormControl('', [
      Validators.required,
      Validators.minLength(0),
      Validators.maxLength(50)
    ]),
  });

  constructor() {
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);

    // Get edit data if any
    const editData = this.campaignService.getEditCampaignTitleItem();
    this.editData.set(editData);

    if (editData?.title) {
      this.campaignService.setEditCampaignTitleItem("");
      this.canvasTitle.set("Edit");
    }

    this.setPrimaryForm();
  }

  setPrimaryForm() {
    this.primaryForm.patchValue({
      campaign_title: this.editData()?.title || ''
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
      title: formData.campaign_title,
    };

    try {
      if (this.editData()?.title) {
        payload.title_id = this.editData().id;
        await this.campaignService.editCampaignTitle(payload);
      } else {
        await this.campaignService.addCampaignTitle(payload);
      }

      this.activeCanvas.dismiss("Cross click");
    } catch (error) {
      console.error('Error saving campaign title:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
