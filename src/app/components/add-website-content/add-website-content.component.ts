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
//   selector: 'app-add-website-content',
//   imports: [
//     ReactiveFormsModule,
//     ErrorMessageCardComponent
//   ],
//   templateUrl: './add-website-content.component.html',
//   styleUrl: './add-website-content.component.scss'
// })
// export class AddWebsiteContentComponent {
//   primaryForm: FormGroup;
//   userData;
//   supplierId;
//   public previousWebsites = [];
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
//     this.prospectingService.websites.subscribe((data) => {
//       if(data) {
//         this.previousWebsites = data;
//       }
//     });
//     this.setPrimaryForm();
//   }
//
//   states = [];
//   setPrimaryForm = () => {
//     this.primaryForm = new FormGroup({
//       website: new FormControl(
//         "",
//         Validators.compose([
//           Validators.required,
//           Validators.minLength(0),
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
//     this.previousWebsites.push(data.website);
//
//     const payload = {
//       supplier_id: this.supplierId,
//       websites: JSON.stringify(this.previousWebsites),
//     };
//     console.log("data", payload);
//
//     let res = await this.httpService.post("supplier/edit", payload).toPromise();
//     if (res.success) {
//       this.prospectingService.updateWebsites(this.previousWebsites);
//     }
//     this.activeCanvas.dismiss("Cross click");
//     this.isLoading = false;
//   };
// }

import { Component, OnInit, signal } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpService } from '../../services/http.service';
import { AuthService } from '../../services/auth.service';
import { ProspectingService } from '../../services/prospecting.service';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs';

@Component({
  selector: 'add-website-content',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorMessageCardComponent
  ],
  templateUrl: './add-website-content.component.html',
  styleUrl: './add-website-content.component.scss'
})
export class AddWebsiteContentComponent implements OnInit {
  primaryForm: FormGroup;
  userData: any;
  supplierId: string;
  previousWebsites = signal<string[]>([]);

  // Converted to signals
  isLoading = signal(false);
  submitted = signal(false);

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private httpService: HttpService,
    private authService: AuthService,
    private prospectingService: ProspectingService
  ) {}

  ngOnInit(): void {
    this.userData = this.authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    this.prospectingService.websites
      .pipe(take(1))
      .subscribe((data) => {
        if (data) {
          this.previousWebsites.set(data);
        }
      });

    this.initializeForm();
  }

  private initializeForm(): void {
    this.primaryForm = new FormGroup({
      website: new FormControl('', [
        Validators.required,
        Validators.minLength(0)
      ])
    });
  }

  formValidationErrorCheck(fieldName: string): boolean {
    const control = this.primaryForm.get(fieldName);
    return control ? control.invalid && (this.submitted() || control.dirty) : false;
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);

    if (!this.primaryForm.valid) {
      console.warn("Form is invalid", this.primaryForm);
      return;
    }

    this.isLoading.set(true);

    try {
      const formData = this.primaryForm.getRawValue();
      const updatedWebsites = [...this.previousWebsites(), formData.website];

      const payload = {
        websites: JSON.stringify(updatedWebsites)
      };

      const res = await this.httpService.patch(`company/${this.supplierId}`, payload).toPromise();

      if (res?.success) {
        this.previousWebsites.set(updatedWebsites);
        this.prospectingService.updateWebsites(updatedWebsites);
      }

      this.activeCanvas.dismiss("Cross click");
    } catch (error) {
      console.error("Error submitting website", error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
