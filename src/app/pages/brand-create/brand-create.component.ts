// import { Component, OnInit } from "@angular/core";
// import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
// import { AuthService } from "src/app/services/auth.service";
// import { ActivatedRoute, Router } from "@angular/router";
// import { COUNTRY_ADDRESS_POSTALS } from "src/app/helpers/countriesAddressPostal";
// import { PhoneNumberValidator } from "src/app/helpers/phoneNumberValidator";
// import { constants } from "src/app/helpers/constants";
// import { countries } from "src/assets/countries";
// import { states } from "src/assets/states";
// import { HttpService } from "src/app/services/http.service";
// import { routeConstants } from "src/app/helpers/routeConstants";
// import {LoginLayoutComponent} from '../../layouts/login-layout/login-layout.component';
//
// @Component({
//   selector: 'app-brand-create',
//   imports: [
//     LoginLayoutComponent,
//     ReactiveFormsModule
//   ],
//   templateUrl: './brand-create.component.html',
//   styleUrl: './brand-create.component.scss'
// })
// export class BrandCreateComponent {
//   constructor(
//     private _authService: AuthService,
//     private httpService: HttpService,
//     private router: Router,
//     private fb: FormBuilder,
//   ) {
//   }
//
//   primaryForm: FormGroup;
//   job_title = "";
//   imageUrl = null;
//   isFree = false;
//   subscriptionType = "";
//   error;
//   companyName: string = "";
//   phoneCode = "+1";
//   isWaitingFlag = false;
//   showAddressFields = false;
//   public countries = [
//     { isoCode: "US", name: "United States", phonecode: "1" },
//     { isoCode: "CA", name: "Canada", phonecode: "1" },
//   ];
//   public states = [];
//   selectedCountry: any;
//   stateLabel = "Please Select State";
//   public geolocationDetails: any = {
//     street_address: "",
//     city: "",
//     country: "",
//     state: "",
//     zip_code_list: "",
//   };
//
//   submitted = false;
//
//   zipCodeLabel = "Please enter a valid 5 digit Zip Code.";
//   zipCodePlaceholder = "Zip Code";
//   industry = "";
//
//   async ngOnInit() {
//     this._authService.loggedUserRedirectToProperDashboard();
//     document.title = "Brand Create - KEXY Brand Portal";
//
//     const jobTitleValue = localStorage.getItem("jobTitle");
//     if (jobTitleValue === "Admin") {
//       // hide address fields
//       this.showAddressFields = true;
//     }
//
//     let urlCompanyName = localStorage.getItem("companyName");
//     if (urlCompanyName) {
//       this.companyName = urlCompanyName;
//     }
//
//     let industry = localStorage.getItem("industry");
//     if (industry) {
//       this.industry = industry;
//     }
//
//     this.primaryForm = new FormGroup({
//       side: new FormControl("BOH", Validators.compose([Validators.required])),
//       accountType: new FormControl(""),
//       name: new FormControl(
//         this.companyName,
//         Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(64)]),
//       ),
//       industry: new FormControl(
//         this.industry,
//         Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(100)]),
//       ),
//       phone: new FormControl(
//         "",
//         Validators.compose([
//           Validators.required,
//           Validators.minLength(0),
//           Validators.maxLength(21),
//           Validators.pattern(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/),
//         ]),
//       ),
//       street_address: new FormControl(
//         "",
//       ),
//       country: new FormControl(
//         constants.US,
//       ),
//       city: new FormControl(
//         "",
//       ),
//       state: new FormControl(
//         "",
//       ),
//       zip_code_list: new FormControl(
//         "",
//         Validators.compose([
//           Validators.required,
//           Validators.minLength(0),
//           Validators.maxLength(5),
//           Validators.pattern(/^[0-9]{5}(?:-[0-9]{4})?$/),
//         ]),
//       ),
//     });
//
//     this.subscriptionType = localStorage.getItem(constants.SUBSCRIPTION_TYPE);
//     if (!this.subscriptionType) {
//       localStorage.setItem(constants.SUBSCRIPTION_TYPE, constants.FREE_SUPPLIER);
//       localStorage.setItem(constants.RECCURING_TYPE, "month");
//       this.subscriptionType = localStorage.getItem(constants.SUBSCRIPTION_TYPE);
//     }
//
//     if (this.subscriptionType === constants.FREE_SUPPLIER) {
//       this.isFree = true;
//     }
//
//     this.job_title = localStorage.getItem("jobTitle");
//
//     this.selectedCountry = constants.US;
//     this.onCountrySelect(this.selectedCountry);
//   }
//
//   async onSubmit() {
//     this.submitted = true;
//
//     if (!this.primaryForm.valid) {
//       console.log(this.primaryForm.value);
//       return;
//     }
//     console.log("is it here");
//
//     this.isWaitingFlag = true;
//
//     const data = {
//       logo_image: this.imageUrl,
//       job_title: this.job_title || "Admin",
//       phone_country_code: this.phoneCode,
//       industry: localStorage.getItem(constants.INDUSTRY),
//       zip_code_list: [{}],
//     };
//
//     Object.assign(data, this.primaryForm.getRawValue());
//
//     // zip code list changed
//     const zip_code_data = [{ zip_code: data.zip_code_list }];
//     data.zip_code_list = zip_code_data;
//     this.httpService.post("supplier/create", data).subscribe(async (response) => {
//       if (response.success) {
//         console.log(response);
//         const supplier_id = response.data.supplier_id;
//         localStorage.setItem("supplierId", supplier_id);
//         this.isWaitingFlag = false;
//         localStorage.removeItem(constants.INDUSTRY);
//
//         const hubspotFormData = {
//           formGuid: constants.HUBSPOT_RESTAURANT_CREATE_FORMID,
//           fields: [
//             {
//               name: "email",
//               value: localStorage.getItem("registerEmail"),
//             },
//           ],
//           context: {
//             pageUri: location.href,
//             pageName: document.title,
//           },
//         };
//         this.httpService.post("user/formSubmitInHubspot", hubspotFormData).subscribe((response) => {
//         });
//
//         this.router.navigate([routeConstants.BRAND.SUBSCRIPTION_SELECTION]);
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
//     (document.querySelector(".profile-photo-file-input") as any).click();
//   }
//
//   fileSelected(e) {
//     if (e.target.files.length === 0) {
//       this.imageUrl = null;
//       return;
//     }
//     const file = e.target.files[0];
//
//     if (file.type.indexOf("image/") !== 0) {
//       alert("Invalid Image - Please select a valid image");
//       return;
//     }
//
//     const reader = new FileReader();
//     reader.onload = () => {
//       this.imageUrl = reader.result;
//     };
//     reader.readAsDataURL(file);
//   }
//
//   onCountrySelect(country) {
//     this.getStateList(country);
//
//     this.primaryForm.setControl("phone", this.fb.control("", [PhoneNumberValidator(country)]));
//
//     const zipCodeValidation = COUNTRY_ADDRESS_POSTALS.filter((c) => c.abbrev === country);
//
//     if (zipCodeValidation[0].postal) {
//       this.primaryForm.setControl(
//         "zip_code_list",
//         this.fb.control("", [Validators.required, Validators.pattern(zipCodeValidation[0].postal)]),
//       );
//     } else {
//       this.primaryForm.setControl("zip_code_list", this.fb.control("", []));
//     }
//   }
//
//   private getStateList(country) {
//     this.geolocationDetails.state = "";
//
//     this.states = states.filter((s) => s.countryCode === country);
//     this.states = this.states.sort((a, b) => a.name.localeCompare(b.name));
//     console.log(country, states);
//
//     const userCountry = this.countries.filter((c) => {
//       return c.isoCode == country;
//     });
//     this.phoneCode = "+" + userCountry[0].phonecode;
//
//     if (country !== "US") {
//       this.zipCodePlaceholder = "Postal Code";
//       this.zipCodeLabel = "Please enter a valid Postal Code.";
//       this.stateLabel = "Please Select Province";
//     } else {
//       this.zipCodePlaceholder = "Zip Code";
//       this.zipCodeLabel = "Please enter a valid 5 digit Zip Code.";
//       this.stateLabel = "Please Select State";
//     }
//   }
// }

