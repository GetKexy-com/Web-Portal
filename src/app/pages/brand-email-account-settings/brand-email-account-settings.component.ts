import { Component, OnInit } from '@angular/core';
import { constants } from 'src/app/helpers/constants';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import { AuthService } from 'src/app/services/auth.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Gleap from 'gleap';
import { environment } from 'src/environments/environment';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { ProspectingCommonCardComponent } from '../../components/prospecting-common-card/prospecting-common-card.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { ErrorMessageCardComponent } from '../../components/error-message-card/error-message-card.component';
import { KexySelectDropdownComponent } from '../../components/kexy-select-dropdown/kexy-select-dropdown.component';
import { CommonModule } from '@angular/common';
import { PageUiService } from '../../services/page-ui.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-brand-email-account-settings',
  imports: [
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
    KexyButtonComponent,
    ErrorMessageCardComponent,
    ReactiveFormsModule,
    KexySelectDropdownComponent,
    CommonModule,
  ],
  templateUrl: './brand-email-account-settings.component.html',
  styleUrl: './brand-email-account-settings.component.scss',
})
export class BrandEmailAccountSettingsComponent implements OnInit {
  ports: object[] = [...constants.SMTP_PORTS];
  selectedPort: string = '';
  primaryForm: FormGroup;
  submitted: boolean = false;
  isLoading: boolean = false;
  isConnectionSuccessful: boolean = false;
  connectionFailed: boolean = false;
  userData;
  smtpDetails;
  isSmtpConnected: boolean = false;
  isGmailConnected: boolean = false;
  showSmtpForm: boolean = false;
  googleAuthCode: string;

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
    console.log('googleAuthCode', this.googleAuthCode);
    if (this.googleAuthCode) {
      await this.googleSmtpTokensApi();
    }
    this.setPrimaryForm();
    this.getSmtpDetails();
  }

  getQueryParams = () => {
    this.route.queryParams.subscribe((params) => {
      if (params['code']) {
        this.googleAuthCode = params['code'];
      }
    });
  };

  getSmtpDetails = async () => {
    this.smtpDetails = await this.dripCampaignService.getSmtpDetails({
      companyId: this.userData.supplier_id,
    });
    console.log('smtp details', this.smtpDetails);
    if (this.smtpDetails) {
      const smtp = this.smtpDetails.smtp;
      if (smtp) {
        this.isSmtpConnected = true;
        this.showSmtpForm = true;
        this.setPrimaryForm();
        this.selectedPort = this.smtpDetails.smtpPort;
      }

      const smtpOAuth = this.smtpDetails.smtpOAuth;
      if (smtpOAuth) {
        const provider = smtpOAuth.provider;
        if (provider === constants.GOOGLE) {
          this.isGmailConnected = true;
        }
      }
      this.setSmtpConnectionStatus(false, true, 'SMTP connection is successful!');
    }
  };

  setPrimaryForm = () => {
    this.primaryForm = new FormGroup({
      smtpFromName: new FormControl(
        this.smtpDetails?.smtpFromName ? this.smtpDetails.smtpFromName : '',
        Validators.compose([Validators.required]),
      ),
      smtpFromEmail: new FormControl(
        this.smtpDetails?.smtpFromEmail ? this.smtpDetails.smtpFromEmail : '',
        Validators.compose([Validators.required, Validators.email]),
      ),
      smtpUsername: new FormControl(
        this.smtpDetails?.smtpUsername ? this.smtpDetails.smtpUsername : '',
        Validators.compose([Validators.required]),
      ),
      smtpPassword: new FormControl('', Validators.compose([Validators.required])),
      smtpHost: new FormControl(
        this.smtpDetails?.smtpHost ? this.smtpDetails.smtpHost : '',
        Validators.compose([Validators.required]),
      ),
      smtpPort: new FormControl(
        this.smtpDetails?.smtpPort ? this.smtpDetails.smtpPort : '',
        Validators.compose([]),
      ),
      smtpSecurityType: new FormControl(
        this.smtpDetails?.smtpSecurityType ? this.smtpDetails.smtpSecurityType : 'tls',
        Validators.compose([]),
      ),
    });
  };

  onEmailPortSelect = (selectedValue) => {
    this.selectedPort = selectedValue.key;
    this.primaryForm.patchValue({ smtpPort: this.selectedPort });
  };

  formValidationErrorCheck = (fieldName: string) => {
    return (
      this.primaryForm.controls[fieldName].invalid &&
      (this.submitted || this.primaryForm.controls[fieldName].dirty)
    );
  };

  setSmtpConnectionStatus = (connectionFailed, connectionSuccessful, connectionMessage) => {
    this.connectionFailed = connectionFailed;
    this.isConnectionSuccessful = connectionSuccessful;
    this.connectionMessage = connectionMessage;
  };

  public connectionMessage = '';
  handleSubmit = async () => {
    // Disconnect or delete smtp
    if (this.isConnectionSuccessful) {
      await this.deleteSmtp();
      return;
    }

    this.submitted = true;
    if (!this.primaryForm.valid) {
      console.log('primaryForm', this.primaryForm);
      return false;
    }

    const formData = this.primaryForm.getRawValue();
    const postData = {
      companyId: this.userData.supplier_id,
      ...formData,
    };

    this.isLoading = true;
    const response = await this.dripCampaignService.testSmtpConnection(postData);
    if (response['success']) {
      this.setSmtpConnectionStatus(false, true, 'SMTP connection is successful!');
      await Swal.fire('Success', 'SMTP details have been saved', 'success');
    } else {
      this.setSmtpConnectionStatus(true, false, 'SMTP connection failed!');
      if (!response['success'] && response['error']['message']) {
        await Swal.fire('Error', response['error']['message']);
      }
      if (response['data']) {
        this.connectionMessage = response['data'];
      }
    }
    this.isLoading = false;
  };

  deleteSmtp = async () => {
    try {
      this.isLoading = true;
      await this.dripCampaignService.deleteSmtp({ id: this.smtpDetails.id });
      this.setSmtpConnectionStatus(false, false, '');
      this.primaryForm.reset();
      Swal.fire('Success', 'Disconnected Successfully', 'success');
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      this.isLoading = false;
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

  handleCallGoogleSmtpApi = async () => {
    // Hide smtp form if showed
    this.showSmtpForm = false;

    const postData = {
      companyId: this.userData.supplier_id,
    };
    const swal = this.pageUiService.showSweetAlertLoading();
    try {
      swal.showLoading();
      const data = await this.dripCampaignService.googleSmtp(postData);
      if (data['url']) {
        window.open(data['url'], '_blank');
      }
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      swal.close();
    }
  };

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
        console.log('data', data['success']);
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

  handleClickConnectSmtpBtn = () => {
    this.showSmtpForm = true;
  };

  protected readonly constants = constants;
}
