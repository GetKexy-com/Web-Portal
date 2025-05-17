// import { Component, OnInit } from "@angular/core";
// import {FormControl, FormGroup, FormArray, Validators, FormBuilder, FormsModule} from "@angular/forms";
// import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
// import { AuthService } from "../../services/auth.service";
// import { DripCampaignService } from "../../services/drip-campaign.service";
// import Swal from "sweetalert2";
// import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
//
// @Component({
//   selector: 'add-suppression',
//   imports: [
//     FormsModule,
//     ErrorMessageCardComponent
//   ],
//   templateUrl: './add-suppression.component.html',
//   styleUrl: './add-suppression.component.scss'
// })
// export class AddSuppressionComponent {
//   primaryForm: FormGroup;
//   userData;
//   supplierId;
//   isLoading: boolean = false;
//   submitted: boolean = false;
//   userObjList = [
//     {
//       contact_first_name: "",
//       contact_last_name: "",
//       contact_email: "",
//     },
//   ];
//
//   constructor(
//     public activeCanvas: NgbActiveOffcanvas,
//     private _authService: AuthService,
//     private dripCampaignService: DripCampaignService,
//     private fb: FormBuilder,
//   ) {
//   }
//
//   ngOnInit(): void {
//     this.userData = this._authService.userTokenValue;
//     this.supplierId = this.userData.supplier_id;
//   }
//
//   peoplesList(): FormArray {
//     return this.primaryForm.get("peoplesList") as FormArray;
//   }
//
//   addPeopleRow() {
//     this.userObjList.push({
//       contact_first_name: "",
//       contact_last_name: "",
//       contact_email: "",
//     });
//   }
//
//   removePeople(i: number) {
//     if (this.userObjList.length === 1) return;
//     this.userObjList.splice(i, 1);
//   }
//
//   handleSubmit = async () => {
//     this.submitted = true;
//
//     if (!this.userObjList.some((i) => i.contact_first_name && i.contact_last_name && i.contact_email)) {
//       return;
//     }
//
//     this.isLoading = true;
//
//     const payload = {
//       supplier_id: this.supplierId,
//       suppression_users: this.userObjList,
//     };
//
//     try {
//       await this.dripCampaignService.addDripCampaignSuppressionUsers(payload);
//       const suppressionListApiPostData = this.dripCampaignService.suppressionListApiPostData;
//       await this.dripCampaignService.getSuppressionList(suppressionListApiPostData);
//       this.activeCanvas.dismiss("Cross click");
//       this.isLoading = false;
//     } catch (e) {
//       await Swal.fire("Error", e.message);
//     }
//   };
// }

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from 'src/app/services/auth.service';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import Swal from 'sweetalert2';
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';

interface SuppressionUser {
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
}

@Component({
  selector: 'add-suppression',
  standalone: true,
  imports: [
    FormsModule,
    ErrorMessageCardComponent,
    ErrorMessageCardComponent
  ],
  templateUrl: './add-suppression.component.html',
  styleUrl: './add-suppression.component.scss'
})
export class AddSuppressionComponent {
  // Services
  public activeCanvas = inject(NgbActiveOffcanvas);
  private authService = inject(AuthService);
  private dripCampaignService = inject(DripCampaignService);

  // State signals
  isLoading = signal(false);
  submitted = signal(false);
  userData = signal<any>(null);
  supplierId = signal<string>('');

  // User list
  userObjList = signal<SuppressionUser[]>([
    {
      contactFirstName: "",
      contactLastName: "",
      contactEmail: "",
    }
  ]);

  constructor() {
    this.userData.set(this.authService.userTokenValue);
    this.supplierId.set(this.userData().supplier_id);
  }

  addPeopleRow() {
    this.userObjList.update(users => [
      ...users,
      {
        contactFirstName: "",
        contactLastName: "",
        contactEmail: "",
      }
    ]);
  }

  removePeople(index: number) {
    if (this.userObjList().length === 1) return;
    this.userObjList.update(users => users.filter((_, i) => i !== index));
  }

  async handleSubmit() {
    this.submitted.set(true);

    // Validate at least one complete user entry
    const hasValidEntry = this.userObjList().some(user =>
      user.contactFirstName &&
      user.contactLastName &&
      user.contactEmail
    );

    if (!hasValidEntry) {
      return;
    }

    this.isLoading.set(true);

    const payload = {
      companyId: this.supplierId(),
      suppressionUsers: this.userObjList(),
    };

    try {
      await this.dripCampaignService.addDripCampaignSuppressionUsers(payload);
      const suppressionListApiPostData = this.dripCampaignService.suppressionListApiPostData;
      await this.dripCampaignService.getSuppressionList(suppressionListApiPostData);
      this.activeCanvas.dismiss("Cross click");
    } catch (error: any) {
      await Swal.fire("Error", error.message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