import {Component, inject, OnInit, signal} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpService } from '../../services/http.service';
import { COUNTRY_ADDRESS_POSTALS } from '../../helpers/countriesAddressPostal';
import { PhoneNumberValidator } from '../../helpers/phoneNumberValidator';
import { constants } from '../../helpers/constants';
import { routeConstants } from '../../helpers/routeConstants';
import { LoginLayoutComponent } from '../../layouts/login-layout/login-layout.component';
import { CommonModule } from '@angular/common';
import { states } from "src/assets/states";
import {PhoneNumberMaskDirective} from '../../directive/phone-number-mask.directive';
// import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-brand-create',
  standalone: true,
  imports: [
    CommonModule,
    LoginLayoutComponent,
    ReactiveFormsModule,
    PhoneNumberMaskDirective,
    // FontAwesomeModule
  ],
  templateUrl: './brand-create.component.html',
  styleUrl: './brand-create.component.scss'
})
export class BrandCreateComponent implements OnInit {
  primaryForm: FormGroup;
  imageUrl = signal<string | null>(null);
  isFree = signal<boolean>(false);
  error = signal<string>('');
  companyName = signal<string>('');
  phoneCode = signal<string>('+1');
  isWaitingFlag = signal<boolean>(false);
  showAddressFields = signal<boolean>(false);
  countries = signal<any[]>([]);
  states = signal<any[]>([]);
  selectedCountry = signal<string>(constants.US);
  stateLabel = signal<string>('Please Select State');
  zipCodeLabel = signal<string>('Please enter a valid 5 digit Zip Code.');
  zipCodePlaceholder = signal<string>('Zip Code');
  submitted = signal<boolean>(false);
  industry = signal<string>('');
  subscriptionType = signal<string>('');
  job_title = signal<string>('');

