import { Component, OnInit, signal } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpService } from '../../services/http.service';
import { AuthService } from '../../services/auth.service';
import { ProspectingService } from '../../services/prospecting.service';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs';
import { PageUiService } from '../../services/page-ui.service';

@Component({
  selector: 'add-website-content',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorMessageCardComponent,
  ],
  templateUrl: './add-website-content.component.html',
  styleUrl: './add-website-content.component.scss',
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
    private pageUiService: PageUiService,
    private prospectingService: ProspectingService,
  ) {
  }

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
      website: new FormControl('www.', [
        Validators.required,
        Validators.minLength(0),
      ]),
    });
  }

  formValidationErrorCheck(fieldName: string): boolean {
    const control = this.primaryForm.get(fieldName);
    return control ? control.invalid && (this.submitted() || control.dirty) : false;
  }

  invalidWebsite = false;

  async onSubmit(): Promise<void> {
    this.submitted.set(true);

    if (!this.primaryForm.valid) {
      console.warn('Form is invalid', this.primaryForm);
      return;
    }

    this.isLoading.set(true);

    try {
      this.invalidWebsite = false;
      const formData = this.primaryForm.getRawValue();
      formData.website = this.pageUiService.urlValidate(formData.website);
      if (!formData.website) {
        this.invalidWebsite = true;
        return;
      }
      const updatedWebsites = [...this.previousWebsites(), formData.website];

      const payload = {
        websites: JSON.stringify(updatedWebsites),
      };

      const res = await this.httpService.patch(`company/${this.supplierId}`, payload).toPromise();

      if (res?.success) {
        this.previousWebsites.set(updatedWebsites);
        this.prospectingService.updateWebsites(updatedWebsites);
      }

      this.activeCanvas.dismiss('Cross click');
    } catch (error) {
      console.error('Error submitting website', error);
    } finally {
      this.isLoading.set(false);
    }
  }


}
