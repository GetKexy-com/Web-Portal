import { Component, OnInit } from "@angular/core";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import { AuthService } from "src/app/services/auth.service";
import { Router } from "@angular/router";
import { environment } from "src/environments/environment";
import Swal from "sweetalert2";
import { PhoneNumberValidator } from "src/app/helpers/phoneNumberValidator";
import { HttpService } from "src/app/services/http.service";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-edit-brand-user',
  imports: [
    BrandLayoutComponent,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './edit-brand-user.component.html',
  styleUrl: './edit-brand-user.component.scss'
})
export class EditBrandUserComponent {
  primaryForm: FormGroup;
  imageUrl: any = null;
  submitted: boolean = false;
  error;
  isWaitingFlag: boolean = false;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  userData;
  private emailBackup = null;
  private phoneBackup = null;
  private jobTitleBackup = null;
  private newImageUploaded = false;

  constructor(private _authService: AuthService, private httpService: HttpService, private router: Router) {
  }

  ngOnInit() {
    this._authService.loggedUserRedirectToProperDashboard();
    document.title = "Edit Profile - KEXY Brand Webportal";

    this.userData = this._authService.userTokenValue;
    console.log(this.userData);
    this.emailBackup = this.userData.email;
    this.phoneBackup = this.userData.phone;
    this.jobTitleBackup = this.userData.job_title;

    if (this.userData.logo_image_url) {
      this.imageUrl = environment.imageUrl + this.userData.logo_image_url;
    }

    this.primaryForm = new FormGroup({
      first_name: new FormControl(
        this.userData.firstName,
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(64),
          Validators.pattern("^[a-zA-Z- ]+$"),
        ]),
      ),
      last_name: new FormControl(
        this.userData.lastName,
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(64),
          Validators.pattern("^[a-zA-Z- ]+$"),
        ]),
      ),
      phone: new FormControl(this.userData.phone, Validators.compose([PhoneNumberValidator(this.userData.country)])),
      role: new FormControl(
        this.userData.role,
        Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(128)]),
      ),
      email: new FormControl(this.userData.email, Validators.compose([Validators.required, Validators.email])),
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
      form.profile_photo = this.imageUrl;
    }

    delete form.role;
    delete form.email;

    if (form.phone != undefined) form.phone = form.phone.replace(/\D/g, "");

    this.httpService.post("user/editProfile", form).subscribe((response) => {
      if (response.success) {
        this.isWaitingFlag = false;

        this.userData.first_name = form.first_name;
        this.userData.last_name = form.last_name;
        if (response.data.user.logo_image_url) this.userData.logo_image_url = response.data.user.logo_image_url;

        localStorage.setItem("userToken", JSON.stringify(this.userData));

        Swal.fire("Done!", "Saved successfully!", "success");
      } else {
        this.isWaitingFlag = false;
        let message = "There was an error!";
        if (response.error && response.error.code && response.error.message) {
          message = response.error.message;
        }
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: message,
        });
      }
    });
  }

  openFileDialog() {
    (<any>document.querySelector(".profile-photo-file-input")).click();
  }

  fileSelected(e) {
    if (e.target.files.length === 0) {
      this.imageUrl = null;
      return;
    }
    let file = e.target.files[0];

    if (file.type.indexOf("image/") !== 0) {
      alert("Invalid Image - Please select a valid image");
      return;
    }

    let reader = new FileReader();
    reader.onload = () => {
      this.imageUrl = reader.result;
      this.newImageUploaded = true;
    };
    reader.readAsDataURL(file);
  }
}
