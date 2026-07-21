import { Component, OnInit } from '@angular/core';
import { constants } from 'src/app/helpers/constants';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import { AuthService } from 'src/app/services/auth.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import Gleap from 'gleap';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { CommonModule } from '@angular/common';
import { PageUiService } from '../../services/page-ui.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-brand-email-account-settings',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './brand-email-account-settings.component.html',
  styleUrl: './brand-email-account-settings.component.scss',
})
export class BrandEmailAccountSettingsComponent implements OnInit {
  ports: any[] = [...constants.SMTP_PORTS];
  addSmtpForm: FormGroup;
  submitted: boolean = false;
  isLoading: boolean = false;
  isLoadingList: boolean = false;
  userData;
  smtpList: any[] = [];
  totalSmtp: number = 0;
  deletingId: number | string | null = null;
  googleAuthCode: string;
  private addSmtpModalRef: NgbModalRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dripCampaignService: DripCampaignService,
    private _authService: AuthService,
    private modal: NgbModal,
    private pageUiService: PageUiService,
  ) {}

  async ngOnInit() {
    document.title = 'SMTP Settings - KEXY Webportal';
    this.userData = this._authService.userTokenValue;
    this.getQueryParams();
    if (this.googleAuthCode) {
      await this.googleSmtpTokensApi();
    }
    this.buildAddSmtpForm();
    await this.loadSmtpList();
  }

  getQueryParams = () => {
    this.route.queryParams.subscribe((params) => {
      if (params['code']) {
        this.googleAuthCode = params['code'];
      }
    });
  };

  // Load every SMTP account for this company. Response shape:
  // res.data = { smtps, total, smtpOAuth }. A high `limit` is requested so the
  // whole list shows without paging. `normalizeSmtpList` also tolerates the
  // legacy single-object shape ({ smtp, smtpPort }).
  loadSmtpList = async () => {
    this.isLoadingList = true;
    try {
      const data: any = await this.dripCampaignService.getSmtpList({
        companyId: this.userData.supplier_id,
        page: 1,
        limit: 100,
      });
      this.smtpList = this.normalizeSmtpList(data);
      this.totalSmtp =
        typeof data?.total === 'number' ? data.total : this.smtpList.length;
    } catch (e) {
      this.smtpList = [];
      this.totalSmtp = 0;
    } finally {
      this.isLoadingList = false;
    }
  };

  private normalizeSmtpList(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.smtps)) return data.smtps;
    if (Array.isArray(data.smtpList)) return data.smtpList;
    // Legacy single-object shape: { smtp: {...}, smtpPort }.
    if (data.smtp) {
      return [{ ...data.smtp, smtpPort: data.smtp.smtpPort ?? data.smtpPort }];
    }
    return [];
  }

  buildAddSmtpForm = () => {
    this.submitted = false;
    this.addSmtpForm = new FormGroup({
      smtpFromName: new FormControl('', Validators.compose([Validators.required])),
      smtpFromEmail: new FormControl(
        '',
        Validators.compose([Validators.required, Validators.email]),
      ),
      smtpUsername: new FormControl('', Validators.compose([Validators.required])),
      smtpPassword: new FormControl('', Validators.compose([Validators.required])),
      smtpHost: new FormControl('', Validators.compose([Validators.required])),
      smtpPort: new FormControl('', Validators.compose([Validators.required])),
      smtpSecurityType: new FormControl('tls', Validators.compose([])),
    });
  };

  openAddSmtpModal = (content) => {
    this.buildAddSmtpForm();
    this.addSmtpModalRef = this.modal.open(content, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
    });
  };

  closeAddSmtpModal = () => {
    this.addSmtpModalRef?.close();
  };

  // Avatar initials from the SMTP "From name": first letter of the first + last
  // word (e.g. "John Doe" -> "JD"). A single word uses its first two letters
  // ("Support" -> "SU"). Falls back to the email/username if no From name.
  getSmtpInitials = (smtp: any): string => {
    const source = (smtp?.smtpFromName || smtp?.smtpFromEmail || smtp?.smtpUsername || '').trim();
    if (!source) return '?';
    const parts = source.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2 ? parts[0].charAt(0) + parts[1].charAt(0) : source.substring(0, 2);
    return initials.toUpperCase();
  };

  formValidationErrorCheck = (fieldName: string) => {
    const control = this.addSmtpForm.controls[fieldName];
    return control.invalid && (this.submitted || control.dirty);
  };

  handleSubmit = async () => {
    this.submitted = true;
    if (!this.addSmtpForm.valid) {
      this.addSmtpForm.markAllAsTouched();
      return;
    }

    const formValue = this.addSmtpForm.getRawValue();
    const postData = {
      companyId: this.userData.supplier_id,
      ...formValue,
      // API expects a numeric port; the <select> yields a string.
      smtpPort: formValue.smtpPort ? Number(formValue.smtpPort) : formValue.smtpPort,
    };

    this.isLoading = true;
    try {
      await this.dripCampaignService.testSmtpConnection(postData);
      this.closeAddSmtpModal();
      await this.loadSmtpList();
      await Swal.fire('Success', 'SMTP account has been added', 'success');
    } catch (error) {
      await Swal.fire(
        'Error',
        error?.['error'] || error?.['data'] || 'SMTP connection failed!',
        'error',
      );
    } finally {
      this.isLoading = false;
    }
  };

  deleteSmtp = async (item: any) => {
    const email = item?.smtpFromEmail || item?.smtpUsername || '';
    const name = item?.smtpFromName || '';
    const label = name && email ? `${name} <${email}>` : email || name || 'this SMTP account';
    const confirm = await Swal.fire({
      title: 'Remove SMTP account?',
      text: `${label} will no longer be available for sending.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    this.deletingId = item?.id ?? null;
    try {
      await this.dripCampaignService.deleteSmtp({ id: item?.id });
      await this.loadSmtpList();
      Swal.fire('Removed', 'SMTP account has been removed', 'success');
    } catch (e) {
      Swal.fire('Error', e?.message || 'Failed to remove SMTP account', 'error');
    } finally {
      this.deletingId = null;
    }
  };

  support = () => {
    Gleap.identify(this.userData.id.toString(), {
      name: this.userData.first_name + ' ' + this.userData.last_name,
      email: this.userData.email,
      customData: {
        supplier_name: this.userData.supplier_name,
        supplier_id: this.userData.supplier_id,
      },
    });
    Gleap.open();
  };

  openVideoDialog(content) {
    this.modal.open(content, { size: 'lg' });
  }

  // Retained so an in-flight Gmail OAuth redirect (?code=) still resolves even
  // though the Gmail connect UI is not shown on this page.
  googleSmtpTokensApi = async () => {
    const postData = {
      companyId: this.userData.supplier_id,
      code: this.googleAuthCode,
    };
    const swal = this.pageUiService.showSweetAlertLoading();
    try {
      swal.showLoading();
      const data = await this.dripCampaignService.googleSmtpTokens(postData);
      if (data['success']) {
        swal.close();
        Swal.fire('Done!', 'Connected with gmail successfully!', 'success');
        this.removeQueryParams();
      }
    } catch (e) {
      swal.close();
      Swal.fire('Error', e.message, 'error');
    }
  };

  removeQueryParams() {
    this.router.navigate([], {
      queryParams: {},
      replaceUrl: true,
    });
  }

  protected readonly constants = constants;
}
