import { Component, OnInit, signal } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpService } from '../../services/http.service';
import { AuthService } from '../../services/auth.service';
import { ProspectingService } from '../../services/prospecting.service';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { CommonModule } from '@angular/common';
import { PageUiService } from '../../services/page-ui.service';

@Component({
  selector: 'add-calendly-link-content',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorMessageCardComponent,
  ],
  templateUrl: './add-calendly-link-content.component.html',
  styleUrl: './add-calendly-link-content.component.scss',
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
    private pageUiService: PageUiService,
    private prospectingService: ProspectingService,
  ) {
  }

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
      calendly_link: ['www.', [
        Validators.required,
        Validators.minLength(0),
        Validators.maxLength(500),
      ]],
    });
  }

  formValidationErrorCheck(fieldName: string): boolean {
    return (
      this.primaryForm.controls[fieldName].invalid &&
      (this.submitted() || this.primaryForm.controls[fieldName].dirty)
    );
  }

  invalidWebsite = false;

  async onSubmit(): Promise<void> {
    this.submitted.set(true);

    if (!this.primaryForm.valid) {
      console.log('primaryForm', this.primaryForm);
      return;
    }

    this.isLoading.set(true);

    this.invalidWebsite = false;
    const formData = this.primaryForm.getRawValue();
    formData.calendly_link = this.pageUiService.urlValidate(formData.calendly_link);
    if (!formData.calendly_link) {
      this.invalidWebsite = true;
      return;
    }
    this.previousLinks.update(links => [...links, formData.calendly_link]);

    const payload = {
      calendlyLinks: JSON.stringify(this.previousLinks()),
    };

    try {
      const res = await this.httpService.patch(`company/${this.supplierId}`, payload).toPromise();
      if (res.success) {
        this.prospectingService.updateCalendlyLinks(this.previousLinks());
      }
      this.activeCanvas.dismiss('Cross click');
    } finally {
      this.isLoading.set(false);
    }
  }
}
