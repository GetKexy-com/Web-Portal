import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgbModal, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import Swal from "sweetalert2";
import { Router } from "@angular/router";
import { AuthService } from "src/app/services/auth.service";
import { HttpService } from "src/app/services/http.service";
import { constants } from "src/app/helpers/constants";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
import {CommonModule} from '@angular/common';
import {
  InvitePeopleCanvasComponent,
  SentInvitation,
} from '../../components/invite-people-canvas/invite-people-canvas.component';

@Component({
  selector: 'app-brand-invite-people',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    FormsModule,
    CommonModule,
  ],
  templateUrl: './brand-invite-people.component.html',
  styleUrl: './brand-invite-people.component.scss'
})
export class BrandInvitePeopleComponent {
  error;
  isWaitingFlag: boolean = false;
  isLoadingListFlag: boolean = false;
  userData;
  subscription;
  isAdmin: boolean = false;
  invitedUsersList = [];

  selectedEmployeeForRoleChange;
  roleChangeModalRef;
  changedRoleOfEmployee = "";

  userDeleteModalRef;
  selectedUserAccount = "";
  filteredSupplierEmployees;
  deleteAttemptUserIndex;
  deleteAttemptUserId;
  deleteAttemptUserEmail;
  selectedSupplierEmployees;
  selectedSupplierId;
  employeeList = [];
  cleanUserList = [];
  errorMessage;

  constructor(
    private _authService: AuthService,
    private httpService: HttpService,
    private router: Router,
    private modal: NgbModal,
    private ngbOffcanvas: NgbOffcanvas,
  ) {}

  async ngOnInit() {
    this._authService.loggedUserRedirectToProperDashboard();
    document.title = "Invite Users - KEXY Brand Webportal";

    this.userData = this._authService.userTokenValue;
    this.isAdmin = this.userData.isAdmin;
    this.selectedSupplierId = this.userData.supplier_id;
    this.subscription = await this._authService.getSubscriptionData();
    await this.userOrganaizationApiCall();
    await this.getUsersList();
    await this.getAllEmployeeApiCall();
  }

  private async getUsersList() {
    let data = {
      restaurant_id: "",
      distributor_id: "",
      supplier_id: this.userData.supplier_id,
    };

    this.isLoadingListFlag = true;
    let response = await this.httpService.post("user/listInvitations", data).toPromise();
    if (response.success) {
      this.cleanUserList = [];
      this.isLoadingListFlag = false;
      this.invitedUsersList = response.data.employee;
      this.cleanUserList.push(this.employeeList[0]);
      this.invitedUsersList.forEach((user) => {
        const matched = this.employeeList.find((e) => user.email === e.user.email);
        if (matched) {
          this.cleanUserList.push(matched);
        } else {
          this.cleanUserList.push(user);
        }
      });
    }
  }

  async userOrganaizationApiCall() {
    const response = await this._authService.userOrganisationApiCall(true);
    if (response.success) {
      const supplier = response.data.supplier_list.find((s) => {
        return s.supplier_id == this.userData.supplier_id;
      });
      this.employeeList = supplier.employee;
    }
  }

  async getAllEmployeeApiCall() {
    let data = {
      organization_id: this.selectedSupplierId,
      type: constants.BRAND,
    };
    const response = await this.httpService.post("user/getAllEmployees", data).toPromise();
    if (response.success) {
      this.selectedSupplierEmployees = response.data.user;
    }
  }

  openInviteCanvas() {
    const ref = this.ngbOffcanvas.open(InvitePeopleCanvasComponent, {
      panelClass: 'email-time-settings-slider edit-rep-canvas',
      backdropClass: 'edit-rep-canvas-backdrop',
      position: 'end',
      scroll: false,
    });
    ref.componentInstance.totalSeats = this.subscription?.total_seats ?? 0;
    ref.componentInstance.usedSeats = this.cleanUserList.length;

    // Closed with the invitations that were sent; a plain dismiss (cancel) rejects.
    ref.result.then(
      (sent: SentInvitation[]) => this.cleanUserList.push(...sent),
      () => {},
    );
  }

