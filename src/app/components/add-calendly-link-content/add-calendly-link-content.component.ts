// import { Component, OnInit } from "@angular/core";
// import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
// import { HttpService } from "src/app/services/http.service";
// import { AuthService } from "src/app/services/auth.service";
// import { ProspectingService } from "src/app/services/prospecting.service";
// import {ReactiveFormsModule} from '@angular/forms';
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
//
// @Component({
//   selector: 'app-add-calendly-link-content',
//   imports: [
//     ReactiveFormsModule,
//     ErrorMessageCardComponent
//   ],
//   templateUrl: './add-calendly-link-content.component.html',
//   styleUrl: './add-calendly-link-content.component.scss'
// })
// export class AddCalendlyLinkContentComponent {
//   primaryForm: FormGroup;
//   userData;
//   supplierId;
//   public previousLinks = [];
//
//   constructor(
//     public activeCanvas: NgbActiveOffcanvas,
//     private fb: FormBuilder,
//     private httpService: HttpService,
//     private _authService: AuthService,
//     private prospectingService: ProspectingService
//   ) {}
//
//   ngOnInit(): void {
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//     this.prospectingService.calendlyLinks.subscribe((links) => {
//       this.previousLinks = links;
//     });
//     this.setPrimaryForm();
//   }
//
//   states = [];
//   setPrimaryForm = () => {
//     this.primaryForm = new FormGroup({
//       calendly_link: new FormControl(
//         "",
//         Validators.compose([
//           Validators.required,
//           Validators.minLength(0),
//           Validators.maxLength(500),
//           //Validators.pattern("^[a-zA-Z- ]+$"),
//         ])
//       ),
//     });
//   };
//
//   formValidationErrorCheck = (fieldName: string) => {
//     return (
//       this.primaryForm.controls[fieldName].invalid && (this.submitted || this.primaryForm.controls[fieldName].dirty)
//     );
//   };
//
//   isLoading: boolean = false;
//   submitted: boolean = false;
//   onSubmit = async () => {
//     this.submitted = true;
//     if (!this.primaryForm.valid) {
//       console.log("primaryForm", this.primaryForm);
//       return false;
//     }
//     this.isLoading = true;
//     let data = this.primaryForm.getRawValue();
//     this.previousLinks.push(data.calendly_link);
//
//     const payload = {
//       supplier_id: this.supplierId,
//       calendly_links: JSON.stringify(this.previousLinks),
//     };
//     console.log("data", payload);
//
//     let res = await this.httpService.post("supplier/edit", payload).toPromise();
//     if (res.success) {
//       this.prospectingService.updateCalendlyLinks(this.previousLinks);
//     }
//     this.activeCanvas.dismiss("Cross click");
//     this.isLoading = false;
//   };
// }


import { Component, OnInit, signal } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpService } from '../../services/http.service';
import { AuthService } from '../../services/auth.service';
import { ProspectingService } from '../../services/prospecting.service';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'add-calendly-link-content',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorMessageCardComponent
  ],
  templateUrl: './add-calendly-link-content.component.html',
  styleUrl: './add-calendly-link-content.component.scss'
})
export class AddCalendlyLinkContentComponent implements OnInit {
  primaryForm: FormGroup;
  userData: any;
  supplierId: string;
  previousLinks = signal<any[]>([]);

  // Converted to signals for better reactivity
  isLoading = signal(false);
  submitted = signal(false);

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private fb: FormBuilder,
    private httpService: HttpService,
    private authService: AuthService,
    private prospectingService: ProspectingService
  ) {}

  ngOnInit(): void {
    this.userData = this.authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    this.prospectingService.calendlyLinks.subscribe((links) => {
      this.previousLinks.set(links);
    });

    this.setPrimaryForm();
  }

  setPrimaryForm(): void {
    this.primaryForm = this.fb.group({
      calendly_link: ['', [
        Validators.required,
        Validators.minLength(0),
        Validators.maxLength(500)
      ]]
    });
  }

  formValidationErrorCheck(fieldName: string): boolean {
    return (
      this.primaryForm.controls[fieldName].invalid &&
      (this.submitted() || this.primaryForm.controls[fieldName].dirty)
    );
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);

    if (!this.primaryForm.valid) {
      console.log("primaryForm", this.primaryForm);
      return;
    }

    this.isLoading.set(true);

    const formData = this.primaryForm.getRawValue();
    this.previousLinks.update(links => [...links, formData.calendly_link]);

    const payload = {
      calendlyLinks: JSON.stringify(this.previousLinks())
    };

    try {
      const res = await this.httpService.patch(`company/${this.supplierId}`, payload).toPromise();
      if (res.success) {
        this.prospectingService.updateCalendlyLinks(this.previousLinks());
      }
      this.activeCanvas.dismiss("Cross click");
    } finally {
      this.isLoading.set(false);
    }
  }
}
