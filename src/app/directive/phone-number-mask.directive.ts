import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';
import { AsYouType, parsePhoneNumberFromString as parsePhoneNumber } from 'libphonenumber-js';

// Most common country codes: longer ones must come first
// so +1 doesn't greedily match before +1868 etc.
const COUNTRY_CODES = [
  '1868', '1869', '1876', '1242', '1246', '1264', '1268', '1284',
  '1340', '1345', '1441', '1473', '1649', '1664', '1670', '1671',
  '1684', '1721', '1758', '1767', '1784', '1787', '1809', '1829',
  '1849', '1868', '1876', '7840', '7940',
  '20', '27', '30', '31', '32', '33', '34', '36', '39', '40',
  '41', '43', '44', '45', '46', '47', '48', '49', '51', '52',
  '53', '54', '55', '56', '57', '58', '60', '61', '62', '63',
  '64', '65', '66', '7',  '81', '82', '84', '86', '90', '91',
  '92', '93', '94', '95', '98', '212', '213', '216', '218', '220',
  '221', '222', '223', '224', '225', '226', '227', '228', '229',
  '230', '231', '232', '233', '234', '235', '236', '237', '238',
  '239', '240', '241', '242', '243', '244', '245', '246', '247',
  '248', '249', '250', '251', '252', '253', '254', '255', '256',
  '257', '258', '260', '261', '262', '263', '264', '265', '266',
  '267', '268', '269', '290', '291', '297', '298', '299', '350',
  '351', '352', '353', '354', '355', '356', '357', '358', '359',
  '370', '371', '372', '373', '374', '375', '376', '377', '378',
  '380', '381', '382', '385', '386', '387', '389', '420', '421',
  '423', '500', '501', '502', '503', '504', '505', '506', '507',
  '508', '509', '590', '591', '592', '593', '594', '595', '596',
  '597', '598', '599', '670', '672', '673', '674', '675', '676',
  '677', '678', '679', '680', '681', '682', '683', '685', '686',
  '687', '688', '689', '690', '691', '692', '850', '852', '853',
  '855', '856', '880', '886', '960', '961', '962', '963', '964',
  '965', '966', '967', '968', '970', '971', '972', '973', '974',
  '975', '976', '977', '992', '993', '994', '995', '996', '998',
  '1',
];

@Directive({
  selector: '[appPhoneNumberMask]',
  standalone: true,
})
export class PhoneNumberMaskDirective {

  constructor(private control: NgControl) {
  }

  @HostListener('input', ['$event'])
  onInput(event: InputEvent): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.format(input.value);
    this.control.control?.setValue(formatted, { emitEvent: true });
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'];
    if (allowedKeys.includes(event.key)) return;

    // Allow '+' only at the very start
    if (event.key === '+') {
      if (value.length === 0) return;
      event.preventDefault();
      return;
    }

    const digits = value.replace(/\D/g, '');

    if (value.startsWith('+')) {
      const countryCode = this.detectCountryCode(digits);
      if (!countryCode) return; // still typing country code, don't block

      const localDigits = digits.slice(countryCode.length);
      if (localDigits.length >= 10) event.preventDefault();
    } else {
      if (digits.length >= 10) event.preventDefault();
    }
  }

  private format(value: string): string {
    if (value.startsWith('+')) {
      const digits = value.replace(/\D/g, '');
      const countryCode = this.detectCountryCode(digits);

      if (!countryCode) {
        // Still typing country code — only allow digits after '+'
        return '+' + digits.slice(0, 4);
      }

      const localDigits = digits.slice(countryCode.length);
      const localFormatted = this.formatLocal(localDigits);
      return localFormatted
        ? `+${countryCode} ${localFormatted}`
        : `+${countryCode}`;
    }

    return this.formatLocal(value);
  }

  private formatLocal(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);

    if (digits.length === 0)  return '';
    if (digits.length <= 3)   return `(${digits}`;
    if (digits.length <= 6)   return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  private detectCountryCode(digits: string): string | null {
    for (const code of COUNTRY_CODES) {
      if (digits.startsWith(code) && digits.length > code.length) {
        return code;
      }
    }
    return null; // not enough digits yet to determine code
  }

}

