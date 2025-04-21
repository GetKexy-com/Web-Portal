// import { Component, OnInit } from "@angular/core";
// import { AuthService } from "src/app/services/auth.service";
// import { Router } from "@angular/router";
// import { HttpService } from "src/app/services/http.service";
// import { constants } from "src/app/helpers/constants";
// import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
// import {
//   ProspectingCommonCardComponent
// } from '../../components/prospecting-common-card/prospecting-common-card.component';
//
// @Component({
//   selector: 'app-prospecting-company-description',
//   imports: [
//     BrandLayoutComponent,
//     ProspectingCommonCardComponent
//   ],
//   templateUrl: './prospecting-company-description.component.html',
//   styleUrl: './prospecting-company-description.component.scss'
// })
// export class ProspectingCompanyDescriptionComponent {
//   userData;
//   supplierId;
//
//   constructor(private router: Router, private httpService: HttpService, private _authService: AuthService) {}
//
//   companyDescription = ``;
//
//   ngOnInit() {
//     document.title = "Prospecting Company Description - KEXY Brand Portal";
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//     this.setCompanyDescriptionValue();
//   }
//
//   setCompanyDescriptionValue = () => {
//     let userToken = JSON.parse(localStorage.getItem(constants.USERTOKEN));
//     this.companyDescription = userToken && userToken.company_description ? userToken.company_description : "";
//   };
//
//   saveCompanyDescription = async (description) => {
//     const payload = {
//       supplier_id: this.supplierId,
//       company_description: description,
//     };
//
//     let res = await this.httpService.post("supplier/edit", payload).toPromise();
//     if (res.success) {
//       let userToken = JSON.parse(localStorage.getItem(constants.USERTOKEN));
//       userToken.company_description = description;
//
//       localStorage.setItem(constants.USERTOKEN, JSON.stringify(userToken));
//
//       alert("Saved successfully!");
//     }
//   };
// }

import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { constants } from 'src/app/helpers/constants';
import Swal from 'sweetalert2';
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {
  ProspectingCommonCardComponent
} from '../../components/prospecting-common-card/prospecting-common-card.component';

@Component({
  selector: 'prospecting-company-description',
  standalone: true,
  imports: [
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
    BrandLayoutComponent,
    ProspectingCommonCardComponent
  ],
  templateUrl: './prospecting-company-description.component.html',
  styleUrl: './prospecting-company-description.component.scss'
})
export class ProspectingCompanyDescriptionComponent {
  // Services
  private router = inject(Router);
  private httpService = inject(HttpService);
  private authService = inject(AuthService);

  // State
  userData = signal<any>(null);
  supplierId = signal<string>('');
  companyDescription = signal<string>('');

  constructor() {
    document.title = "Prospecting Company Description - KEXY Brand Portal";
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);
    this.setCompanyDescriptionValue();
  }

  private setCompanyDescriptionValue() {
    const userToken = JSON.parse(localStorage.getItem(constants.USERTOKEN) || '{}');
    this.companyDescription.set(userToken?.company_description || '');
  }

  async saveCompanyDescription(description: string) {
    const payload = {
      supplier_id: this.supplierId(),
      company_description: description,
    };

    try {
      const res = await this.httpService.post("supplier/edit", payload).toPromise();
      if (res?.success) {
        const userToken = JSON.parse(localStorage.getItem(constants.USERTOKEN) || '{}');
        userToken.company_description = description;
        localStorage.setItem(constants.USERTOKEN, JSON.stringify(userToken));

        // Modern alert alternative
        const alert = await Swal.fire({
          title: 'Success!',
          text: 'Saved successfully!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {
      console.error('Error saving company description:', error);
      const alert = await Swal.fire({
        title: 'Error!',
        text: 'Failed to save description',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
}
