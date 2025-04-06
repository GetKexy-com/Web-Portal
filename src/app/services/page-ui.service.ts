import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { ProspectContact } from "../models/ProspectContact";
import { AbstractControl, ValidatorFn } from "@angular/forms";
import Swal from "sweetalert2";

@Injectable({
  providedIn: "root",
})
export class PageUiService {
  private purchaseOrderPageViewType = "";
  private selectedProspectingConv: ProspectContact;
  private prospectingSalesLeadCurrentStep: number = 1;

  constructor(private router: Router) {
  }

  getCurrentPageUrl = () => {
    return this.router.url;
  };

  getPurchaseSalesLearCurrentStep() {
    return this.prospectingSalesLeadCurrentStep;
  }

  setProspectingSalesLeadCurrentStep(step) {
    this.prospectingSalesLeadCurrentStep = step;
  }

  private __checkDateValue(str, max) {
    if (str.charAt(0) !== "0" || str == "00") {
      let num = parseInt(str);
      if (isNaN(num) || num <= 0 || num > max) num = 1;
      str = num > parseInt(max.toString().charAt(0)) && num.toString().length == 1 ? "0" + num : num.toString();
    }
    return str;
  }

  public formatDate(date) {
    let input = date;
    if (/\D\/$/.test(input)) input = input.substr(0, input.length - 3);
    let values = input.split("/").map(function(v) {
      return v.replace(/\D/g, "");
    });
    if (values[0]) values[0] = this.__checkDateValue(values[0], 12);
    if (values[1]) values[1] = this.__checkDateValue(values[1], 31);

    const output = values.map(function(v, i) {
      return v.length == 2 && i < 2 ? v + "/" : v;
    });

    return output.join("").substr(0, 14);
  }

  public setSelectedProspectingConv(conv: ProspectContact) {
    this.selectedProspectingConv = conv;
  }

  public getSelectedProspectingConv() {
    return this.selectedProspectingConv;
  }

  public updateGleapIcon(shouldShow) {
    setTimeout(() => {
      const supportDiv = <HTMLElement>document.querySelector(".bb-feedback-button");
      supportDiv.style.display = shouldShow ? "block" : "none";
    }, 1000);
  }

  public validateUrl(value: string): boolean {
    try {
      const fccUrl = new URL(value);
      return true;
    } catch (ex) {
      return false;
    }
  }

  public capitalizeFirstLetter = (string) => {
    if (!string) return string; // Handle empty or undefined strings
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  public customEmailValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // Ensures a valid TLD
      const valid = emailRegex.test(control.value);
      return valid ? null : { invalidEmail: true };
    };
  }

  public showSweetAlertLoading = () => {
    Swal.fire({
      title: "",
      text: "Please wait...",
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    return Swal;
  };
}
