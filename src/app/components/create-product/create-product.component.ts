// import { Component, OnInit } from "@angular/core";
// import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
// import { AuthService } from "src/app/services/auth.service";
// import { ProspectingService } from "src/app/services/prospecting.service";
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
//
// @Component({
//   selector: 'create-product',
//   imports: [
//     ReactiveFormsModule,
//     ErrorMessageCardComponent
//   ],
//   templateUrl: './create-product.component.html',
//   styleUrl: './create-product.component.scss'
// })
// export class CreateProductComponent {
//   primaryForm: FormGroup;
//   userData;
//   supplierId;
//   editData;
//   canvasTitle: string = "Create";
//
//   constructor(
//     public activeCanvas: NgbActiveOffcanvas,
//     private _authService: AuthService,
//     private prospectingService: ProspectingService,
//   ) {}
//
//   ngOnInit(): void {
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//
//     // Get edit data if any
//     this.editData = this.prospectingService.getSelectedProduct();
//     console.log('editData', this.editData);
//     if (this.editData && this.editData.name) {
//       this.prospectingService.setSelectedProduct("");
//       this.canvasTitle = "Edit";
//     }
//
//     this.setPrimaryForm();
//   }
//
//   setPrimaryForm = () => {
//     this.primaryForm = new FormGroup({
//       product_name: new FormControl(
//         this.editData?.name ? this.editData.name : "",
//         Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(30)])
//       ),
//       product_desc: new FormControl(this.editData && this.editData.descriptions.length ? this.editData.descriptions[0] : "",
//         Validators.compose([Validators.maxLength(1000)])),
//       category: new FormControl(
//         "1",
//         Validators.compose([Validators.required])
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
//   isLoading: boolean = false;
//   submitted: boolean = false;
//
//   saveNewProduct = async () => {
//     this.submitted = true;
//     if (!this.primaryForm.valid) {
//       console.log("primaryForm", this.primaryForm);
//       return false;
//     }
//     this.isLoading = true;
//
//     const formData = this.primaryForm.getRawValue();
//     const payload = {
//       product_name: formData.product_name,
//       category_id: 1,
//       descriptions: formData.product_desc ? [formData.product_desc] : [],
//       isOpened: true,
//       isEditClicked: true,
//       supplier_id: this.supplierId,
//       user_id: this.userData.id,
//     };
//
//     try {
//       if (this.editData?.name) {
//         payload["descriptions"] = this.editData.descriptions;
//         payload["status"] = this.editData.status;
//         payload["created_at"] = this.editData.created_at;
//         payload["product_id"] = this.editData.id;
//         delete payload.isOpened;
//         delete payload.isEditClicked;
//         console.log(payload);
//         await this.prospectingService.updateProduct(payload);
//       } else {
//         await this.prospectingService.createProduct(payload);
//       }
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
import { ProspectingService } from 'src/app/services/prospecting.service';
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';

@Component({
  selector: 'create-product',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ErrorMessageCardComponent,
    ErrorMessageCardComponent
  ],
  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.scss'
})
export class CreateProductComponent {
  // Services
  public activeCanvas = inject(NgbActiveOffcanvas);
  private authService = inject(AuthService);
  private prospectingService = inject(ProspectingService);

  // State signals
  isLoading = signal(false);
  submitted = signal(false);
  userData = signal<any>(null);
  supplierId = signal<string>('');
  editData = signal<any>(null);
  canvasTitle = signal<string>('Create');

  // Form
  primaryForm = new FormGroup({
    product_name: new FormControl('', [
      Validators.required,
      Validators.minLength(0),
      Validators.maxLength(30)
    ]),
    product_desc: new FormControl('', [
      Validators.maxLength(1000)
    ]),
    category: new FormControl('1', [
      Validators.required
    ]),
  });

  constructor() {
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);

    // Get edit data if any
    const editData = this.prospectingService.getSelectedProduct();
    this.editData.set(editData);

    if (editData?.name) {
      this.prospectingService.setSelectedProduct("");
      this.canvasTitle.set("Edit");
    }

    this.setPrimaryForm();
  }

  setPrimaryForm() {
    this.primaryForm.patchValue({
      product_name: this.editData()?.name || '',
      product_desc: this.editData()?.descriptions?.length ? this.editData().descriptions[0] : '',
      category: '1'
    });
  }

  formValidationErrorCheck(fieldName: string): boolean {
    const control = this.primaryForm.get(fieldName);
    return !!control && control.invalid && (this.submitted() || control.dirty);
  }

  async saveNewProduct() {
    this.submitted.set(true);
    if (!this.primaryForm.valid) {
      return false;
    }

    this.isLoading.set(true);

    const formData = this.primaryForm.getRawValue();
    const payload: any = {
      product_name: formData.product_name,
      category_id: 1,
      descriptions: formData.product_desc ? [formData.product_desc] : [],
      isOpened: true,
      isEditClicked: true,
      supplier_id: this.supplierId(),
      user_id: this.userData().id,
    };

    try {
      if (this.editData()?.name) {
        payload.descriptions = this.editData().descriptions;
        payload.status = this.editData().status;
        payload.created_at = this.editData().created_at;
        payload.product_id = this.editData().id;
        delete payload.isOpened;
        delete payload.isEditClicked;

        await this.prospectingService.updateProduct(payload);
      } else {
        await this.prospectingService.createProduct(payload);
      }

      this.activeCanvas.dismiss("Cross click");
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
