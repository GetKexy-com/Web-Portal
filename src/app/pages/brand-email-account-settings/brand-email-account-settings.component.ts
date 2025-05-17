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
import {
  ProspectingCommonCardComponent,
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { ErrorMessageCardComponent } from '../../components/error-message-card/error-message-card.component';
import { KexySelectDropdownComponent } from '../../components/kexy-select-dropdown/kexy-select-dropdown.component';
import { CommonModule } from '@angular/common';

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
export class BrandEmailAccountSettingsComponent {
  ports: object[] = [...constants.SMTP_PORTS];
  selectedPort: string = '';
  primaryForm: FormGroup;
  submitted: boolean = false;
  isLoading: boolean = false;
  isConnectionSuccessful: boolean = false;
  connectionFailed: boolean = false;
  userData;
  smtpDetails;
  smtpConnectionType;

  constructor(private dripCampaignService: DripCampaignService, private _authService: AuthService, private modal: NgbModal) {
  }

  async ngOnInit() {
    document.title = 'SMTP Settings - KEXY Webportal';
    this.userData = this._authService.userTokenValue;
    this.setPrimaryForm();
    this.getSmtpDetails();
  }

  getSmtpDetails = async () => {
    this.smtpDetails = await this.dripCampaignService.getSmtpDetails({ companyId: this.userData.supplier_id });
    if (this.smtpDetails) {
      this.setSmtpSendingType(constants.SMTP);
      this.setPrimaryForm();
      this.selectedPort = this.smtpDetails.smtpPort;
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
      smtpPassword: new FormControl(
        '',
        Validators.compose([Validators.required]),
      ),
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
      this.primaryForm.controls[fieldName].invalid && (this.submitted || this.primaryForm.controls[fieldName].dirty)
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

  setSmtpSendingType = (type) => {
    this.smtpConnectionType = type;

    if (this.smtpConnectionType === constants.GMAIL) {
      window.location.href = `${environment.baseUrl}drip-campaigns/getGmailOAuthToken`;
    }
  };
  protected readonly constants = constants;
}
