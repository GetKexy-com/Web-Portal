import { Component, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { constants } from 'src/app/helpers/constants';
import Swal from 'sweetalert2';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import {
  ProspectingCommonCardComponent,
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import {
  CategoryProductListCardComponent,
} from '../../components/category-product-list-card/category-product-list-card.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProspectingService } from '../../services/prospecting.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';

@Component({
  selector: 'prospecting-company-description',
  standalone: true,
  imports: [
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
    CategoryProductListCardComponent,
    KexyButtonComponent,
    ReactiveFormsModule,
    FormsModule,
    NgClass,
  ],
  templateUrl: './prospecting-company-description.component.html',
  styleUrl: './prospecting-company-description.component.scss',
})
export class ProspectingCompanyDescriptionComponent implements OnInit {
  // Services
  private prospectingService = inject(ProspectingService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  // Inputs
  @Input() isLoading = signal(false);
  @Input() toggleBtnBg?: string;
  @Input() tableHeaderBg?: string;
  @Input() tableHeaderColor?: string;

  // State
  userData = signal<any>(null);
  supplierId = signal<string>('');
  descriptions = signal<any[]>([]);
  newDescriptionClicked = signal(false);

  newDescription = signal({
    description: '',
    isEditClicked: true,
  });

  constructor() {
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);

    this.prospectingService.allDescription
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(descriptions => {
        this.descriptions.set(descriptions);
      });

    this.getDescriptions().then();
  }

  async ngOnInit() {
    document.title = 'Prospecting Company Description - KEXY Brand Portal';
  }

  async getDescriptions() {
    this.isLoading.set(true);
    const data = {
      companyId: this.supplierId(),
    };

    try {
      await this.prospectingService.getDescriptions(data);
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  addNewBtnClick(e: Event) {
    e.stopPropagation();
    if (this.newDescriptionClicked()) {
      const products = this.descriptions();
      const p = products[products.length - 1];
      p.isEditClicked = true;
      this.descriptions.set([...products]);
      return;
    }
    this.descriptions.update(products => [...products, this.newDescription()]);
    this.newDescriptionClicked.set(true);
  }

  handleEditClick(rowIndex: number) {
    this.descriptions.update(products => {
      const updated = [...products];
      updated[rowIndex].isEditClicked = !updated[rowIndex].isEditClicked;
      return updated;
    });
  }

  async createOrUpdateDescription(product: any) {
    if (product.id) {
      await this.updateDescription(product);
      return;
    }

    const newDesc = {
      ...product,
      companyId: this.supplierId(),
    };

    delete newDesc.isEditClicked;
    console.log(newDesc);
    if (newDesc.description === '') {
      await Swal.fire('Error!', 'Description is missing.', 'warning');
      return;
    }
    try {
      this.descriptions.update(descriptions => descriptions.slice(0, -1));
      await this.prospectingService.createDescription(newDesc);
      this.newDescriptionClicked.set(false);
      this.resetNewDescription();
    } catch (e) {
      this.newDescriptionClicked.set(false);
      console.error('Error creating product:', e);
    }
  }

  private resetNewDescription() {
    this.newDescription.set({
      description: '',
      isEditClicked: true,
    });
  }

  async updateDescription(product: any) {
    const p = {
      ...product,
      id: product.id,
    };

    delete p.isEditClicked;
    delete p.status;
    delete p.createdAt;
    delete p.user;
    console.log(p);
    try {
      await this.prospectingService.updateDescription(p);
    } catch (e) {
      console.error('Error updating product:', e);
    }
  }

  async deleteDescription(description: any) {

    const confirmed = await this.__isConfirmed();
    if (!confirmed) return;

    if (this.newDescriptionClicked() && !description.id) {
      this.descriptions.update(descriptions => descriptions.slice(0, -1));
      this.newDescriptionClicked.set(false);
      return;
    }

    const data = {
      id: description.id,
    };

    try {
      await this.prospectingService.deleteDescription(data);
      this.descriptions.update(descriptions => descriptions.filter(p => p.id !== description.id));
    } catch (e) {
      console.error('Error deleting product:', e);
    }

  }

  __isConfirmed = async () => {
    let isConfirm = await Swal.fire({
      title: `Delete?`,
      text: 'Are you sure?.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes!',
    });

    return !isConfirm.dismiss;
  };


}
