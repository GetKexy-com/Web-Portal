// import { Component, OnInit } from "@angular/core";
// import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
// import { AuthService } from "../../services/auth.service";
// import { HttpService } from "../../services/http.service";
// import { ActivatedRoute, Router } from "@angular/router";
// import { constants } from "../../helpers/constants";
// import { routeConstants } from "../../helpers/routeConstants";
// import {LoginLayoutComponent} from '../../layouts/login-layout/login-layout.component';
//
// @Component({
//   selector: 'app-email-confirmation',
//   imports: [
//     LoginLayoutComponent,
//     FormsModule,
//     ReactiveFormsModule
//   ],
//   templateUrl: './email-confirmation.component.html',
//   styleUrl: './email-confirmation.component.scss'
// })
// export class EmailConfirmationComponent {
//   params: any;
//   emailConfirmationFormGroup: FormGroup;
//   error;
//   urlEmail;
//   urlFirstName;
//   urlLastName;
//   urlCompanyName;
//   urlBlogSubscription: boolean = true;
//   isWaitingFlag: boolean = false;
//   termsAgreement: boolean = false;
//   marketingAgreement: boolean = true;
//   industry: string = "";
//   industries = constants.KEXY_SIGNUP_INDUSTRY_OPTIONS;
//
//   constructor(
//     private _authService: AuthService,
//     private httpService: HttpService,
//     private router: Router,
//     private fb: FormBuilder,
//     private activatedRoute: ActivatedRoute
//   ) {
//     this.activatedRoute.queryParams.subscribe((params) => {
//       this.urlEmail = params["email"];
//       this.urlFirstName = params["firstName"];
//       this.urlLastName = params["lastName"];
//       this.urlCompanyName = params["companyName"];
//       this.urlBlogSubscription = params["blogsubscription"];
//       this.params = params;
//     });
//   }
//
//   get phone() {
//     return this.emailConfirmationFormGroup.get("phone");
//   }
//
//   get email() {
//     return this.emailConfirmationFormGroup.get("email");
//   }
//
//   get accountType() {
//     return this.emailConfirmationFormGroup.get("accountType");
//   }
//
//   get referredByAffiliateCode() {
//     return this.emailConfirmationFormGroup.get("referredByAffiliateCode");
//   }
//
//   ngOnInit() {
//     this._authService.loggedUserRedirectToProperDashboard();
//     document.title = "Email Confirmation - KEXY Webportal";
//
//     this.emailConfirmationFormGroup = this.fb.group({
//       first_name: [this.urlFirstName, [Validators.required]],
//       last_name: [this.urlLastName, [Validators.required]],
//       accountType: ["", [Validators.required]],
//       email: [this.urlEmail, [Validators.required, Validators.email]],
//       referredByAffiliateCode: [""],
//     });
//
//     let subscriptionType = this.params["subscription"] ? this.params["subscription"] : "";
//     let reccuringType = this.params["reccuring"] ? this.params["reccuring"] : "";
//     localStorage.setItem(constants.SUBSCRIPTION_TYPE, subscriptionType);
//     localStorage.setItem(constants.RECCURING_TYPE, reccuringType);
//   }
//
//   get first_name() {
//     return this.emailConfirmationFormGroup.get("first_name");
//   }
//
//   get last_name() {
//     return this.emailConfirmationFormGroup.get("last_name");
//   }
//
//   handleSelectIndustry = (e) => {
//     const index = this.industries.findIndex(i => i.key === e.target.value);
//     if (index > -1) {
//       this.emailConfirmationFormGroup.patchValue({accountType: this.industries[index].type});
//       this.industry = this.industries[index].value;
//     }
//   }
//
//   submitted: boolean = false;
//   onSubmit() {
//     this.submitted = true;
//
//     if (!this.termsAgreement) {
//       return;
//     }
//
//     if (!this.emailConfirmationFormGroup.valid) {
//       return;
//     }
//     this.isWaitingFlag = true;
//     const data = this.emailConfirmationFormGroup.getRawValue();
//     data.blogsubscription = this.urlBlogSubscription;
//     data.marketing_communication = this.marketingAgreement;
//     data.industry = this.industry;
//     data.account_type = this.accountType.value;
//     localStorage.setItem(constants.ACCOUNT_TYPE, this.accountType.value);
//
//     this.httpService.post("user/sendConfirmationCode", data).subscribe((response) => {
//       if (response.success) {
//         this.isWaitingFlag = false;
//         localStorage.setItem("firstName", data.first_name);
//         localStorage.setItem("lastName", data.last_name);
//         localStorage.setItem(constants.INDUSTRY, data.industry);
//         localStorage.setItem('registerEmail', data.email);
//         if (this.urlCompanyName) {
//           localStorage.setItem("companyName", this.urlCompanyName);
//         }
//         localStorage.setItem("phone", data.phone);
//
//         let hubspotFormData = {
//           formGuid: constants.HUBSPOT_EMAIL_CONFIRMATION_FORMID,
//           fields: [
//             {
//               name: "email",
//               value: data.email,
//             },
//             {
//               name: "firstname",
//               value: data.first_name,
//             },
//             {
//               name: "lastname",
//               value: data.last_name,
//             },
//           ],
//           context: {
//             pageUri: location.href,
//             pageName: document.title,
//           },
//         };
//         this.httpService.post("user/formSubmitInHubspot", hubspotFormData).subscribe(async () => {
//           await this.router.navigate([routeConstants.REGISTER], {
//             queryParams: { email: data.email },
//           });
//         });
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
//   agreeTermsCondition($event: any) {
//     console.log($event.target.checked);
//     this.termsAgreement = $event.target.checked;
//   }
// }

