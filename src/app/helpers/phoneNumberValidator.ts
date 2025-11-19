import { ValidatorFn, AbstractControl } from "@angular/forms";
import { PhoneNumberUtil } from "google-libphonenumber";

const phoneNumberUtil = PhoneNumberUtil.getInstance();

export function PhoneNumberValidator(regionCode: string = undefined, emptyAllow = false): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } => {
    if(emptyAllow && control.value === '') {
      return null;
    }
    let validNumber = false;
    try {
      //let userToken = JSON.parse(localStorage.getItem("userToken"));
      const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
        control.value, regionCode,
      );

      validNumber = phoneNumberUtil.isValidNumber(phoneNumber);
    } catch (e) {
    }

    return validNumber ? null : { "wrongNumber": { value: control.value } };
  };
}

export function PhoneNumberFormatter(number) {

  number = number.charAt(0) != 0 ? "0" + number : "" + number;
  let newStr = "";
  let i = 0;
  for (; i < Math.floor(number.length / 2) - 1; i++) {
    newStr = newStr + number.substr(i * 2, 2) + "-";
  }
  return newStr + number.substr(i * 2);

}