  geolocationDetails = signal<any>({
    street_address: '',
    city: '',
    country: '',
    state: '',
    zip_code_list: ''
  });

  private _authService = inject(AuthService);
  private router = inject(Router);
  private httpService = inject(HttpService);
  private fb = inject(FormBuilder);

  constructor() {
    this.primaryForm = this.fb.group({
      name: [
        this.companyName(),
        [Validators.required, Validators.minLength(0), Validators.maxLength(64)]
      ],
      industry: [
        this.industry(),
        [Validators.required, Validators.minLength(0), Validators.maxLength(100)]
      ],
      phone: [
        '',
        [
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(21),
          Validators.pattern(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/)
        ]
      ],
      country: [constants.US],
      city: [''],
      state: [''],
      zipCodeList: [
        '',
        [
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(5),
          Validators.pattern(/^[0-9]{5}(?:-[0-9]{4})?$/)
        ]
      ]
    });
  }

  async ngOnInit() {
    this._authService.loggedUserRedirectToProperDashboard();
    document.title = 'Brand Create - KEXY Brand Portal';

    const jobTitleValue = localStorage.getItem('jobTitle');
    if (jobTitleValue === 'Admin') {
      this.showAddressFields.set(true);
    }

    const urlCompanyName = localStorage.getItem('companyName');
    if (urlCompanyName) {
      this.companyName.set(urlCompanyName);
      this.primaryForm.patchValue({ name: urlCompanyName });
    }

    const industry = localStorage.getItem('industry');
    if (industry) {
      this.industry.set(industry);
      this.primaryForm.patchValue({ industry });
    }

    this.subscriptionType.set(localStorage.getItem(constants.SUBSCRIPTION_TYPE) ?? '');
    if (!this.subscriptionType()) {
      localStorage.setItem(constants.SUBSCRIPTION_TYPE, constants.FREE_SUPPLIER);
      localStorage.setItem(constants.RECCURING_TYPE, 'month');
      this.subscriptionType.set(localStorage.getItem(constants.SUBSCRIPTION_TYPE) ?? '');
    }

    if (this.subscriptionType() === constants.FREE_SUPPLIER) {
      this.isFree.set(true);
    }

    this.job_title.set(localStorage.getItem('jobTitle') ?? '');

    this.countries.set([
      { isoCode: 'US', name: 'United States', phonecode: '1' },
      { isoCode: 'CA', name: 'Canada', phonecode: '1' }
    ]);

    this.onCountrySelect(this.selectedCountry());
  }