import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpService } from '../../services/http.service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import { constants } from '../../helpers/constants';
import { routeConstants } from '../../helpers/routeConstants';
import { LoginLayoutComponent } from '../../layouts/login-layout/login-layout.component';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-email-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    LoginLayoutComponent,
    FormsModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './email-confirmation.component.html',
  styleUrl: './email-confirmation.component.scss'
})
export class EmailConfirmationComponent {
  // Signals for state management
  submitted = signal(false);
  isWaitingFlag = signal(false);
  termsAgreement = signal(false);
  marketingAgreement = signal(true);
  error = signal<string | null>(null);
  industry = signal('');
  industries = constants.KEXY_SIGNUP_INDUSTRY_OPTIONS;

  // Form controls
  emailConfirmationFormGroup: FormGroup;

  // Dependency injection
  private authService = inject(AuthService);
  private httpService = inject(HttpService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Convert query params to signal with automatic cleanup
    const queryParams = toSignal(
      this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)),
      { initialValue: {} }
    );

    // Initialize form with default values
    this.emailConfirmationFormGroup = this.fb.group({
      first_name: [queryParams()['firstName'], [Validators.required]],
      last_name: [queryParams()['lastName'], [Validators.required]],
      accountType: ['', [Validators.required]],
      email: [queryParams()['email'], [Validators.required, Validators.email]],
      referredByAffiliateCode: [''],
    });

    // Set initial values from query params
    effect(() => {
      const params = queryParams();
      this.marketingAgreement.set(params['blogsubscription'] !== 'false');

      const subscriptionType = params['subscription'] || '';
      const reccuringType = params['reccuring'] || '';
      localStorage.setItem(constants.SUBSCRIPTION_TYPE, subscriptionType);
      localStorage.setItem(constants.RECCURING_TYPE, reccuringType);
    });

    // Initialize component
    this.authService.loggedUserRedirectToProperDashboard();
    document.title = 'Email Confirmation - KEXY Webportal';
  }

  // Form control getters
  get first_name() {
    return this.emailConfirmationFormGroup.get('first_name');
  }

  get last_name() {
    return this.emailConfirmationFormGroup.get('last_name');
  }

  get email() {
    return this.emailConfirmationFormGroup.get('email');
  }

  get accountType() {
    return this.emailConfirmationFormGroup.get('accountType');
  }

  handleSelectIndustry(e: Event) {
    const target = e.target as HTMLSelectElement;
    const selectedIndustry = this.industries.find(i => i.key === target.value);

    if (selectedIndustry) {
      this.accountType?.patchValue(selectedIndustry.type);
      this.industry.set(selectedIndustry.value);
    }
  }

  onSubmit() {
    this.submitted.set(true);
    this.error.set(null);

    if (!this.termsAgreement()) {
      return;
    }

    if (!this.emailConfirmationFormGroup.valid) {
      return;
    }

    this.isWaitingFlag.set(true);
    const data = this.emailConfirmationFormGroup.getRawValue();
    data.blogsubscription = this.route.snapshot.queryParams['blogsubscription'];
    data.marketing_communication = this.marketingAgreement();
    data.industry = this.industry();
    data.account_type = this.accountType?.value;

    if (this.accountType?.value) {
      localStorage.setItem(constants.ACCOUNT_TYPE, this.accountType.value);
    }

    this.httpService.post('user/sendConfirmationCode', data).subscribe({
      next: (response) => {
        this.isWaitingFlag.set(false);

        if (response.success) {
          this.handleSuccessResponse(data);
        } else {
          this.handleErrorResponse(response);
        }
      },
      error: (err) => {
        this.isWaitingFlag.set(false);
        this.error.set(err.message || 'An error occurred');
      }
    });
  }

  private handleSuccessResponse(data: any) {
    localStorage.setItem('firstName', data.first_name);
    localStorage.setItem('lastName', data.last_name);
    localStorage.setItem(constants.INDUSTRY, data.industry);
    localStorage.setItem('registerEmail', data.email);

    const companyName = this.route.snapshot.queryParams['companyName'];
    if (companyName) {
      localStorage.setItem('companyName', companyName);
    }

    const hubspotFormData = {
      formGuid: constants.HUBSPOT_EMAIL_CONFIRMATION_FORMID,
      fields: [
        { name: 'email', value: data.email },
        { name: 'firstname', value: data.first_name },
        { name: 'lastname', value: data.last_name }
      ],
      context: {
        pageUri: location.href,
        pageName: document.title
      }
    };

    this.httpService.post('user/formSubmitInHubspot', hubspotFormData).subscribe({
      next: async () => {
        await this.router.navigate([routeConstants.REGISTER], {
          queryParams: { email: data.email }
        });
      },
      error: (err) => {
        console.error('Hubspot submission failed:', err);
        this.router.navigate([routeConstants.REGISTER], {
          queryParams: { email: data.email }
        });
      }
    });
  }

  private handleErrorResponse(response: any) {
    this.error.set(
      response.error?.message ||
      (response.error?.code ? `${response.error.code}: ${response.error.message}` : 'There was an error!')
    );
  }

  agreeTermsCondition(event: Event) {
    const target = event.target as HTMLInputElement;
    this.termsAgreement.set(target.checked);
  }
}
