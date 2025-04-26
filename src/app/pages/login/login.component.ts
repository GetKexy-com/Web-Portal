// import { Component } from '@angular/core';
// import {LoginLayoutComponent} from "../../layouts/login-layout/login-layout.component";
// import {FormGroup, FormBuilder, Validators, ReactiveFormsModule} from "@angular/forms";
// import { Router, ActivatedRoute } from "@angular/router";
//
// import { AuthService } from "../../services/auth.service";
// import { routeConstants } from "../../helpers/routeConstants";
//
// @Component({
//   selector: 'app-login',
//   imports: [
//     LoginLayoutComponent,
//     ReactiveFormsModule
//   ],
//   templateUrl: './login.component.html',
//   styleUrl: './login.component.scss'
// })
// export class LoginComponent {
//   loginForm: FormGroup;
//   returnUrl: string;
//   error: any;
//   protected params: any;
//
//   isLoading: Boolean = false;
//
//   constructor(
//     private _authService: AuthService,
//     private router: Router,
//     private fb: FormBuilder,
//     private route: ActivatedRoute,
//   ) {
//   }
//
//   ngOnInit() {
//     document.title = "Login - KEXY Webportal";
//     this._authService.loggedUserRedirectToProperDashboard();
//
//     this.route.queryParams.subscribe((params) => {
//       this.params = params;
//       if (this.params && this.params["returnUrl"] && this.params["returnUrl"] !== "") {
//         console.log(this.params["returnUrl"]);
//         localStorage.setItem("returnUrl", this.params["returnUrl"]);
//       }
//     });
//
//     this.loginForm = this.fb.group({
//       email: ["", [Validators.required, Validators.email]],
//       password: ["", Validators.required],
//       remember_me: 0,
//     });
//   }
//
//   get email() {
//     return this.loginForm.get("email");
//   }
//
//   get password() {
//     return this.loginForm.get("password");
//   }
//
//   submitted: boolean = false;
//
//   onSubmit() {
//     this.submitted = true;
//     if (!this.loginForm.valid) {
//       return;
//     }
//
//     this.isLoading = true;
//     const data = this.loginForm.getRawValue();
//     this._authService.login(data.email, data.password).subscribe(
//       (data) => this.handleResponse(data),
//       (error) => (this.error = error),
//     );
//   }
//
//   handleResponse(data: any) {
//     console.log("data", data);
//     if (!data.success) {
//       this.isLoading = false;
//       console.log("Login Failed", data);
//
//       if (data.error["details"]) {
//         let errors: any = [];
//         Object.keys(data.error["details"]).forEach((key, index) => {
//           errors.push(data.error["details"][key]);
//         });
//         this.error = errors.join("<br />");
//       } else {
//         this.error = data.error.message;
//       }
//     } else {
//       console.log("Login Successful");
//     }
//     // Note: If successful, it'll automatically trigger the subscriber fn
//   }
//
//   forgetPasswordTapped() {
//     this.router.navigate([routeConstants.FORGET_PASSWORD]);
//   }
//
//   createAccount() {
//     this.router.navigate([routeConstants.EMAIL_CONFIRMATION]);
//   }
//
//   goBackTapped() {
//     location.href = "https://www.getkexy.com";
//   }
// }


import {Component, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { LoginLayoutComponent } from '../../layouts/login-layout/login-layout.component';
import { AuthService } from '../../services/auth.service';
import { routeConstants } from '../../helpers/routeConstants';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {constants} from '../../helpers/constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LoginLayoutComponent, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  submitted = signal(false);
  isLoading = signal(false);
  error = signal<string | null>(null);
  returnUrl = signal<string>('');

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember_me: 0,
  });

  constructor() {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params?.['returnUrl']) {
          localStorage.setItem('returnUrl', params['returnUrl']);
          this.returnUrl.set(params['returnUrl']);
        }
      });
  }

  ngOnInit() {
    document.title = 'Login - KEXY Webportal';
    this.authService.loggedUserRedirectToProperDashboard();
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onSubmit() {
    this.submitted.set(true);
    this.error.set(null);

    if (!this.loginForm.valid) return;

    this.isLoading.set(true);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login(email, password).subscribe({
      next: (data) => this.handleResponse(data),
      error: (err) => {
        this.isLoading.set(false);
        console.log('error', err);
        this.error.set(err?.error || 'An error occurred');
      },
    });

    // Secondary login for old api calls
    // this.authService.secondarylogin(email, password).subscribe({
    //   next: (response) => {
    //     console.log('old data', response);
    //     if (response.success) {
    //       localStorage.setItem(constants.OLD_USER_TOKEN, response.data.token);
    //     }
    //   }
    // })
  }

  handleResponse(data: any) {
    this.isLoading.set(false);

    if (!data.success) {
      if (data.error?.details) {
        const errorMessages = Object.values(data.error.details).join('<br />');
        this.error.set(errorMessages);
      } else {
        this.error.set(data.error?.message || 'Login failed.');
      }
    } else {
      console.log('✅ Login Successful');
    }
  }

  forgetPasswordTapped() {
    this.router.navigate([routeConstants.FORGET_PASSWORD]);
  }

  createAccount() {
    this.router.navigate([routeConstants.EMAIL_CONFIRMATION]);
  }

  goBackTapped() {
    location.href = 'https://www.getkexy.com';
  }
}