  async onSubmit() {
    this.submitted.set(true);

    if (!this.primaryForm.valid) {
      console.log(this.primaryForm);
      return;
    }

    this.isWaitingFlag.set(true);

    const data = {
      logoImage: this.imageUrl(),
      jobTitle: this.job_title() || 'Admin',
      phoneCountryCode: this.phoneCode(),
      industry: localStorage.getItem(constants.INDUSTRY),
      zipCodeList: [{}],
    };
    Object.assign(data, this.primaryForm.getRawValue());
    data.zipCodeList = [{ zip_code: data.zipCodeList }];

    try {
      const response = await this.httpService.post('company', data).toPromise();
      if (response?.success) {
        localStorage.setItem('supplierId', response.data.company_id);
        this.isWaitingFlag.set(false);
        localStorage.removeItem(constants.INDUSTRY);

        // const hubspotFormData = {
        //   formGuid: constants.HUBSPOT_RESTAURANT_CREATE_FORMID,
        //   fields: [
        //     {
        //       name: 'email',
        //       value: localStorage.getItem('registerEmail')
        //     }
        //   ],
        //   context: {
        //     pageUri: location.href,
        //     pageName: document.title
        //   }
        // };

        // this.httpService.post('user/formSubmitInHubspot', hubspotFormData).subscribe();

        await this.router.navigate([routeConstants.BRAND.SUBSCRIPTION_SELECTION]);
      } else {
        this.handleError(response);
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  private handleError(error: any) {
    this.isWaitingFlag.set(false);
    let message = 'There was an error!';
    if (error?.error?.code && error?.error?.message) {
      message = error.error.message;
    }
    this.error.set(message);
  }

  openFileDialog() {
    const fileInput = document.querySelector('.profile-photo-file-input') as HTMLInputElement;
    fileInput.click();
  }

  fileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) {
      this.imageUrl.set(null);
      return;
    }

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Invalid Image - Please select a valid image');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imageUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  onCountrySelect(country: string) {
    this.selectedCountry.set(country);
    this.getStateList(country);

    this.primaryForm.setControl('phone', this.fb.control('', [PhoneNumberValidator(country)]));

    const zipCodeValidation = COUNTRY_ADDRESS_POSTALS.find(c => c.abbrev === country);
    if (zipCodeValidation?.postal) {
      this.primaryForm.setControl(
        'zipCodeList',
        this.fb.control('', [Validators.required, Validators.pattern(zipCodeValidation.postal)])
      );
    } else {
      this.primaryForm.setControl('zipCodeList', this.fb.control('', []));
    }
  }

  private getStateList(country: string) {
    // Reset the state in geolocationDetails
    this.geolocationDetails.update(details => ({ ...details, state: '' }));

    // Filter and sort states
    const filteredStates = states
      .filter(s => s.countryCode === country)
      .sort((a, b) => a.name.localeCompare(b.name));

    this.states.set(filteredStates);
    console.log(country, states);

    // Update phone code
    const userCountry = this.countries().find(c => c.isoCode === country);
    if (userCountry) {
      this.phoneCode.set('+' + userCountry.phonecode);
    }

    // Update labels based on country
    if (country !== 'US') {
      this.zipCodePlaceholder.set('Postal Code');
      this.zipCodeLabel.set('Please enter a valid Postal Code.');
      this.stateLabel.set('Please Select Province');
    } else {
      this.zipCodePlaceholder.set('Zip Code');
      this.zipCodeLabel.set('Please enter a valid 5 digit Zip Code.');
      this.stateLabel.set('Please Select State');
    }
  }

  // private getStateList(country: string) {
  //   this.geolocationDetails.update(details => ({ ...details, state: '' }));
  //
  //   // In a real app, you would fetch states for the selected country
  //   this.states.set([]); // Reset states
  //
  //   const userCountry = this.countries().find(c => c.isoCode === country);
  //   if (userCountry) {
  //     this.phoneCode.set('+' + userCountry.phonecode);
  //   }
  //
  //   if (country !== 'US') {
  //     this.zipCodePlaceholder.set('Postal Code');
  //     this.zipCodeLabel.set('Please enter a valid Postal Code.');
  //     this.stateLabel.set('Please Select Province');
  //   } else {
  //     this.zipCodePlaceholder.set('Zip Code');
  //     this.zipCodeLabel.set('Please enter a valid 5 digit Zip Code.');
  //     this.stateLabel.set('Please Select State');
  //   }
  // }
}
