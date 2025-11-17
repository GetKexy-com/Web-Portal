import { Component, OnInit } from '@angular/core';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import {
  ProspectingCommonCardComponent
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import { HttpService } from '../../services/http.service';
import { AuthService } from '../../services/auth.service';
import { constants } from '../../helpers/constants';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-negative-prompt',
  imports: [
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
  ],
  templateUrl: './negative-prompt.component.html',
  styleUrl: './negative-prompt.component.scss'
})
export class NegativePromptComponent implements OnInit {
  // State
  userData;
  supplierId;
  negativePrompts = "";

  constructor(
    private httpService: HttpService,
    private authService: AuthService,
  ) {
    document.title = 'Negative Prompts - KEXY Brand Portal';
  }

  ngOnInit() {
    this.userData = this.authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;
    this.setCompanyDescriptionValue();
  }

  private setCompanyDescriptionValue() {
    const userToken = JSON.parse(localStorage.getItem(constants.USERTOKEN) || '{}');
    this.negativePrompts = userToken?.negative_prompts || '';
  }

  saveNegativePrompts = async (negativePrompts: string) => {
    const payload = { negativePrompts };
    try {
      const url = `company/${this.supplierId}`;
      const res = await this.httpService.patch(url, payload).toPromise();
      if (res?.success) {
        const userToken = JSON.parse(localStorage.getItem(constants.USERTOKEN) || '{}');
        userToken.negative_prompts = negativePrompts;
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
      console.error('Error saving negative prompts:', error);
      const alert = await Swal.fire({
        title: 'Error!',
        text: 'Failed to save negative prompts',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };
}
