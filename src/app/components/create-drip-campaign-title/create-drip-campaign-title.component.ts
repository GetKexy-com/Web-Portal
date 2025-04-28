// import { Component } from '@angular/core';
// import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
// import { AuthService } from "src/app/services/auth.service";
// import { DripCampaignService } from "../../services/drip-campaign.service";
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
//
// @Component({
//   selector: 'app-create-drip-campaign-title',
//   imports: [
//     ErrorMessageCardComponent,
//     ReactiveFormsModule
//   ],
//   templateUrl: './create-drip-campaign-title.component.html',
//   styleUrl: './create-drip-campaign-title.component.scss'
// })
// export class CreateDripCampaignTitleComponent {
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
//     private dripCampaignService: DripCampaignService
//   ) {}
//
//   ngOnInit(): void {
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//
//     // Get edit data if any
//     this.editData = this.dripCampaignService.getEditDripCampaignTitleItem();
//     if (this.editData?.title) {
//       this.dripCampaignService.setEditDripCampaignTitleItem("");
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
//         Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(50)])
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
//       title: formData.campaign_title
//     };
//     try {
//       if (this.editData?.title) {
//         payload['title_id'] = this.editData.id;
//         await this.dripCampaignService.editDripCampaignTitle(payload);
//       } else {
//         await this.dripCampaignService.addDripCampaignTitle(payload);
//       }
//       this.activeCanvas.dismiss("Cross click");
//       this.isLoading = false;
//     } catch (e) {
//       console.log(e);
//     }
//   };
// }

import {Component, inject, OnInit} from '@angular/core';
import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { AuthService } from "src/app/services/auth.service";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-create-drip-campaign-title',
  standalone: true,
  imports: [
    ErrorMessageCardComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './create-drip-campaign-title.component.html',
  styleUrl: './create-drip-campaign-title.component.scss'
})
export class CreateDripCampaignTitleComponent implements OnInit {
  private _authService = inject(AuthService);
  private dripCampaignService = inject(DripCampaignService);
  private fb = inject(FormBuilder);

  primaryForm: FormGroup;
  userData: any;
  supplierId: string;
  isLoading = false;
  submitted = false;
  editData: any;
  canvasTitle = "Create";

  constructor(public activeCanvas: NgbActiveOffcanvas) {}

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    // Get edit data if any
    this.editData = this.dripCampaignService.getEditDripCampaignTitleItem();
    if (this.editData?.title) {
      this.dripCampaignService.setEditDripCampaignTitleItem("");
      this.canvasTitle = "Edit";
    }

    this.setPrimaryForm();
  }

  setPrimaryForm() {
    this.primaryForm = this.fb.group({
      campaign_title: [
        this.editData?.title ?? "",
        [Validators.required, Validators.minLength(0), Validators.maxLength(50)]
      ]
    });
  }

  formValidationErrorCheck(fieldName: string): boolean {
    const control = this.primaryForm.get(fieldName);
    return control ? control.invalid && (this.submitted || control.dirty) : false;
  }

  // async handleSubmit() {
  //   this.submitted = true;
  //   if (!this.primaryForm.valid) {
  //     return false;
  //   }
  //   this.isLoading = true;
  //
  //   const formData = this.primaryForm.getRawValue();
  //   const payload = {
  //     companyId: this.supplierId,
  //     title: formData.campaign_title,
  //     titleType: 'drip'
  //   };
  //
  //   try {
  //     if (this.editData?.title) {
  //       payload['title_id'] = this.editData.id;
  //       await this.dripCampaignService.editDripCampaignTitle(payload);
  //     } else {
  //       await this.dripCampaignService.addDripCampaignTitle(payload);
  //     }
  //     this.activeCanvas.dismiss("Cross click");
  //   } catch (e) {
  //     console.error(e);
  //   } finally {
  //     this.isLoading = false;
  //   }
  // }

  handleSubmit = async () => {
    this.submitted = true;
    if (!this.primaryForm.valid) {
      console.log("primaryForm", this.primaryForm);
      return false;
    }
    this.isLoading = true;

    const formData = this.primaryForm.getRawValue();
    const payload = {
      supplier_id: this.supplierId,
      title: formData.campaign_title
    };
    try {
      if (this.editData?.title) {
        payload['title_id'] = this.editData.id;
        await this.dripCampaignService.editDripCampaignTitle(payload);
      } else {
        await this.dripCampaignService.addDripCampaignTitle(payload);
      }
      this.activeCanvas.dismiss("Cross click");
      this.isLoading = false;
    } catch (e) {
      console.log(e);
    }
  };
}
