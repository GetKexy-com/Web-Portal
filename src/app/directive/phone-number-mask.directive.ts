import { Directive, HostListener } from "@angular/core";
import { NgControl } from "@angular/forms";
import { AsYouType, parsePhoneNumberFromString as parsePhoneNumber } from "libphonenumber-js";

@Directive({
  selector: "[appPhoneNumberMask]",
})
export class PhoneNumberMaskDirective {

  constructor(public ngControl: NgControl) {
  }

  @HostListener("ngModelChange", ["$event"])
  onModelChange(event) {
    this.onInputChange(event, false);
  }

  @HostListener("keydown.backspace", ["$event"])
  keydownBackspace(event) {
    this.onInputChange(event.target.value, true);
  }

  onInputChange(data, backspace) {
    try {
      console.log('data', data);
      let number = new AsYouType({ defaultCountry: "US" }).input(data);
      // let filterNUmber = parsePhoneNumber(new AsYouType().input(number));
      // number = "+" + filterNUmber.countryCallingCode + filterNUmber.formatNational();

      if (backspace && data[data.length-1] === ')') {
        // Explicitly handle backspace to remove the last character
        number = number.slice(0, -1); // Adjust as necessary for edge cases
      }

      this.ngControl.valueAccessor.writeValue(number);
    } catch (e) {

    }
  }

}

