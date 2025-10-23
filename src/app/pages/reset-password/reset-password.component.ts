import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpService } from '../../services/http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { routeConstants } from '../../helpers/routeConstants';
import {LoginLayoutComponent} from '../../layouts/login-layout/login-layout.component';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import { ErrorMessageCardComponent } from '../../components/error-message-card/error-message-card.component';

@Component({
  selector: 'app-reset-password',
  imports: [
    LoginLayoutComponent,
    ReactiveFormsModule,
    CommonModule,
    ErrorMessageCardComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  resetPasswordForm: FormGroup;
  email: string = '';
  error;
  isWaitingFlag: boolean = false;

  constructor(
    private _authService: AuthService,
    private httpService: HttpService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {}

  async ngOnInit() {
    document.title = 'Reset Password - KEXY Webportal';

    this._authService.loggedUserRedirectToProperDashboard();
    this.route.queryParams.subscribe((params) => {
      if (params && params['email'] && params['email'] !== '') {
        console.log(params['email']);
        this.email = params['email'];
      }
    });

    this.resetPasswordForm = this.fb.group({
      email: [this.email, [Validators.required, Validators.email]],
      recovery_code: ['', [Validators.required]],
      new_password: ['', Validators.required],
    });
  }

  get recovery_code() {
    return this.resetPasswordForm.get('recovery_code');
  }

  get new_password() {
    return this.resetPasswordForm.get('new_password');
  }

  onSubmit() {
    if (this.resetPasswordForm.valid) {
      this.isWaitingFlag = true;
      const data = this.resetPasswordForm.getRawValue();

      this.httpService
        .post('auth/resetPassword', {
          email: data.email,
          recoveryCode: data.recovery_code,
          password: data.new_password,
        })
        .subscribe((response) => {
          if (response.success) {
            alert('Password has been updated!');
            this.isWaitingFlag = false;
            this.router.navigate([routeConstants.LOGIN]);
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
