// import { Component, OnInit } from "@angular/core";
// import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
// import { AuthService } from "../../services/auth.service";
// import { HttpService } from "../../services/http.service";
// import { Router } from "@angular/router";
// import { constants } from "../../helpers/constants";
// import { routeConstants } from "../../helpers/routeConstants";
// import {LoginLayoutComponent} from '../../layouts/login-layout/login-layout.component';
// import {PhoneNumberMaskDirective} from '../../directive/phone-number-mask.directive';
//
// @Component({
//   selector: 'app-register',
//   imports: [
//     LoginLayoutComponent,
//     ReactiveFormsModule,
//     PhoneNumberMaskDirective
//   ],
//   templateUrl: './register.component.html',
//   styleUrl: './register.component.scss'
// })
// export class RegisterComponent {
//   registerForm: FormGroup;
//   email: string;
//   first_name: string;
//   last_name: string;
//   phone: string;
//   imageUrl = null;
//   error;
//   isWaitingFlag: boolean = false;
//   selectedCountry: any = "US";
//   phoneCode = "+1";
//   public countries = [];
//   checkInvitation: string = "";
//   accountType: string = "";
//   job_title: string = "";
//   constants = constants;
//
//   constructor(
//     private _authService: AuthService,
//     private httpService: HttpService,
//     private router: Router,
//     private fb: FormBuilder,
//   ) {}
//
//   ngOnInit() {
//     document.title = "User Register - KEXY Webportal";
//
//     this._authService.loggedUserRedirectToProperDashboard();
//
//     this.email = localStorage.getItem("registerEmail");
//     this.first_name = localStorage.getItem("firstName");
//     this.last_name = localStorage.getItem("lastName");
//
//     this.checkInvitation = localStorage.getItem("verifyInvitationConfirmationCode");
//     this.accountType = localStorage.getItem(constants.ACCOUNT_TYPE);
//     if (this.checkInvitation == "sent") {
//       this.accountType = localStorage.getItem(constants.INVITED_BY);
//       this.email = localStorage.getItem("joiningEmail");
//       this.job_title = localStorage.getItem("role");
//     }
//
//     this.registerForm = new FormGroup({
//       first_name: new FormControl(
//         this.first_name,
//         Validators.compose([
//           Validators.required,
//           Validators.minLength(0),
//           Validators.maxLength(64),
//           Validators.pattern("^[a-zA-Z- ]+$"),
//         ])
//       ),
//       last_name: new FormControl(
//         this.last_name,
//         Validators.compose([
//           Validators.required,
//           Validators.minLength(0),
//           Validators.maxLength(64),
//           Validators.pattern("^[a-zA-Z- ]+$"),
//         ])
//       ),
//       job_title: new FormControl(
//         "",
//         Validators.compose([
//           Validators.required,
//           Validators.minLength(0),
//           Validators.maxLength(64),
//           Validators.pattern("^[a-zA-Z- ]+$"),
//         ])
//       ),
//       country: new FormControl(
//         this.accountType === constants.BRAND ? constants.US : "",
//         Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(21)])
//       ),
//       phone: new FormControl(
//         "",
//         Validators.compose([
//           Validators.required,
//           Validators.minLength(0),
//           Validators.maxLength(21),
//           Validators.pattern(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/),
//         ])
//       ),
//       password: new FormControl(
//         "",
//         Validators.compose([Validators.required, Validators.minLength(8), Validators.maxLength(64)])
//       ),
//     });
//   }
//   submitted: boolean = false;
//
//   onSubmit() {
//     this.submitted = true;
//
//     if (!this.registerForm.valid) {
//       console.log(this.registerForm);
//       return;
//     }
//
//     sessionStorage.setItem("last_phone_country_code", this.phoneCode);
//     sessionStorage.setItem("last_selectedCountry", this.selectedCountry);
//
//     this.isWaitingFlag = true;
//     const data = this.registerForm.getRawValue();
//     data.phone_country_code = this.phoneCode;
//     data.status = constants.ACTIVE;
//     data.type = this.accountType;
//     let registerData = {
//       email: this.email,
//       profile_photo: this.imageUrl,
//     };
//     Object.assign(data, registerData);
//
//     if (this.checkInvitation == "sent") {
//       data.job_title = localStorage.getItem("role");
//     }
//
//     let loginData = {
//       email: this.email,
//       password: data.password,
//     };
//
//     this.httpService.post("user/register", data).subscribe(async (response) => {
//       if (response.success) {
//         this.isWaitingFlag = false;
//
//         let hubspotFormData = {
//           formGuid: constants.HUBSPOT_USER_REGISTER_FORMID,
//           fields: [
//             {
//               name: "email",
//               value: data.email,
//             },
//           ],
//           context: {
//             pageUri: location.href,
//             pageName: document.title,
//           },
//         };
//         this.httpService.post("user/formSubmitInHubspot", hubspotFormData).subscribe((response) => {});
//
//         let res = await this.httpService.post("user/login", loginData).toPromise();
//         if (!res.success) {
//           return;
//         }
//
//         await localStorage.setItem("registerToken", res.data.token);
//         await localStorage.setItem("registerPassword", data.password);
//         await localStorage.setItem("jobTitle", data.job_title);
//
//         this.isWaitingFlag = false;
//
//         let inviteUrl = routeConstants.BRAND.INVITATION;
//         let createUrl = routeConstants.BRAND.CREATE;
//
//         if (this.checkInvitation == "sent") {
//           await this.router.navigate([inviteUrl, { fromPage: "login" }]);
//         } else {
//           await this.router.navigate([createUrl]);
//         }
//       } else {
//         this.isWaitingFlag = false;
//         let message = "There was an error!";
//         if (response.error && response.error.code && response.error.message) {
//           message = response.error.message;
//         }
//         this.error = message;
//       }
//     });
//   }
//
//   openFileDialog() {
//     (<any>document.querySelector(".profile-photo-file-input")).click();
//   }
//
//   fileSelected(e) {
//     if (e.target.files.length === 0) {
//       this.imageUrl = null;
//       return;
//     }
//     let file = e.target.files[0];
//
//     if (file.type.indexOf("image/") !== 0) {
//       alert("Invalid Image - Please select a valid image");
//       return;
//     }
//
//     let reader = new FileReader();
//     reader.onload = () => {
//       this.imageUrl = reader.result;
//     };
//     reader.readAsDataURL(file);
//   }
// }


