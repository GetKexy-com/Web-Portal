import { Component, OnDestroy, OnInit } from "@angular/core";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { AuthService } from "../../services/auth.service";
import { constants } from "../../helpers/constants";
import { ProspectingService } from "../../services/prospecting.service";
import Swal from "sweetalert2";
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'add-or-delete-contact-label',
  imports: [
    ReactiveFormsModule,
    ErrorMessageCardComponent,
    CommonModule
  ],
  templateUrl: './add-or-delete-contact-label.component.html',
  styleUrl: './add-or-delete-contact-label.component.scss'
})
export class AddOrDeleteContactLabelComponent {
  primaryForm: FormGroup;
  userData;
  supplierId;
  isLoading: boolean = false;
  submitted: boolean = false;
  canvasTitle: string = "Create";
  colorOptions = [...constants.LABEL_COLOR_OPTIONS];
  selectedLabel;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private _authService: AuthService,
    private prospectingService: ProspectingService
  ) {}

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    // Get edit data if any
    this.selectedLabel = this.prospectingService.selectedLabelForEdit;
    if (this.selectedLabel && Object.keys(this.selectedLabel).length) {
      this.canvasTitle = "Edit";
    }

    this.setPrimaryForm();
  }

  ngOnDestroy() {
    this.prospectingService.selectedLabelForEdit = "";
  }

  setPrimaryForm = () => {
    if (this.selectedLabel?.itemBgColor) {
      const index = this.colorOptions.findIndex(i => i.labelBgColor === this.selectedLabel.itemBgColor);
      this.selectedColor = this.colorOptions[index];
    }

    this.primaryForm = new FormGroup({
      label: new FormControl(
        this.selectedLabel?.value ? this.selectedLabel.value : "",
        Validators.compose([Validators.required, Validators.minLength(0)])
      ),
      bg_color: new FormControl(
        this.selectedLabel?.itemBgColor ? this.selectedLabel.itemBgColor : "",
        Validators.compose([Validators.required, Validators.minLength(0)])
      ),
      text_color: new FormControl(
        this.selectedLabel?.itemTextColor ? this.selectedLabel.itemTextColor : "",
        Validators.compose([Validators.required, Validators.minLength(0)])
      ),
    });
  };

  formValidationErrorCheck = (fieldName: string) => {
    return (
      this.primaryForm.controls[fieldName].invalid && (this.submitted || this.primaryForm.controls[fieldName].dirty)
    );
  };

  selectedColor;
  handleColorSelect = (item) => {
    this.selectedColor = item;
    this.primaryForm.patchValue({ bg_color: this.selectedColor.labelBgColor });
    this.primaryForm.patchValue({ text_color: this.selectedColor.labelTextColor });
  }

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
      label: formData.label,
      bg_color: formData.bg_color,
      text_color: formData.text_color
    };
    try {
      // Api call here
      if (this.selectedLabel?.value) {
        payload["label_id"] = this.selectedLabel.id;
        await this.prospectingService.updateLabel(payload);
      } else {
        await this.prospectingService.addLabel(payload);
      }

      const getLabelApiPostData = {
        supplier_id: this.supplierId,
        page: this.prospectingService.manageListCurrentPage || 1,
        limit: this.prospectingService.manageListLimit || 100,
        get_total_count: true
      }
      await this.prospectingService.getLabels(getLabelApiPostData);

      this.activeCanvas.dismiss("Cross click");
      this.isLoading = false;
    } catch (e) {
      this.isLoading = false;
      console.log(e);
      await Swal.fire("Error", e.message);
    }
  };
}

// import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
// import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
// import { AuthService } from '../../services/auth.service';
// import { constants } from '../../helpers/constants';
// import { ProspectingService } from '../../services/prospecting.service';
// import Swal from 'sweetalert2';
// import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
// import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
//
// @Component({
//   selector: 'add-or-delete-contact-label',
//   standalone: true,
//   imports: [
//     ReactiveFormsModule,
//     ErrorMessageCardComponent
//   ],
//   templateUrl: './add-or-delete-contact-label.component.html',
//   styleUrl: './add-or-delete-contact-label.component.scss'
// })
// export class AddOrDeleteContactLabelComponent implements OnInit {
//   // Services
//   private prospectingService = inject(ProspectingService);
//   private authService = inject(AuthService);
//   private destroyRef = inject(DestroyRef);
//   public activeCanvas = inject(NgbActiveOffcanvas);
//
//   // State
//   primaryForm: FormGroup;
//   colorOptions = [...constants.LABEL_COLOR_OPTIONS];
//   selectedColor = signal<any>(null);
//   isLoading = signal(false);
//   submitted = signal(false);
//   canvasTitle = signal("Create");
//   selectedLabel: any;
//
//   // User data
//   supplierId: string;
//
//   constructor() {
//     this.primaryForm = new FormGroup({
//       label: new FormControl('', [Validators.required]),
//       bg_color: new FormControl('', [Validators.required]),
//       text_color: new FormControl('', [Validators.required])
//     });
//   }
//
//   ngOnInit(): void {
//     const userData = this.authService.userTokenValue;
//     this.supplierId = userData.supplier_id;
//
//     // Get edit data if any
//     this.prospectingService.selectedLabelForEdit
//       .pipe(takeUntilDestroyed(this.destroyRef))
//       .subscribe(label => {
//         this.selectedLabel = label;
//         if (label && Object.keys(label).length) {
//           this.canvasTitle.set("Edit");
//           this.setPrimaryForm();
//         }
//       });
//   }
//
//   setPrimaryForm() {
//     if (this.selectedLabel?.itemBgColor) {
//       const index = this.colorOptions.findIndex(i => i.labelBgColor === this.selectedLabel.itemBgColor);
//       this.selectedColor.set(this.colorOptions[index]);
//     }
//
//     this.primaryForm.patchValue({
//       label: this.selectedLabel?.value || "",
//       bg_color: this.selectedLabel?.itemBgColor || "",
//       text_color: this.selectedLabel?.itemTextColor || ""
//     });
//   }
//
//   formValidationErrorCheck(fieldName: string): boolean {
//     const control = this.primaryForm.get(fieldName);
//     return control ? control.invalid && (this.submitted() || control.dirty) : false;
//   }
//
//   handleColorSelect(item: any) {
//     this.selectedColor.set(item);
//     this.primaryForm.patchValue({
//       bg_color: item.labelBgColor,
//       text_color: item.labelTextColor
//     });
//   }
//
//   async handleSubmit() {
//     this.submitted.set(true);
//     if (!this.primaryForm.valid) {
//       return false;
//     }
//     this.isLoading.set(true);
//
//     const formData = this.primaryForm.getRawValue();
//     const payload = {
//       supplier_id: this.supplierId,
//       label: formData.label,
//       bg_color: formData.bg_color,
//       text_color: formData.text_color
//     };
//
//     try {
//       if (this.selectedLabel?.value) {
//         Object.assign(payload, { label_id: this.selectedLabel.id });
//         await this.prospectingService.updateLabel(payload);
//       } else {
//         await this.prospectingService.addLabel(payload);
//       }
//
//       await this.prospectingService.getLabels({
//         supplier_id: this.supplierId,
//         page: this.prospectingService.manageListCurrentPage || 1,
//         limit: this.prospectingService.manageListLimit || 100,
//         get_total_count: true
//       });
//
//       this.activeCanvas.dismiss("Cross click");
//     } catch (error: any) {
//       await Swal.fire("Error", error.message);
//     } finally {
//       this.isLoading.set(false);
//     }
//   }
// }
