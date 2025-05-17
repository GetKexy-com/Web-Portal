import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { constants } from 'src/app/helpers/constants';
import Swal from 'sweetalert2';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import {
  ProspectingCommonCardComponent,
} from '../../components/prospecting-common-card/prospecting-common-card.component';

@Component({
  selector: 'prospecting-company-description',
  standalone: true,
  imports: [
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
  ],
  templateUrl: './prospecting-company-description.component.html',
  styleUrl: './prospecting-company-description.component.scss',
})
export class ProspectingCompanyDescriptionComponent implements OnInit {
  // State
  userData;
  supplierId;
  companyDescription;

  constructor(
    private httpService: HttpService,
    private authService: AuthService,
  ) {
    document.title = 'Prospecting Company Description - KEXY Brand Portal';
  }

  ngOnInit() {
    this.userData = this.authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;
    this.setCompanyDescriptionValue();
  }

  private setCompanyDescriptionValue() {
    const userToken = JSON.parse(localStorage.getItem(constants.USERTOKEN) || '{}');
    this.companyDescription = userToken?.company_description || '';
  }

  saveCompanyDescription = async (description: string) => {
    const payload = {
      companyDescription: description,
    };
    try {
      const url = `company/${this.supplierId}`;
      const res = await this.httpService.patch(url, payload).toPromise();
      if (res?.success) {
        const userToken = JSON.parse(localStorage.getItem(constants.USERTOKEN) || '{}');
        userToken.company_description = description;
        localStorage.setItem(constants.USERTOKEN, JSON.stringify(userToken));

        // Modern alert alternative
        await Swal.fire({
          title: 'Success!',
          text: 'Saved successfully!',
          icon: 'success',
          confirmButtonText: 'OK',
        });
      }
    } catch (error) {
      console.error('Error saving company description:', error);
      const alert = await Swal.fire({
        title: 'Error!',
        text: 'Failed to save description',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };
}
