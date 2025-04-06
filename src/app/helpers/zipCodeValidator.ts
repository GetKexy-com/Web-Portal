import { ValidatorFn, AbstractControl } from "@angular/forms";

export function ZipCodeValidator(pattern: RegExp = undefined): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } => {
    let validNumber = false;
    try {
      validNumber = control.value.match(pattern);
    } catch (e) {}

    return validNumber ? null : { wrongNumber: { value: control.value } };
  };
}
