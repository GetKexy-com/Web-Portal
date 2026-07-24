import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
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
  // null = add mode; set to an SMTP id when editing an existing account.
  editingSmtpId: number | string | null = null;
  // Toggles the password field between masked and plain text (eye button).
  showSmtpPassword = false;
  googleAuthCode: string;
  // Delete-gating: when the SMTP being removed is still attached to drip
  // campaigns, we hold them here and force the user to detach each one first.
  smtpPendingDelete: any = null;
  connectedDrips: any[] = [];
  removingDripId: number | string | null = null;
  isDeletingSmtp: boolean = false;
  private addSmtpModalRef: NgbModalRef;
  private connectedDripsModalRef: NgbModalRef;
  @ViewChild('connectedDripsModal') connectedDripsModal: TemplateRef<any>;

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
    this.smtpHostNotice = null;
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
    this.editingSmtpId = null;
    this.showSmtpPassword = false;
    this.buildAddSmtpForm();
    this.addSmtpModalRef = this.modal.open(content, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
    });
  };

  // Reuses the same modal/form as Add. In edit mode the password field is
  // OPTIONAL — leaving it blank keeps the stored credentials (the backend
  // decodes the existing token). We prefill every other field from the row.
  openEditSmtpModal = (content, smtp: any) => {
    this.editingSmtpId = smtp?.id ?? null;
    this.showSmtpPassword = false;
    this.buildAddSmtpForm();
    // Password is never returned by the list API, so it's optional on edit.
    const passwordCtrl = this.addSmtpForm.get('smtpPassword');
    passwordCtrl.clearValidators();
    passwordCtrl.updateValueAndValidity();
    this.addSmtpForm.patchValue({
      smtpFromName: smtp?.smtpFromName ?? '',
      smtpFromEmail: smtp?.smtpFromEmail ?? '',
      smtpUsername: smtp?.smtpUsername ?? '',
      smtpPassword: '',
      smtpHost: smtp?.smtpHost ?? '',
      smtpPort: smtp?.smtpPort != null ? String(smtp.smtpPort) : '',
      smtpSecurityType: smtp?.smtpSecurityType || 'tls',
    });
    this.addSmtpModalRef = this.modal.open(content, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
    });
  };

  closeAddSmtpModal = () => {
    this.addSmtpModalRef?.close();
    this.editingSmtpId = null;
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

  // A SMTP host is a bare hostname (e.g. "smtp.gmail.com"), NOT a URL. Users
  // often paste "https://smtp.gmail.com/" or add a trailing slash/path, which
  // the backend can't connect to. Strip any scheme, path, query, port suffix
  // and surrounding whitespace so only the host remains.
  private sanitizeSmtpHost = (value: string): string => {
    if (!value) return '';
    return value
      .trim()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '') // http:// https:// smtp:// etc.
      .replace(/\/.*$/, '') // any path
      .replace(/[?#].*$/, '') // query/fragment
      .replace(/:\d+$/, '') // trailing :port (port has its own field)
      .trim();
  };

  // An inline note shown under the Host field when we auto-cleaned the value,
  // so the user sees WHAT we changed and WHY (rather than a silent fix).
  smtpHostNotice: string | null = null;

  // Normalise the host in place on blur so the user sees the cleaned value,
  // and surface an explanatory note describing the change.
  onSmtpHostBlur = () => {
    const control = this.addSmtpForm.get('smtpHost');
    if (!control) return;
    const original = control.value;
    const cleaned = this.sanitizeSmtpHost(original);
    if (cleaned !== original) {
      control.setValue(cleaned);
      this.smtpHostNotice = `Cleaned up to “${cleaned}”. An SMTP host must be a bare hostname (like smtp.gmail.com), so we removed the URL prefix/path from what you entered.`;
    } else {
      this.smtpHostNotice = null;
    }
  };

  // Clear the note as soon as the user edits the host again.
  onSmtpHostInput = () => {
    this.smtpHostNotice = null;
  };

  // Free / consumer email providers we do NOT support as sending accounts —
  // outreach through them has poor deliverability and often violates the
  // provider's ToS. We block by the FROM-email (and username, when it's an
  // email) domain, which cleanly targets consumer accounts (someone@gmail.com)
  // without blocking business setups on the same infrastructure (e.g. Google
  // Workspace / Microsoft 365 on a custom domain).
  private readonly FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
    // Google
    'gmail.com', 'googlemail.com',
    // Yahoo
    'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.ca', 'yahoo.com.au',
    'yahoo.fr', 'yahoo.de', 'yahoo.es', 'yahoo.it', 'ymail.com', 'rocketmail.com',
    // Proton
    'proton.me', 'protonmail.com', 'protonmail.ch', 'pm.me',
    // Microsoft consumer
    'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.co.uk', 'msn.com',
    // Apple
    'icloud.com', 'me.com', 'mac.com',
    // AOL
    'aol.com',
    // GMX / Mail.com / others
    'gmx.com', 'gmx.net', 'gmx.de', 'mail.com',
    // Yandex
    'yandex.com', 'yandex.ru',
    // Zoho consumer
    'zohomail.com',
    // Misc free
    'inbox.com', 'hushmail.com', 'tutanota.com', 'tuta.io', 'fastmail.com',
  ]);

  /** The email domain (lower-cased) after the `@`, or '' when not an email. */
  private emailDomain(value: string): string {
    const at = (value || '').trim().toLowerCase().lastIndexOf('@');
    return at === -1 ? '' : value.trim().toLowerCase().slice(at + 1);
  }

  /**
   * If the SMTP's From email (or its username, when that's an email) uses a free
   * consumer provider, return that domain; otherwise null. Used to block adding
   * such accounts.
   */
  private blockedFreeEmailDomain(formValue: any): string | null {
    const candidates = [this.emailDomain(formValue?.smtpFromEmail), this.emailDomain(formValue?.smtpUsername)];
    return candidates.find((d) => d && this.FREE_EMAIL_DOMAINS.has(d)) || null;
  }

  /** The free-provider domain typed into a specific control, else null — drives
   *  the inline warning shown under that field (reactive, per keystroke). */
  freeEmailDomainFor(controlName: 'smtpFromEmail' | 'smtpUsername'): string | null {
    const domain = this.emailDomain(this.addSmtpForm?.get(controlName)?.value);
    return domain && this.FREE_EMAIL_DOMAINS.has(domain) ? domain : null;
  }

  /** The first free-provider domain found in the From email or username, else
   *  null — drives the full-width blocker bar above the footer. */
  freeEmailDomainDetected(): string | null {
    return this.freeEmailDomainFor('smtpFromEmail') || this.freeEmailDomainFor('smtpUsername');
  }

  /** True when either the From email or the username is a free provider — used
   *  to disable the submit button (the reason shows in the blocker bar). */
  hasFreeEmailAccount(): boolean {
    return !!this.freeEmailDomainDetected();
  }

  handleSubmit = async () => {
    this.submitted = true;
    if (!this.addSmtpForm.valid) {
      this.addSmtpForm.markAllAsTouched();
      return;
    }

    const formValue = this.addSmtpForm.getRawValue();

    // Free / consumer email providers (gmail, yahoo, proton, …) aren't supported
    // as sending accounts. The reason is shown INLINE under the field and the
    // submit button is disabled; this is just a safety net (e.g. paste + Enter).
    if (this.blockedFreeEmailDomain(formValue)) return;

    // Safety net in case the value wasn't cleaned on blur (e.g. paste + submit):
    // strip any scheme/path so the backend gets a bare hostname.
    formValue.smtpHost = this.sanitizeSmtpHost(formValue.smtpHost);
    // API expects a numeric port; the <select> yields a string.
    const smtpPort = formValue.smtpPort ? Number(formValue.smtpPort) : formValue.smtpPort;

    this.isLoading = true;
    try {
      if (this.editingSmtpId != null) {
        // Edit: PATCH only the provided fields. Omit an empty password so the
        // backend keeps the stored credentials. companyId is ignored server-side.
        const patchData: any = {
          smtpFromName: formValue.smtpFromName,
          smtpFromEmail: formValue.smtpFromEmail,
          smtpUsername: formValue.smtpUsername,
          smtpHost: formValue.smtpHost,
          smtpPort,
          smtpSecurityType: formValue.smtpSecurityType,
        };
        if (formValue.smtpPassword) patchData.smtpPassword = formValue.smtpPassword;
        await this.dripCampaignService.updateSmtp(this.editingSmtpId, patchData);
        this.closeAddSmtpModal();
        await this.loadSmtpList();
        await Swal.fire('Success', 'SMTP account has been updated', 'success');
      } else {
        const postData = {
          companyId: this.userData.supplier_id,
          ...formValue,
          smtpPort,
        };
        await this.dripCampaignService.testSmtpConnection(postData);
        this.closeAddSmtpModal();
        await this.loadSmtpList();
        await Swal.fire('Success', 'SMTP account has been added', 'success');
      }
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

  smtpLabel = (item: any): string => {
    const email = item?.smtpFromEmail || item?.smtpUsername || '';
    const name = item?.smtpFromName || '';
    return name && email ? `${name} <${email}>` : email || name || 'this SMTP account';
  };

  // Deleting an SMTP is gated on it not being attached to any drip campaign.
  // We first ask the backend for connected campaigns: if none, delete after a
  // confirm; if some, open a modal that forces the user to detach each drip
  // before the delete becomes available.
  deleteSmtp = async (item: any) => {
    this.deletingId = item?.id ?? null;
    let connected: any;
    try {
      connected = await this.dripCampaignService.getSmtpConnectedDripCampaigns(item?.id);
    } catch (e) {
      this.deletingId = null;
      Swal.fire('Error', e?.['message'] || e?.['error'] || 'Failed to check SMTP usage', 'error');
      return;
    }
    this.deletingId = null;

    const drips = Array.isArray(connected?.dripCampaigns) ? connected.dripCampaigns : [];
    if (connected?.connected && drips.length) {
      this.smtpPendingDelete = item;
      this.connectedDrips = drips;
      this.openConnectedDripsModal();
      return;
    }

    await this.confirmAndDeleteSmtp(item);
  };

  private confirmAndDeleteSmtp = async (item: any) => {
    const confirm = await Swal.fire({
      title: 'Remove SMTP account?',
      text: `${this.smtpLabel(item)} will no longer be available for sending.`,
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

  openConnectedDripsModal = () => {
    this.connectedDripsModalRef = this.modal.open(this.connectedDripsModal, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
    });
  };

  closeConnectedDripsModal = () => {
    this.connectedDripsModalRef?.close();
    this.smtpPendingDelete = null;
    this.connectedDrips = [];
    this.removingDripId = null;
  };

  // Campaign title for display; falls back to an id-based label.
  getDripName = (drip: any): string =>
    drip?.details?.title?.title || drip?.name || `Campaign #${drip?.id}`;

  // The drip's `smtp_account` setting id, needed to PATCH it back to null.
  private getSmtpSettingId = (drip: any) => {
    const setting = (drip?.settings || []).find((s: any) => s?.settingsType === 'smtp_account');
    return setting?.id ?? null;
  };

  // Detach this SMTP from one drip by nulling its `smtp_account` setting.
  removeSmtpFromDrip = async (drip: any) => {
    this.removingDripId = drip?.id ?? null;
    const smtpSettingId = this.getSmtpSettingId(drip);
    const postData = {
      drip_campaign_id: drip?.id,
      companyId: this.userData.supplier_id,
      settings: [
        {
          ...(smtpSettingId && { id: smtpSettingId }),
          dripCampaignId: drip?.id,
          companyId: this.userData.supplier_id,
          settingsType: 'smtp_account',
          settingsValue: [{ smtpId: null }],
        },
      ],
    };
    try {
      await this.dripCampaignService.updateSettings(postData);
      // Drop it from the list; when empty the delete button unlocks.
      this.connectedDrips = this.connectedDrips.filter((d) => d.id !== drip.id);
    } catch (e) {
      Swal.fire('Error', e?.['message'] || e?.['error'] || 'Failed to remove SMTP from campaign', 'error');
    } finally {
      this.removingDripId = null;
    }
  };

  // Enabled only once every connected campaign has been detached.
  deleteSmtpAfterDetach = async () => {
    if (this.connectedDrips.length) return;
    const item = this.smtpPendingDelete;
    this.isDeletingSmtp = true;
    try {
      await this.dripCampaignService.deleteSmtp({ id: item?.id });
      this.closeConnectedDripsModal();
      await this.loadSmtpList();
      Swal.fire('Removed', 'SMTP account has been removed', 'success');
    } catch (e) {
      Swal.fire('Error', e?.['message'] || e?.['error'] || 'Failed to remove SMTP account', 'error');
    } finally {
      this.isDeletingSmtp = false;
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
