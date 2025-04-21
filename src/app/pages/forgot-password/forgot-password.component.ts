import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { HttpService } from '../../services/http.service';
import { routeConstants } from '../../helpers/routeConstants';
import {LoginLayoutComponent} from '../../layouts/login-layout/login-layout.component';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  imports: [
    LoginLayoutComponent,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  forgetPasswordForm: FormGroup;
  error;
  isWaitingFlag: boolean = false;

  constructor(
    private _authService: AuthService,
    private httpService: HttpService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    document.title = 'Forgot Password - KEXY Webportal';
    this._authService.loggedUserRedirectToProperDashboard();

    this.forgetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get email() {
    return this.forgetPasswordForm.get('email');
  }

  onSubmit() {
    if (this.forgetPasswordForm.valid) {
      this.isWaitingFlag = true;
      const data = this.forgetPasswordForm.getRawValue();
      console.log(data);

      this.httpService
        .post('user/requestPasswordRecoveryCode', data)
        .subscribe((response) => {
          if (response.success) {
            this.isWaitingFlag = false;
            this.router.navigate([routeConstants.RESET_PASSWORD], {
              queryParams: { email: data.email },
            });
          } else {
            this.isWaitingFlag = false;
            let message = 'There was an error!';
            if (
              response.error &&
              response.error.code &&
              response.error.message
            ) {
              message = response.error.message;
            }
            this.error = message;
          }
        });
    }
  }
}
