import { Component, OnInit } from "@angular/core";
import { AuthService } from "src/app/services/auth.service";
import { Router } from "@angular/router";
import { routeConstants } from "src/app/helpers/routeConstants";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {
  ProspectingCommonCardComponent
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import {
  CategoryProductListCardComponent
} from '../../components/category-product-list-card/category-product-list-card.component';

@Component({
  selector: 'app-prospecting-product-description',
  imports: [
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
    CategoryProductListCardComponent
  ],
  templateUrl: './prospecting-product-description.component.html',
  styleUrl: './prospecting-product-description.component.scss'
})
export class ProspectingProductDescriptionComponent {
  userData;

  constructor(private _authService: AuthService) {}

  async ngOnInit() {
    document.title = "Prospecting Product Description - KEXY Brand Portal";
    this.userData = this._authService.userTokenValue;
  }
}
