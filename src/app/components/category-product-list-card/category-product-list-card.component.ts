import { Component, Input, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import Swal from 'sweetalert2';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { AuthService } from 'src/app/services/auth.service';
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';

@Component({
  selector: 'category-product-list-card',
  standalone: true,
  imports: [
    KexyButtonComponent,
    FormsModule,
    NgClass,
    KexyButtonComponent
  ],
  templateUrl: './category-product-list-card.component.html',
  styleUrl: './category-product-list-card.component.scss'
})
export class CategoryProductListCardComponent {
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
  products = signal<any[]>([]);
  newProductClicked = signal(false);

  newProduct = signal({
    name: "",
    descriptions: [""],
    isOpened: true,
    isEditClicked: true,
  });

  constructor() {
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);

    this.prospectingService.allProduct
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(products => {
        this.products.set(products);
      });

    this.getProducts();
  }

  async getProducts() {
    this.isLoading.set(true);
    const data = {
      supplier_id: this.supplierId(),
      page: 1,
      limit: 1000,
      get_total_count: "false",
    };

    try {
      await this.prospectingService.getProducts(data);
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  addNewBtnClick(e: Event) {
    e.stopPropagation();
    if (this.newProductClicked()) {
      const products = this.products();
      const p = products[products.length - 1];
      p.isEditClicked = true;
      p.isOpened = true;
      this.products.set([...products]);
      return;
    }
    this.products.update(products => [...products, this.newProduct()]);
    this.newProductClicked.set(true);
  }

  handleRowClick(rowIndex: number) {
    this.products.update(products => {
      const updated = [...products];
      updated[rowIndex].isOpened = !updated[rowIndex].isOpened;
      updated[rowIndex].isEditClicked = false;
      return updated;
    });
  }

  handleEditClick(rowIndex: number) {
    this.products.update(products => {
      const updated = [...products];
      updated[rowIndex].isEditClicked = true;
      updated[rowIndex].isOpened = true;
      return updated;
    });
  }

  async createOrUpdateProduct(product: any) {
    if (product.id) {
      await this.updateProduct(product);
      return;
    }

    const newProd = {
      ...product,
      companyId: this.supplierId(),
      name: product.name,
    };

    delete newProd.isEditClicked;
    delete newProd.isOpened;

    if (newProd.descriptions[0] === "") {
      await Swal.fire("Error!", "Product description is missing.", "warning");
      return;
    }

    try {
      this.products.update(products => products.slice(0, -1));
      await this.prospectingService.createProduct(newProd);
      this.newProductClicked.set(false);
      this.resetNewProduct();
    } catch (e) {
      this.newProductClicked.set(false);
      console.error('Error creating product:', e);
    }
  }

  private resetNewProduct() {
    this.newProduct.set({
      name: "",
      descriptions: [""],
      isOpened: true,
      isEditClicked: true,
    });
  }

  async updateProduct(product: any) {
    const p = {
      ...product,
      id: product.id,
      companyId: this.supplierId(),
      name: product.name
    };

    delete p.isEditClicked;
    delete p.isOpened;
    delete p.status;
    delete p.createdAt;
    delete p.company;

    try {
      await this.prospectingService.updateProduct(p);
    } catch (e) {
      console.error('Error updating product:', e);
    }
  }

  async deleteProduct(product: any) {
    if (this.newProductClicked() && !product.id) {
      this.products.update(products => products.slice(0, -1));
      this.newProductClicked.set(false);
      return;
    }

    this.products.update(products => products.filter(p => p.id !== product.id));

    const data = {
      id: product.id,
    };

    try {
      await this.prospectingService.deleteProduct(data);
    } catch (e) {
      console.error('Error deleting product:', e);
    }
  }

  addNewDescription(e: Event, product: any) {
    e.stopPropagation();
    product.isEditClicked = true;
    product.descriptions.push("");
    this.products.update(products => [...products]); // Trigger change detection
  }

  syncProductDescription(e: Event, product: any, index: number) {
    product.descriptions[index] = (e.target as HTMLTextAreaElement).value;
  }

  async deleteProductDescription(product: any, index: number) {
    product.descriptions = product.descriptions.filter((d: string, i: number) => i !== index);
    await this.createOrUpdateProduct(product);
  }
}
