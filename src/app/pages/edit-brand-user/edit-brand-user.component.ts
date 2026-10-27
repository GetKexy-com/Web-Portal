import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';
import { PhoneNumberValidator } from 'src/app/helpers/phoneNumberValidator';
import { HttpService } from 'src/app/services/http.service';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { CommonModule } from '@angular/common';
import {
  ProspectingCommonCardComponent,
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { ErrorMessageCardComponent } from '../../components/error-message-card/error-message-card.component';
import {
  KexyProTipsModalContentComponent,
} from '../../components/kexy-pro-tips-modal-content/kexy-pro-tips-modal-content.component';
import { routeConstants } from '../../helpers/routeConstants';
import { dripCampaignInitialModalData } from '../../helpers/demoData';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PageUiService } from '../../services/page-ui.service';
import { countries } from 'src/assets/countries';
import { errorText, kxForm, kxNotice } from '../../helpers/kx-dialogs';
import { PhoneNumberMaskDirective } from '../../directive/phone-number-mask.directive';

@Component({
  selector: 'app-edit-brand-user',
  imports: [BrandLayoutComponent, ReactiveFormsModule, CommonModule, ProspectingCommonCardComponent, KexyButtonComponent, ErrorMessageCardComponent, FormsModule, PhoneNumberMaskDirective],
  templateUrl: './edit-brand-user.component.html',
  styleUrl: './edit-brand-user.component.scss',
})
export class EditBrandUserComponent implements OnInit {
  primaryForm: FormGroup;
  imageUrl: any = null;
  submitted: boolean = false;
  error;
  isWaitingFlag: boolean = false;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userData;
  public countries = [];
  private emailBackup = null;
  private phoneBackup = null;
  private jobTitleBackup = null;
  private newImageUploaded = false;

  constructor(
    private _authService: AuthService,
    private pageUiService: PageUiService,
    private modal: NgbModal,
    private httpService: HttpService,
  ) {
  }

