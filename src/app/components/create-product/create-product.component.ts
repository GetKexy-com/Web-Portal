import { Component, inject, signal } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/services/auth.service';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';

/**
 * Right-side drawer to create or edit a product/service with any number of
 * descriptions. Edit mode is signalled by `ProspectingService.selectedProduct`
 * (set by the opener); it is read once and cleared here.
 */
@Component({
  selector: 'create-product',
  standalone: true,
  imports: [ReactiveFormsModule, ErrorMessageCardComponent],
  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.scss',
})
export class CreateProductComponent {
  public activeCanvas = inject(NgbActiveOffcanvas);
  private authService = inject(AuthService);
  private prospectingService = inject(ProspectingService);

  readonly maxName = 30;
  readonly maxDescription = 1000;

  isLoading = signal(false);
  submitted = signal(false);
  editData = signal<any>(null);
  canvasTitle = signal<string>('Add');

  primaryForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(this.maxName)]),
    descriptions: new FormArray<FormControl<string>>([]),
  });

  get descriptions() {
    return this.primaryForm.controls.descriptions;
  }

  constructor() {
    const editData = this.prospectingService.getSelectedProduct();
    if (editData?.name) {
      this.editData.set(editData);
      this.prospectingService.setSelectedProduct('');
      this.canvasTitle.set('Edit');
      this.primaryForm.patchValue({ name: editData.name });
      (editData.descriptions ?? []).forEach((d: string) => this.addDescription(d));
    }
    // Always show at least one box so there is somewhere to type.
    if (!this.descriptions.length) this.addDescription();
  }

  addDescription(value = '') {
    this.descriptions.push(
      new FormControl(value, { nonNullable: true, validators: [Validators.maxLength(this.maxDescription)] }),
    );
  }

  removeDescription(index: number) {
    // The last box is cleared rather than removed, so the form never has zero.
    if (this.descriptions.length === 1) {
      this.descriptions.at(0).setValue('');
      return;
    }
    this.descriptions.removeAt(index);
  }

  formValidationErrorCheck(fieldName: string): boolean {
    const control = this.primaryForm.get(fieldName);
    return !!control && control.invalid && (this.submitted() || control.dirty);
  }

  /** True when submitting with every description box empty. */
  get missingDescription(): boolean {
    return this.submitted() && !this.__filledDescriptions().length;
  }

  private __filledDescriptions = (): string[] =>
    this.descriptions.controls.map((c) => c.value.trim()).filter(Boolean);

  async saveNewProduct() {
    this.submitted.set(true);
    if (this.primaryForm.invalid || !this.__filledDescriptions().length) return;

    this.isLoading.set(true);
    const payload: any = {
      name: this.primaryForm.value.name.trim(),
      descriptions: this.__filledDescriptions(),
      companyId: this.authService.userTokenValue.supplier_id,
    };

    try {
      if (this.editData()) {
        payload.id = this.editData().id;
        await this.prospectingService.updateProduct(payload);
      } else {
        await this.prospectingService.createProduct(payload);
      }
      this.activeCanvas.dismiss('Saved');
    } catch (e) {
      await Swal.fire('Error', e?.message || 'Could not save the product/service.', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }
}
