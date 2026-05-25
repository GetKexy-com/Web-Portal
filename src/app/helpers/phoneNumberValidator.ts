import { ValidatorFn, AbstractControl } from "@angular/forms";
import { PhoneNumberUtil } from "google-libphonenumber";

const phoneNumberUtil = PhoneNumberUtil.getInstance();

export function PhoneNumberValidator(regionCode: string = undefined, emptyAllow = false): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } => {
    if (emptyAllow && control.value === '') return null;

    try {
      const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(control.value, regionCode);

      if (!phoneNumberUtil.isPossibleNumber(phoneNumber)) {
        return { wrongNumber: { message: 'Invalid phone number format' } };
      }

      if (!phoneNumberUtil.isValidNumber(phoneNumber)) {
        return { wrongNumber: { message: 'Phone number is not in use for this region' } };
      }

      return null;
    } catch (e) {
      return { wrongNumber: { message: 'Could not parse phone number' } };
    }
  };
}
