import { Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';

type InviteRow = FormGroup<{
  userEmail: FormControl<string>;
  userRole: FormControl<string>;
}>;

export interface SentInvitation {
  email: string;
  role: string;
  action: 'sent';
}

/**
 * Right-side drawer to invite one or more teammates. The opener sets `totalSeats`
 * and `usedSeats` on the instance; on success the drawer closes with the
 * invitations it sent (`SentInvitation[]`) so the page can list them, and it
 * dismisses on cancel.
 */
@Component({
  selector: 'invite-people-canvas',
  standalone: true,
  imports: [ReactiveFormsModule, ErrorMessageCardComponent],
  templateUrl: './invite-people-canvas.component.html',
  styleUrl: './invite-people-canvas.component.scss',
})
export class InvitePeopleCanvasComponent {
  public activeCanvas = inject(NgbActiveOffcanvas);
  private authService = inject(AuthService);
  private httpService = inject(HttpService);

  /** Set by the opener. */
  totalSeats = 0;
  usedSeats = 0;

  /** The company the teammates are being invited to. */
  companyName: string = this.authService.userTokenValue?.supplier_name || '';

  isLoading = signal(false);
  submitted = signal(false);

  primaryForm = new FormGroup({
    peoplesList: new FormArray<InviteRow>([this.__newRow()]),
  });

  get peoplesList() {
    return this.primaryForm.controls.peoplesList;
  }

  get remainingSeats(): number {
    return Math.max(this.totalSeats - this.usedSeats, 0);
  }

  private __newRow(): InviteRow {
    return new FormGroup({
      userEmail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      userRole: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    });
  }

  addPeopleRow() {
    this.peoplesList.push(this.__newRow());
  }

  removePeople(index: number) {
    if (this.peoplesList.length === 1) return;
    this.peoplesList.removeAt(index);
  }

  /** Show a row's error once the form was submitted or the field was touched. */
  showError(index: number, field: 'userEmail' | 'userRole'): boolean {
    const control = this.peoplesList.at(index).get(field);
    return !!control && control.invalid && (this.submitted() || control.dirty);
  }

  private __seatLimitWarning() {
    return Swal.fire({
      icon: 'error',
      text: `Your current subscription only allows ${this.totalSeats} user(s). Please increase subscription user limit.`,
    });
  }

  async handleSubmit() {
    this.submitted.set(true);
    if (this.primaryForm.invalid) return;

    const invitations: SentInvitation[] = this.peoplesList.getRawValue().map((p) => ({
      email: p.userEmail.trim(),
      role: p.userRole,
      action: 'sent',
    }));

    if (invitations.length > this.remainingSeats) {
      await this.__seatLimitWarning();
      return;
    }

    this.isLoading.set(true);
    try {
      const response = await this.httpService
        .post('supplier/inviteEmployees', {
          supplier_id: this.authService.userTokenValue.supplier_id,
          invited_employee_list: invitations.map(({ email, role }) => ({ email, role })),
        })
        .toPromise();

      if (!response.success) {
        const message = response.error?.code && response.error?.message ? response.error.message : 'There was an error!';
        await Swal.fire({ icon: 'error', title: 'Oops...', text: message });
        return;
      }

      await Swal.fire('Done!', 'Invitation has been sent.', 'success');
      this.activeCanvas.close(invitations);
    } finally {
      this.isLoading.set(false);
    }
  }
}
