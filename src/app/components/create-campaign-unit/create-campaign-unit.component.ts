// import { Component, OnInit } from "@angular/core";
// import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
// import { AuthService } from "src/app/services/auth.service";
// import { CampaignService } from "../../services/campaign.service";
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
//
// @Component({
//   selector: 'create-campaign-unit',
//   imports: [
//     ReactiveFormsModule,
//     ErrorMessageCardComponent
//   ],
//   templateUrl: './create-campaign-unit.component.html',
//   styleUrl: './create-campaign-unit.component.scss'
// })
// export class CreateCampaignUnitComponent {
//   primaryForm: FormGroup;
//   userData;
//   supplierId;
//   isLoading: boolean = false;
//   submitted: boolean = false;
//
//   constructor(
//     public activeCanvas: NgbActiveOffcanvas,
//     private _authService: AuthService,
//     private campaignService: CampaignService
//   ) {}
//
//   ngOnInit(): void {
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//     this.setPrimaryForm();
//   }
//
//   setPrimaryForm = () => {
//     this.primaryForm = new FormGroup({
//       unit: new FormControl(
//         "",
//         Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(500)])
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
//       unit: formData.unit
//     };
//     try {
//       await this.campaignService.addUnit(payload);
//       this.activeCanvas.dismiss("Cross click");
//       this.isLoading = false;
//     } catch (e) {
//       console.log(e);
//     }
//   };
// }

import { Component, inject, signal } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { CampaignService } from 'src/app/services/campaign.service';
import { ErrorMessageCardComponent } from 'src/app/components/error-message-card/error-message-card.component';

@Component({
  selector: 'create-campaign-unit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ErrorMessageCardComponent
  ],
  templateUrl: './create-campaign-unit.component.html',
  styleUrl: './create-campaign-unit.component.scss'
})
export class CreateCampaignUnitComponent {
  // Services
  public activeCanvas = inject(NgbActiveOffcanvas);
  private authService = inject(AuthService);
  private campaignService = inject(CampaignService);

  // State signals
  isLoading = signal(false);
  submitted = signal(false);
  userData = signal<any>(null);
  supplierId = signal<string>('');

  // Form
  primaryForm = new FormGroup({
    unit: new FormControl('', [
      Validators.required,
      Validators.minLength(0),
      Validators.maxLength(500)
    ]),
  });

  constructor() {
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);
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

    try {
      await this.campaignService.addUnit({
        supplier_id: this.supplierId(),
        unit: formData.unit
      });
      this.activeCanvas.dismiss("Cross click");
    } catch (error) {
      console.error('Error saving unit:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
