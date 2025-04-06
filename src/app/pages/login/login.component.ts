import { Component } from '@angular/core';
import {LoginLayoutComponent} from "../../layouts/login-layout/login-layout.component";
import {FormGroup, FormBuilder, Validators, ReactiveFormsModule} from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";

import { AuthService } from "../../services/auth.service";
import { Subscription } from "rxjs";
import { environment } from "../../../environments/environment";
import { routeConstants } from "../../helpers/routeConstants";

@Component({
  selector: 'app-login',
  imports: [
    LoginLayoutComponent,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  returnUrl: string;
  error: any;
  protected params: any;

  isLoading: Boolean = false;

  constructor(
    private _authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private route: ActivatedRoute,
  ) {
  }

  ngOnInit() {
    document.title = "Login - KEXY Webportal";
    this._authService.loggedUserRedirectToProperDashboard();
    // mixpanel.track('View Login Page');

    this.route.queryParams.subscribe((params) => {
      this.params = params;
      if (this.params && this.params["returnUrl"] && this.params["returnUrl"] !== "") {
        console.log(this.params["returnUrl"]);
        localStorage.setItem("returnUrl", this.params["returnUrl"]);
      }
    });

    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", Validators.required],
      remember_me: 0,
    });
  }

  // convenience getter for easy access to form fields
  get email() {
    return this.loginForm.get("email");
  }

  get password() {
    return this.loginForm.get("password");
  }

  submitted: boolean = false;

  onSubmit() {
    this.submitted = true;
    if (!this.loginForm.valid) {
      return;
    }

    this.isLoading = true;
    const data = this.loginForm.getRawValue();
    this._authService.login(data.email, data.password).subscribe(
      (data) => this.handleResponse(data),
      (error) => (this.error = error),
    );
  }

  handleResponse(data: any) {
    console.log("data", data);
    if (!data.success) {
      this.isLoading = false;
      console.log("Login Failed", data);

      if (data.error["details"]) {
        let errors: any = [];
        Object.keys(data.error["details"]).forEach((key, index) => {
          errors.push(data.error["details"][key]);
        });
        this.error = errors.join("<br />");
      } else {
        this.error = data.error.message;
      }
    } else {
      console.log("Login Successful");
    }
    // Note: If successful, it'll automatically trigger the subscriber fn
  }

  forgetPasswordTapped() {
    this.router.navigate([routeConstants.FORGET_PASSWORD]);
  }

  createAccount() {
    this.router.navigate([routeConstants.EMAIL_CONFIRMATION]);
  }

  goBackTapped() {
    location.href = "https://www.getkexy.com";
  }
}
