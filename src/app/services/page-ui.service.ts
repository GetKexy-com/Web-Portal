import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { ProspectContact } from "../models/ProspectContact";
import { AbstractControl, ValidatorFn } from "@angular/forms";
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: "root",
})
export class PageUiService {
  // private purchaseOrderPageViewType = "";
  private selectedProspectingConv: ProspectContact;
  private prospectingSalesLeadCurrentStep: number = 1;

  constructor(private router: Router) {
  }

  getCurrentPageUrl = () => {
    return this.router.url;
  };

  // getPurchaseSalesLearCurrentStep() {
  //   return this.prospectingSalesLeadCurrentStep;
  // }

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

  public formatUSPhoneNumbers(text: string): string {
    // Match various US-like number patterns
    const phoneRegex = /(\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

    return text.replace(phoneRegex, (match) => {
      // Remove everything except digits
      let digits = match.replace(/\D/g, '');

      // Handle leading plus signs safely
      const hasPlus = match.trim().startsWith('+');

      // Remove redundant + or country code patterns
      if (digits.startsWith('1') && digits.length === 11) {
        digits = digits.slice(1);
      }

      // Only format if 10 digits
      if (digits.length === 10) {
        const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        return hasPlus ? `+1 ${formatted}` : `+1 ${formatted}`;
      }
      // Not a valid 10-digit US number → return unchanged
      return match;
    });
  }


  public setSelectedProspectingConv(conv: ProspectContact) {
    this.selectedProspectingConv = conv;
  }

  // public getSelectedProspectingConv() {
  //   return this.selectedProspectingConv;
  // }

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

  public showSweetAlert = async (title = "", text = "", icon: SweetAlertIcon = 'info') => {
    await Swal.fire({
      title,
      text,
      showConfirmButton: true,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      icon,
    });
    return Swal;
  };

  private isValidDomain(url) {
    const regex = /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\.[a-z]{2,}$/i;
    return regex.test(url.trim());
  }

  public urlValidate(url) {
    if (url) {
      url = this.normalizeUrl(url);
      if(this.isValidDomain(url)) {
        return url;
      }
    }
    return '';
  }

  private normalizeUrl(url) {
    url = url.trim();

    // If starts with http:// or https:// → OK
    if (/^https?:\/\//i.test(url)) return url;

    // If starts with www. but no protocol → add https://
    if (/^www\./i.test(url)) return url;

    // Otherwise → force it to have www.
    return 'www.' + url;
  }
}
