import { Component, Input, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ProspectingService } from 'src/app/services/prospecting.service';
import { AuthService } from 'src/app/services/auth.service';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { CreateProductComponent } from '../create-product/create-product.component';

@Component({
  selector: 'category-product-list-card',
  standalone: true,
  imports: [KexyButtonComponent],
  templateUrl: './category-product-list-card.component.html',
  styleUrl: './category-product-list-card.component.scss'
})
export class CategoryProductListCardComponent {
  // Services
  private prospectingService = inject(ProspectingService);
  private authService = inject(AuthService);
  private ngbOffcanvas = inject(NgbOffcanvas);
  private destroyRef = inject(DestroyRef);

  // Inputs
  @Input() isLoading = signal(false);
  @Input() toggleBtnBg?: string;
  @Input() tableHeaderBg?: string;
  @Input() tableHeaderColor?: string;

  // State
  supplierId = signal<string>('');
  products = signal<any[]>([]);

  constructor() {
    this.supplierId.set(this.authService.userTokenValue.supplier_id);

    // Create/update/delete all publish through the service, so the list stays in sync
    // without the drawer having to report back.
    this.prospectingService.allProduct
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(products => this.products.set(products));

    this.getProducts();
  }

  async getProducts() {
    this.isLoading.set(true);
    try {
      await this.prospectingService.getProducts({
        supplier_id: this.supplierId(),
        page: 1,
        limit: 1000,
        get_total_count: 'false',
      });
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  addNewBtnClick(e: Event) {
    e.stopPropagation();
    this.openProductCanvas();
  }

  /** No argument opens the drawer empty (create); a product opens it for editing. */
  openProductCanvas(product: any = '') {
    this.prospectingService.setSelectedProduct(product);
    this.ngbOffcanvas.open(CreateProductComponent, {
      panelClass: 'email-time-settings-slider edit-rep-canvas',
      backdropClass: 'edit-rep-canvas-backdrop',
      position: 'end',
      scroll: false,
    });
  }

  async deleteProduct(e: Event, product: any) {
    e.stopPropagation();
    const confirmed = await Swal.fire({
      title: 'Delete?',
      text: `"${product.name}" and its descriptions will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes!',
    });
    if (confirmed.dismiss) return;

    try {
      await this.prospectingService.deleteProduct({ id: product.id });
    } catch (err) {
      await Swal.fire('Error', err?.message || 'Could not delete the product/service.', 'error');
    }
  }

  /** First description, trimmed for the table cell. */
  preview(product: any): string {
    const first: string = product.descriptions?.[0] ?? '';
    return first.length > 140 ? first.slice(0, 140) + '…' : first;
  }
}
