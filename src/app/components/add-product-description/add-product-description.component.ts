// import { Component, OnInit } from "@angular/core";
// import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import { FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
// import { AuthService } from "src/app/services/auth.service";
// import { ProspectingService } from "src/app/services/prospecting.service";
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
//
// @Component({
//   selector: 'app-add-product-description',
//   imports: [
//     ReactiveFormsModule,
//     ErrorMessageCardComponent
//   ],
//   templateUrl: './add-product-description.component.html',
//   styleUrl: './add-product-description.component.scss'
// })
// export class AddProductDescriptionComponent {
//   primaryForm: FormGroup;
//   userData;
//   supplierId;
//   public productData;
//   public descriptionData;
//   canvasTitle: string = "Add";
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
//     // get product data from service
//     this.productData = this.prospectingService.getSelectedProduct();
//     console.log("selectedPrody", this.productData);
//
//     // get description data from service
//     this.descriptionData = this.prospectingService.getSelectedDescription();
//     console.log('descriptionData', this.descriptionData);
//     if (this.descriptionData && this.descriptionData.descriptionIndex > -1) {
//       this.canvasTitle = "Edit";
//
//       // remove data from service
//       this.prospectingService.setSelectedDescription("");
//     }
//
//     this.setPrimaryForm();
//   }
//
//   setPrimaryForm = () => {
//     this.primaryForm = new FormGroup({
//       product_desc: new FormControl(
//         this.descriptionData && this.descriptionData.descriptionIndex > -1 ? this.descriptionData.product_descriptions[this.descriptionData.descriptionIndex] : "",
//         Validators.compose([Validators.required, Validators.maxLength(1000)])
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
//   saveNewProduct = async () => {
//     this.submitted = true;
//     if (!this.primaryForm.valid) {
//       console.log("primaryForm", this.primaryForm);
//       return false;
//     }
//     this.isLoading = true;
//
//     const formData = this.primaryForm.getRawValue();
//     let payload = {
//       product_id: this.productData.id,
//       category_id: this.productData.category_id,
//       product_name: this.productData.name,
//       descriptions: [...this.productData.descriptions, formData.product_desc],
//     };
//     try {
//       // Resetting description array for edit case
//       if (this.descriptionData && this.descriptionData.descriptionIndex > -1) {
//         this.descriptionData.product_descriptions[this.descriptionData.descriptionIndex] = formData.product_desc;
//         payload.descriptions = this.descriptionData.product_descriptions;
//         console.log(payload);
//       }
//       await this.prospectingService.updateProduct(payload);
//
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
import { ErrorMessageCardComponent } from 'src/app/components/error-message-card/error-message-card.component';

interface DescriptionData {
  descriptionIndex: number;
  product_descriptions: string[];
}

@Component({
  selector: 'add-product-description',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ErrorMessageCardComponent
  ],
  templateUrl: './add-product-description.component.html',
  styleUrl: './add-product-description.component.scss'
})
export class AddProductDescriptionComponent {
  // Services
  public activeCanvas = inject(NgbActiveOffcanvas);
  private authService = inject(AuthService);
  private prospectingService = inject(ProspectingService);

  // State signals
  isLoading = signal(false);
  submitted = signal(false);
  userData = signal<any>(null);
  supplierId = signal<string>('');
  productData = signal<any>(null);
  descriptionData = signal<DescriptionData | null>(null);
  canvasTitle = signal<string>('Add');

  // Form
  primaryForm = new FormGroup({
    product_desc: new FormControl('', [
      Validators.required,
      Validators.maxLength(1000)
    ]),
  });

  constructor() {
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);

    // Get product and description data from service
    this.productData.set(this.prospectingService.getSelectedProduct());
    const descData = this.prospectingService.getSelectedDescription();
    this.descriptionData.set(descData);

    if (descData?.descriptionIndex > -1) {
      this.canvasTitle.set("Edit");
      this.prospectingService.setSelectedDescription("");
    }

    this.setPrimaryForm();
  }

  setPrimaryForm() {
    const descValue = this.descriptionData()?.descriptionIndex > -1
      ? this.descriptionData()!.product_descriptions[this.descriptionData()!.descriptionIndex]
      : "";
    this.primaryForm.patchValue({
      product_desc: descValue
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
    const product = this.productData();

    try {
      let descriptions = [...product.descriptions];

      if (this.descriptionData()?.descriptionIndex > -1) {
        // Edit existing description
        descriptions[this.descriptionData()!.descriptionIndex] = formData.product_desc;
      } else {
        // Add new description
        descriptions.push(formData.product_desc);
      }

      const payload = {
        product_id: product.id,
        category_id: product.category_id,
        product_name: product.name,
        descriptions: descriptions
      };

      await this.prospectingService.updateProduct(payload);
      this.activeCanvas.dismiss("Cross click");
    } catch (error) {
      console.error('Error saving product description:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