  async resendInvitation(user, index) {
    //console.log( user, index );
    this.isWaitingFlag = true;
    let resendData = {
      resend: true,
      supplier_id: this.userData.supplier_id,
      invited_employee_list: [
        {
          email: user.email,
          role: user.role,
        },
      ],
    };

    let response = await this.httpService.post("supplier/inviteEmployees", resendData).toPromise();
    if (response.success) {
      this.isWaitingFlag = false;
      Swal.fire("Done!", "Invitation has been sent again.", "success");
    } else {
      this.isWaitingFlag = false;
      let message = "There was an error!";
      if (response.error && response.error.code && response.error.message) {
        message = response.error.message;
      }
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: message,
      });
    }
  }

  async deleteInvitedUser(index, user: any, content) {
    console.log(user);
    this.deleteAttemptUserIndex = index;
    if (user.user && user.status === "active") {
      this.deleteAttemptUserId = user.user.id;
      this.deleteAttemptUserEmail = user.user.email;
      this.userDeleteModalRef = this.modal.open(content);
      console.log("this.selectedSupplierEmployees", this.selectedSupplierEmployees);

      this.filteredSupplierEmployees = this.selectedSupplierEmployees.filter(
        (i) => i.user.email !== this.deleteAttemptUserEmail,
      );
      return;
    }

    if (user.user && user.status !== "active") {
      this.deleteAttemptUserEmail = user.user.email;
    } else {
      this.deleteAttemptUserEmail = user.email;
    }

    let isConfirm = await Swal.fire({
      title: "Do you want to delete this user?",
      text: "Important:  You cannot undo this action",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (isConfirm.dismiss) {
      return;
    }
    this.deleteUserApiCall();
  }

  async deleteUserApiCall(selectedEmployeeId = "") {
    const index = this.invitedUsersList.findIndex((i) => i.email === this.deleteAttemptUserEmail);
    const employeeInvitationId = this.invitedUsersList[index].id;

    this.isWaitingFlag = true;

    const data = {
      employee_invitation_id: employeeInvitationId,
      employee_id: selectedEmployeeId,
    };

    await this.httpService.post("supplier/deleteUser", data).toPromise();

    this.invitedUsersList.splice(this.deleteAttemptUserIndex, 1);

    await this.userOrganaizationApiCall();
    await this.getUsersList();
    await this.getAllEmployeeApiCall();

    this.isWaitingFlag = false;
  }

  async handleDeleteUserFromModal() {
    if (!this.selectedUserAccount) {
      this.errorMessage = "Please select an account";
      return;
    }
    this.errorMessage = "";
    const selectedEmployeeId = this.selectedSupplierEmployees.filter(
      (i) => i.user.email === this.deleteAttemptUserEmail,
    )[0].id;
    let data = {
      supplier_id: this.selectedSupplierId,
      old_employee_id: this.deleteAttemptUserId,
      new_employee_id: this.selectedUserAccount,
    };
    console.log(data);

    this.isWaitingFlag = true;
    const updateApiResponse = await this.httpService.post("supplier/transferUserDataBeforeDeleting", data).toPromise();
    if (updateApiResponse.success) {
      await this.deleteUserApiCall(selectedEmployeeId);
      await this.httpService.post("user/setUsersActionLog", { actionType: "Deleted an invited user" }).toPromise();
    }
    this.isWaitingFlag = false;
    this.userDeleteModalRef.close();
  }

  async changeEmployeeRole(user, content) {
    this.selectedEmployeeForRoleChange = user;
    this.changedRoleOfEmployee = user.role.toLowerCase();
    this.roleChangeModalRef = this.modal.open(content);
  }

  async handleRoleChangeFromModal() {
    let data = {
      employeeEmail: this.selectedEmployeeForRoleChange.email
        ? this.selectedEmployeeForRoleChange.email
        : this.selectedEmployeeForRoleChange.user.email,
      companyId: this.selectedEmployeeForRoleChange.supplier_id,
      editedRole: this.changedRoleOfEmployee,
      companyType: "brand",
      isAccepted: this.selectedEmployeeForRoleChange.user ? "true" : "false",
    };
    console.log(data);
    console.log(this.selectedEmployeeForRoleChange);

    this.isWaitingFlag = true;

    await this.httpService.post("user/changeEmployeeRole", data).toPromise();

    this.isWaitingFlag = false;
    this.closeRoleChangeModal();

    await this.userOrganaizationApiCall();
    await this.getUsersList();
    await this.getAllEmployeeApiCall();
  }

  onEmployeeRoleChange(value) {
    this.changedRoleOfEmployee = value;
  }

  closeRoleChangeModal() {
    this.roleChangeModalRef.close();
  }

  closeUserDeleteModal() {
    this.userDeleteModalRef.close();
  }

  protected readonly constants = constants;
}
