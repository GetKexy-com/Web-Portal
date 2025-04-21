// import { Component, Input, OnDestroy, OnInit } from "@angular/core";
// import { Router } from "@angular/router";
// import { AuthService } from "src/app/services/auth.service";
// import { ProspectingService } from "../../services/prospecting.service";
// import { Subscription } from "rxjs";
// import Swal from "sweetalert2";
// import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
// import {FormsModule} from '@angular/forms';
// import {NgClass} from '@angular/common';
//
// @Component({
//   selector: 'category-product-list-card',
//   imports: [
//     KexyButtonComponent,
//     FormsModule,
//     NgClass
//   ],
//   templateUrl: './category-product-list-card.component.html',
//   styleUrl: './category-product-list-card.component.scss'
// })
// export class CategoryProductListCardComponent {
//   @Input() isLoading: boolean = false;
//   @Input() toggleBtnBg;
//   @Input() tableHeaderBg;
//   @Input() tableHeaderColor;
//   userData;
//   supplierId;
//   products: any;
//   newProduct = {
//     name: "",
//     category_id: 1,
//     descriptions: [""],
//     isOpened: true,
//     isEditClicked: true,
//   };
//   newProductClicked = false;
//   productsSubscription: Subscription;
//
//   constructor(
//     private prospectingService: ProspectingService,
//     private _authService: AuthService
//   ) {}
//
//   ngOnInit(): void {
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//     this.productsSubscription = this.prospectingService.allProduct.subscribe((products) => {
//       console.log(products);
//       this.products = products;
//     });
//     this.getProducts();
//   }
//
//   ngOnDestroy(): void {
//     this.productsSubscription.unsubscribe();
//   }
//
//   getProducts = async () => {
//     this.isLoading = true;
//     const data = {
//       supplier_id: this.supplierId,
//       page: 1,
//       limit: 1000,
//       get_total_count: "false",
//     };
//     try {
//       await this.prospectingService.getProducts(data);
//     } catch (e) {
//       // Handle error here
//       console.log(e);
//     } finally {
//       this.isLoading = false;
//     }
//   };
//
//   addNewBtnClick = (e) => {
//     e.stopPropagation();
//     if (this.newProductClicked) {
//       // If user already clicked add new product then do not add new row but
//       // open the last row they opened but not completed
//       const p = this.products[this.products.length - 1];
//       p.isEditClicked = true;
//       p.isOpened = true;
//       return;
//     }
//     this.products.push(this.newProduct);
//     this.newProductClicked = true;
//   };
//
//   handleRowClick = (rowIndex) => {
//     this.products[rowIndex].isOpened = !this.products[rowIndex].isOpened;
//     this.products[rowIndex].isEditClicked = false;
//   };
//
//   handleEditClick = (rowIndex) => {
//     this.products[rowIndex].isEditClicked = true;
//     this.products[rowIndex].isOpened = true;
//   };
//
//   createOrUpdateProduct = async (product) => {
//     if (product.id) {
//       await this.updateProduct(product);
//       return;
//     }
//
//     const newProd = {
//       ...product,
//       category_id: 1,
//       supplier_id: this.supplierId,
//       user_id: this.userData.id,
//     };
//     newProd["product_name"] = newProd.name;
//     delete newProd.name;
//     delete newProd.isEditClicked;
//     delete newProd.isOpened;
//     // console.log(newProd.descriptions.length);
//     if(newProd.descriptions[0] === "") {
//       Swal.fire("Error!", "Product description is missing.", "warning").then(() => {
//       });
//       return;
//     }
//
//     try {
//       this.products.pop();
//       await this.prospectingService.createProduct(newProd);
//       this.newProductClicked = false;
//       this.setNewProductObjectToDefault();
//     } catch (e) {
//       this.newProductClicked = false;
//     }
//   };
//
//   setNewProductObjectToDefault = () => {
//     this.newProduct = {
//       name: "",
//       category_id: undefined,
//       descriptions: [""],
//       isOpened: true,
//       isEditClicked: true,
//     };
//   };
//
//   updateProduct = async (product) => {
//     const p = { ...product };
//     p["product_id"] = p.id;
//     p["product_name"] = p.name;
//     delete p.id;
//     delete p.name;
//     delete p.isEditClicked;
//     delete p.isOpened;
//
//     try {
//       await this.prospectingService.updateProduct(p);
//     } catch (e) {
//       console.log(e);
//     }
//   };
//
//   deleteProduct = async (product: any) => {
//     // If user click "add new description" but
//     // then try to delete it then we prevent API call as new product was not created yet
//     // so there is nothing to delete from server.
//     // So we just pop it from array to simulate the delete
//     if (this.newProductClicked && !product.id) {
//       this.products.pop();
//       this.newProductClicked = false;
//       return;
//     }
//     this.products = this.products.filter((p) => p.id !== product.id);
//     const data = {
//       product_id: product.id,
//       supplier_id: product.supplier_id,
//     };
//     try {
//       await this.prospectingService.deleteProduct(data);
//     } catch (e) {
//       console.log(e);
//     }
//   };
//
//   addNewDescription = (e, product) => {
//     e.stopPropagation();
//     product.isEditClicked = true;
//     product.descriptions.push("");
//   };
//
//   syncProductDescription = (e, product: any, j: number) => {
//     product.descriptions[j] = e.target.value;
//   };
//
//   deleteProductDescription = async (product, index) => {
//     product.descriptions = product.descriptions.filter((d, i) => index != i);
//     await this.createOrUpdateProduct(product);
//   };
// }

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
    category_id: 1,
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
      category_id: 1,
      supplier_id: this.supplierId(),
      user_id: this.userData().id,
      product_name: product.name,
    };

    delete newProd.name;
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
      category_id: 1,
      descriptions: [""],
      isOpened: true,
      isEditClicked: true,
    });
  }

  async updateProduct(product: any) {
    const p = {
      ...product,
      product_id: product.id,
      product_name: product.name
    };

    delete p.id;
    delete p.name;
    delete p.isEditClicked;
    delete p.isOpened;

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
      product_id: product.id,
      supplier_id: product.supplier_id,
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