import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpService } from '../../services/http.service';
import { constants } from '../../helpers/constants';
import { routeConstants } from '../../helpers/routeConstants';
import { LoginLayoutComponent } from '../../layouts/login-layout/login-layout.component';
import { PhoneNumberMaskDirective } from '../../directive/phone-number-mask.directive';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    LoginLayoutComponent,
    ReactiveFormsModule,
    PhoneNumberMaskDirective
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  email = signal<string>('');
  first_name = signal<string>('');
  last_name = signal<string>('');
  phone = signal<string>('');
  imageUrl = signal<string | null>(null);
  error = signal<string>('');
  isWaitingFlag = signal<boolean>(false);
  selectedCountry = signal<string>("US");
  phoneCode = signal<string>("+1");
  countries = signal<any[]>([]);
  checkInvitation = signal<string>("");
  accountType = signal<string>("");
  job_title = signal<string>("");
  submitted = signal<boolean>(false);
  constants = constants;

  constructor(
    private _authService: AuthService,
    private httpService: HttpService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.registerForm = this.fb.group({
      first_name: ['', [
        Validators.required,
        Validators.minLength(0),
        Validators.maxLength(64),
        Validators.pattern("^[a-zA-Z- ]+$")
      ]],
      last_name: ['', [
        Validators.required,
        Validators.minLength(0),
        Validators.maxLength(64),
        Validators.pattern("^[a-zA-Z- ]+$")
      ]],
      job_title: ['', [
        Validators.required,
        Validators.minLength(0),
        Validators.maxLength(64),
        Validators.pattern("^[a-zA-Z- ]+$")
      ]],
      country: [constants.US, [
        Validators.required,
        Validators.minLength(0),
        Validators.maxLength(21)
      ]],
      phone: ['', [
        Validators.required,
        Validators.minLength(0),
        Validators.maxLength(21),
        Validators.pattern(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(64)
      ]]
    });
  }

  ngOnInit() {
    document.title = "User Register - KEXY Webportal";

    this._authService.loggedUserRedirectToProperDashboard();

    this.email.set(localStorage.getItem("registerEmail") ?? '');
    this.first_name.set(localStorage.getItem("firstName") ?? '');
    this.last_name.set(localStorage.getItem("lastName") ?? '');

    this.checkInvitation.set(localStorage.getItem("verifyInvitationConfirmationCode") ?? '');
    this.accountType.set(localStorage.getItem(constants.ACCOUNT_TYPE) ?? '');

    if (this.checkInvitation() === "sent") {
      this.accountType.set(localStorage.getItem(constants.INVITED_BY) ?? '');
      this.email.set(localStorage.getItem("joiningEmail") ?? '');
      this.job_title.set(localStorage.getItem("role") ?? '');
    }

    // Set initial form values
    this.registerForm.patchValue({
      first_name: this.first_name(),
      last_name: this.last_name(),
      job_title: this.job_title()
    });
  }

  async onSubmit() {
    this.submitted.set(true);

    if (!this.registerForm.valid) {
      console.log(this.registerForm);
      return;
    }

    sessionStorage.setItem("last_phone_country_code", this.phoneCode());
    sessionStorage.setItem("last_selectedCountry", this.selectedCountry());

    this.isWaitingFlag.set(true);
    const data = this.registerForm.getRawValue();
    data.phone_country_code = this.phoneCode();
    data.status = constants.ACTIVE;
    data.type = this.accountType();

    const registerData = {
      email: this.email(),
      profile_photo: this.imageUrl()
    };

    Object.assign(data, registerData);

    if (this.checkInvitation() === "sent") {
      data.job_title = localStorage.getItem("role");
    }

    const loginData = {
      email: this.email(),
      password: data.password
    };

    try {
      const response = await this.httpService.post("user/register", data).toPromise();

      if (response?.success) {
        this.isWaitingFlag.set(false);

        const hubspotFormData = {
          formGuid: constants.HUBSPOT_USER_REGISTER_FORMID,
          fields: [
            {
              name: "email",
              value: data.email
            }
          ],
          context: {
            pageUri: location.href,
            pageName: document.title
          }
        };

        this.httpService.post("user/formSubmitInHubspot", hubspotFormData).subscribe();

        const res = await this.httpService.post("user/login", loginData).toPromise();
        if (!res?.success) {
          return;
        }

        localStorage.setItem("registerToken", res.data.token);
        localStorage.setItem("registerPassword", data.password);
        localStorage.setItem("jobTitle", data.job_title);

        this.isWaitingFlag.set(false);

        const inviteUrl = routeConstants.BRAND.INVITATION;
        const createUrl = routeConstants.BRAND.CREATE;

        if (this.checkInvitation() === "sent") {
          await this.router.navigate([inviteUrl, { fromPage: "login" }]);
        } else {
          await this.router.navigate([createUrl]);
        }
      } else {
        this.isWaitingFlag.set(false);
        let message = "There was an error!";
        if (response?.error?.code && response?.error?.message) {
          message = response.error.message;
        }
        this.error.set(message);
      }
    } catch (err) {
      this.isWaitingFlag.set(false);
      this.error.set("There was an error processing your request.");
    }
  }

  openFileDialog() {
    const fileInput = document.querySelector(".profile-photo-file-input") as HTMLInputElement;
    fileInput.click();
  }

  fileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length === 0) {
      this.imageUrl.set(null);
      return;
    }

    const file = input.files![0];

    if (!file.type.startsWith("image/")) {
      alert("Invalid Image - Please select a valid image");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imageUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
}
