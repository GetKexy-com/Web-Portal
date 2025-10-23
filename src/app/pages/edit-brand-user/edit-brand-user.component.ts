import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
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
import { ModalComponent } from '../../components/modal/modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-edit-brand-user',
  imports: [BrandLayoutComponent, ReactiveFormsModule, CommonModule, ProspectingCommonCardComponent, KexyButtonComponent, ErrorMessageCardComponent, KexyProTipsModalContentComponent, ModalComponent, FormsModule],
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
  changePasswordModalRef;
  currentPassword: string;
  currentPasswordType: string = 'password';
  newPasswordType: string = 'password';
  currentPasswordView: boolean = false;
  newPasswordView: boolean = false;
  changePasswordSubmitted: boolean = false;
  newPassword: string;
  isPasswordUpdateLoading: boolean = false;
  userData;
  private emailBackup = null;
  private phoneBackup = null;
  private jobTitleBackup = null;
  private newImageUploaded = false;

  constructor(
    private _authService: AuthService,
    private modal: NgbModal,
    private httpService: HttpService,
  ) {
  }

  ngOnInit() {
    this._authService.loggedUserRedirectToProperDashboard();
    document.title = 'Edit Profile - KEXY Brand Webportal';

    this.userData = this._authService.userTokenValue;
    console.log('userData', this.userData);
    this.emailBackup = this.userData.email;
    this.phoneBackup = this.userData.phone;
    this.jobTitleBackup = this.userData.job_title;

    if (this.userData.logoImage) {
      this.imageUrl = environment.imageUrl + this.userData.logoImage.name;
    }

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

  toggleCurrentPasswordView() {
    this.currentPasswordView = !this.currentPasswordView;
    this.currentPasswordType = this.currentPasswordView ? 'text' : 'password';
  }

  toggleNewPasswordView() {
    this.newPasswordView = !this.newPasswordView;
    this.newPasswordType = this.newPasswordView ? 'text' : 'password';
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

  updatePassModal = async (modalContent) => {
    this.changePasswordModalRef = this.modal.open(modalContent);
  };


  async updatePassword() {
    this.changePasswordSubmitted = true;
    if (!this.currentPassword || !this.newPassword) {
      return;
    }
    try {
      this.isPasswordUpdateLoading = true;
      await this.passwordUpdateApiCall({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      });
      await Swal.fire('Done!', 'Password changed successfully!', 'success');
    } catch (e) {
      let message = 'There was an error!';
      console.log(e.error);
      if (typeof e.error === 'object' && e.error[0]) {
        message = e.error[0];
      } else {
        message = e.error;
      }

      await Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: message,
      });
    } finally {
      this.isPasswordUpdateLoading = false;
    }
  }

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
