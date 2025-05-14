import { Component, OnInit } from "@angular/core";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import { AuthService } from "src/app/services/auth.service";
import { Router } from "@angular/router";
import { environment } from "src/environments/environment";
import Swal from "sweetalert2";
import { countries } from "src/assets/countries";
import { states } from "src/assets/states";
import { COUNTRY_ADDRESS_POSTALS } from "src/app/helpers/countriesAddressPostal";
import { PhoneNumberValidator } from "src/app/helpers/phoneNumberValidator";
import { ZipCodeValidator } from "src/app/helpers/zipCodeValidator";
import { HttpService } from "src/app/services/http.service";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-edit-brand',
  imports: [
    BrandLayoutComponent,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './edit-brand.component.html',
  styleUrl: './edit-brand.component.scss'
})
export class EditBrandComponent implements OnInit {
  primaryForm: FormGroup;
  imageUrl: any = null;
  submitted = false;
  error;
  phoneCode = "+1";
  isWaitingFlag = false;
  userData;
  public countries = [];
  public states = [];
  zipCodeLabel = "Please enter a valid 5 digit Zip Code.";
  zipCodePlaceholder = "Zip Code";
  stateLabel = "Please Select State";
  newImageUploaded = false;
  public geolocationDetails: any = {
    street_address: "",
    city: "",
    country: "",
    state: "",
    zip_code: "",
  };

  supplier_id: number;
  zip_code: string;

  constructor(
    private _authService: AuthService,
    private httpService: HttpService,
    private fb: FormBuilder
  ) {}

  async ngOnInit() {
    this._authService.loggedUserRedirectToProperDashboard();
    document.title = "Edit Brand - KEXY Brand Webportal";

    this.userData = this._authService.userTokenValue;
    console.log("user data", this.userData);

    this.supplier_id = this.userData.supplier_id;

    // if (this.userData.company_logo) {
    //   this.imageUrl = environment.imageUrl + this.userData.company_logo;
    // }
    if (this.userData.supplier_logo) {
      this.imageUrl = environment.imageUrl + this.userData.supplier_logo;
    }

    this.zip_code = this.userData.zip_code;

    if (!this.userData.supplier_country) {
      this.userData.supplier_country = "US";
    }

    this.primaryForm = new FormGroup({
      name: new FormControl(
        this.userData.supplier_name,
        Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(64)])
      ),
      phone: new FormControl(
        this.userData.supplier_phone,
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(21),
          Validators.pattern(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/),
        ])
      ),
      country: new FormControl(
        { value: this.userData.supplier_country, disabled: true },  // Initially disabled
        [Validators.required, Validators.minLength(0), Validators.maxLength(21)]
      ),
      city: new FormControl(
        this.userData.supplier_city,
        Validators.compose([Validators.minLength(0), Validators.maxLength(21)])
      ),
      zip_code: new FormControl(
        this.zip_code,
        Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(21)])
      ),
      state: new FormControl(
        this.userData.supplier_state,
        Validators.compose([Validators.minLength(0), Validators.maxLength(21)])
      ),
    });
    this.getCountryList();

    if (!this.userData.supplier_country) {
      this.userData.supplier_country = "US";
    }
    this.getStateList(this.userData.supplier_country);
    console.log("initial data", this.primaryForm.getRawValue());
  }

  private getStateList(country) {
    this.geolocationDetails.state = "";
    this.states = states.filter((s) => s.countryCode === country);
    this.states = this.states.sort((a, b) => a.name.localeCompare(b.name));

    const userCountry = this.countries.filter((c) => {
      return c.isoCode == country;
    });
    if (userCountry[0]) {
      this.phoneCode = "+" + userCountry[0].phonecode;
    }

    if (country !== "US") {
      this.zipCodePlaceholder = "Postal Code";
      this.zipCodeLabel = "Please enter a valid Postal Code.";
      this.stateLabel = "Please Select Province";
    } else {
      this.zipCodePlaceholder = "Zip Code";
      this.zipCodeLabel = "Please enter a valid 5 digit Zip Code.";
      this.stateLabel = "Please Select State";
    }

    const zipCodeValidation = COUNTRY_ADDRESS_POSTALS.filter((c) => c.abbrev === country);

    this.primaryForm.setControl(
      "zip_code",
      this.fb.control(this.userData.zip_code, [ZipCodeValidator(zipCodeValidation[0].postal)])
    );
    this.primaryForm.setControl(
      "phone",
      this.fb.control(this.userData.supplier_phone, [PhoneNumberValidator(country)])
    );
  }

  private getCountryList() {
    // let countries = csc.getAllCountries();

    countries.forEach((c) => {
      if (c.isoCode === "NL" || c.isoCode === "GM") {
        c.name = c.name.replace("The", "");
      }
      if (c.isoCode === "CD") {
        c.name = "Congo, The Democratic Republic";
      }
    });

    this.countries = countries.filter((c) => {
      return !c.phonecode.includes("+1-");
    });
  }

  openFileDialog() {
    (document.querySelector(".profile-photo-file-input") as any).click();
  }

  fileSelected(e) {
    if (e.target.files.length === 0) {
      this.imageUrl = null;
      return;
    }
    const file = e.target.files[0];

    if (file.type.indexOf("image/") !== 0) {
      alert("Invalid Image - Please select a valid image");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imageUrl = reader.result;
      this.newImageUploaded = true;
    };
    reader.readAsDataURL(file);
  }

  async primaryFormSubmitted() {
    this.submitted = true;


    if (!this.primaryForm.valid) {
      console.log("submitted data", this.primaryForm);
      return;
    }

    const data = {
      logoImage: this.imageUrl,
      phoneCountryCode: this.phoneCode,
      zip_code: "",
      zipCodeList: [{}],
    };

    Object.assign(data, this.primaryForm.getRawValue());
    // let data = this.primaryForm.value;
    // zip code list changed
    data.zipCodeList = [data.zip_code];

    delete data.zip_code;

    if (this.newImageUploaded) {
      data.logoImage = this.imageUrl;
    } else {
      delete data.logoImage;
    }

    this.isWaitingFlag = true;
    this.httpService.patch(`company/${this.userData.supplier_id}`, data).subscribe((response) => {
      if (response.success) {
        console.log("success", response);
        const companyResponseData = response.data;
        this.isWaitingFlag = false;

        this.userData.supplier_name = companyResponseData.name;
        this.userData.supplier_phone = companyResponseData.phone;
        this.userData.supplier_country = companyResponseData.country;
        this.userData.supplier_city = companyResponseData.city;
        this.userData.supplier_state = companyResponseData.state;
        this.userData.supplier_street_address = companyResponseData.street_address;
        this.userData.zip_code = companyResponseData.zipCodeList[0];

        if (companyResponseData.logoImage) {
          this.userData.supplier_logo = companyResponseData.logoImage.name;
        }

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
}