  ngOnInit() {
    this._authService.loggedUserRedirectToProperDashboard();

    this.userData = this._authService.userTokenValue;
    console.log('userData', this.userData);
    this.emailBackup = this.userData.email;
    this.phoneBackup = this.userData.phone;
    this.jobTitleBackup = this.userData.job_title;
    this.userData.phone = this.pageUiService.formatUSPhoneNumbers(`${this.userData.phoneCountryCode}${this.userData.phone}`);

    // let c = countries.find(e => e.isoCode === this.userData.supplier_country);
    // if(c) {
    //   this.userData.supplier_country = c.name;
    // }

    if (this.userData.logoImage) {
      this.imageUrl = environment.imageUrl + this.userData.logoImage.name;
    }

    this.getCountryList();

    this.primaryForm = new FormGroup({
      firstName: new FormControl(
        this.userData.firstName,
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(64),
          Validators.pattern('^[a-zA-Z- ]+$'),
        ]),
      ),
      lastName: new FormControl(
        this.userData.lastName,
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(64),
          Validators.pattern('^[a-zA-Z- ]+$'),
        ]),
      ),
      phone: new FormControl(
        this.userData.phone,
        Validators.compose([PhoneNumberValidator(this.userData.country)]),
      ),
      country: new FormControl(
        this.userData.country,
        [Validators.required],
      ),
      role: new FormControl(
        this.userData.role,
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(128),
        ]),
      ),
      email: new FormControl(
        this.userData.email,
        Validators.compose([Validators.required, Validators.email]),
      ),
    });
  }

  private getCountryList() {
    countries.forEach((c) => {
      if (c.isoCode === 'NL' || c.isoCode === 'GM') {
        c.name = c.name.replace('The', '');
      }
      if (c.isoCode === 'CD') {
        c.name = 'Congo, The Democratic Republic';
      }
    });

    this.countries = countries.filter((c) => {
      return !c.phonecode.includes('+1-');
    });
  }



  async primaryFormSubmitted(): Promise<any> {
    this.submitted = true;
    if (!this.primaryForm.valid) {
      return;
    }
    let companyData: any = {};

    this.isWaitingFlag = true;
    let form = this.primaryForm.value;
    if (this.newImageUploaded) {
      form.profilePhoto = this.imageUrl;
    }

    delete form.role;
    // delete form.email;

    if (form.phone != undefined) form.phone = form.phone.replace(/\D/g, '');

    this.isWaitingFlag = true;

    this.httpService.patch('users', form).subscribe({
      next: (response) => {
        if (response.success) {
          this.isWaitingFlag = false;

          this.userData.firstName = form.firstName;
          this.userData.lastName = form.lastName;
          this.userData.email = form.email;
          this.userData.phone = form.phone;
          this.userData.country = form.country;
          if (response.data.logoImage?.name) {
            this.userData.logoImage = response.data.logoImage;
          }

          localStorage.setItem('userToken', JSON.stringify(this.userData));

          Swal.fire('Done!', 'Saved successfully!', 'success');
        }
      },
      error: (e) => {
        this.isWaitingFlag = false;
        let message = 'There was an error!';
        if (e?.error) {
          message = e.error;
        }

        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: message,
        });
      },
    });
  }

  async createApiKey() {
    return;
    const postData = {
      name: this.userData.supplier_name,
      companyId: this.userData.supplier_id,
    };
    return new Promise(async (resolve, reject) => {
      this.httpService.post('api-keys', postData).subscribe({
        next: (res) => {
          resolve(res.data);
        },
        error: (err) => {
          if (err) {
            reject(err);
          }
        },
      });
    });
  }


  /**
   * Change Password, in the portal's popup design (`kxForm`). The popup stays open on a
   * mistake (empty box, wrong current password) with the reason under the fields.
   */
  changePassword = async () => {
    const done = await kxForm({
      title: 'Change password',
      text: 'Enter your current password, then the new one.',
      icon: 'fa-lock',
      confirmText: 'Update password',
      fields: [
        { key: 'current', label: 'Current password', type: 'password' },
        { key: 'next', label: 'New password', type: 'password' },
      ],
      validate: (v) =>
        !v['current'] ? 'Enter your current password.' : !v['next'] ? 'Enter a new password.' : null,
      submit: async (v) => {
        try {
          await this.passwordUpdateApiCall({ currentPassword: v['current'], newPassword: v['next'] });
          return null;
        } catch (e) {
          return passwordErrorText(e);
        }
      },
    });
    if (done) {
      await kxNotice({
        title: 'Password changed',
        text: 'Use your new password the next time you log in.',
        icon: 'fa-check',
        tone: 'success',
      });
    }
  };

  passwordUpdateApiCall = (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('users/updatePassword', postData).subscribe({
        next: (res) => {
          resolve(res.data);
        },
        error: (err) => {
          if (err) {
            reject(err);
          }
        },
      });
    });
  };


  openFileDialog() {
    (<any>document.querySelector('.profile-photo-file-input')).click();
  }

  fileSelected(e) {
    if (e.target.files.length === 0) {
      this.imageUrl = null;
      return;
    }
    let file = e.target.files[0];

    if (file.type.indexOf('image/') !== 0) {
      alert('Invalid Image - Please select a valid image');
      return;
    }

    let reader = new FileReader();
    reader.onload = () => {
      this.imageUrl = reader.result;
      this.newImageUploaded = true;
    };
    reader.readAsDataURL(file);
  }

  protected readonly routeConstants = routeConstants;
  protected readonly features = dripCampaignInitialModalData;
}

/** The API's reason (a string, an array of validation messages, or `{ message }`). */
function passwordErrorText(e: any): string {
  const body = e?.error ?? e;
  if (Array.isArray(body) && typeof body[0] === 'string') return body[0];
  if (Array.isArray(body?.message) && typeof body.message[0] === 'string') return body.message[0];
  return errorText(body, 'Could not change the password. Please try again.');
}
