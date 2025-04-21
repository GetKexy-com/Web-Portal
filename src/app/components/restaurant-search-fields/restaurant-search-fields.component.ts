import { Component, Input, OnInit, ViewChild } from "@angular/core";
import { constants } from "src/app/helpers/constants";
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'restaurant-search-fields',
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './restaurant-search-fields.component.html',
  styleUrl: './restaurant-search-fields.component.scss'
})
export class RestaurantSearchFieldsComponent {
  @Input() selectedCountry = constants.UNITED_STATES;
  @Input() selectedRestaurantSearchType;
  @Input() getCityListOrZipcodeValue;
  @Input() removeCityListOrZipcodeValue;
  @Input() zipCodeList;
  @Input() cityList;
  @Input() stateList;
  @Input() openStateSelectionModal;
  @Input() handleAddCityOrZipcodeName;
  @Input() handleRemoveCityOrZipcodeName;
  constants = constants;
  cityOrZipcode;

  constructor() {
  }

  ngOnInit() {
  }

  getPlaceholder = () => {
    // if (this.selectedRestaurantSearchType === constants.CITY) {
    //   if (this.selectedCountry === constants.UNITED_STATES) return "Ex: San Diego, Los Angeles";
    //   if (this.selectedCountry === constants.CANADA) return "Ex: Vancouver, Toronto";
    // }
    // return "Ex: 94506, 94507";

    if (this.selectedRestaurantSearchType === constants.CITY) return "Please enter city here";
    return "Please enter zip/postal code here";
  };

  removeCityOrZipcode = (value) => {
    this.removeCityListOrZipcodeValue(value);
  };

  handleStateProvinceInputClick = () => {
    this.openStateSelectionModal();
  };

  handleInputChange = (e) => {
    if (this.cityOrZipcode.includes(",")) {
      this.handleAddCityOrZipcodeName(this.cityOrZipcode.slice(0, this.cityOrZipcode.length - 1));
      this.cityOrZipcode = "";
    }
  };

  handleKeydownPress = (event) => {
    if (event.key === "Delete" || event.key === "Backspace") {
      if (!this.cityOrZipcode) {
        this.handleRemoveCityOrZipcodeName();
      }
    }
  };

  stringCapitalize = (str) => {
    const arr = str.split(" ");
    for (var i = 0; i < arr.length; i++) {
      arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
    }
    const str2 = arr.join(" ");
    return str2;
  };

  loading = false;
  submitBtnClick = async () => {
    this.loading = true;
    const cityZip = this.cityOrZipcode;
    this.cityOrZipcode = "";
    if (this.selectedRestaurantSearchType === constants.STATE_PROVINCE) {
      console.log(this.loading);
      await this.getCityListOrZipcodeValue("");
      this.loading = false;
      return;
    }
    let cityOrZipcodeList = [];
    if (this.selectedRestaurantSearchType === constants.ZIP_POSTAL_CODE) {
      cityOrZipcodeList = this.zipCodeList;
    } else if (this.selectedRestaurantSearchType === constants.CITY) {
      cityOrZipcodeList = this.cityList;
    }
    // if (!cityZip && cityOrZipcodeList.length < 1) {
    //   this.loading = false;
    //   return;
    // }
    await this.getCityListOrZipcodeValue(cityZip ? cityZip : "");
    this.loading = false;
  };
}
