import { Component, OnInit } from "@angular/core";
import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import { HttpService } from "src/app/services/http.service";
import { AuthService } from "src/app/services/auth.service";
import { CampaignService } from "../../services/campaign.service";
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'create-campaign-video-url',
  imports: [
    ReactiveFormsModule,
    ErrorMessageCardComponent,
    CommonModule,
  ],
  templateUrl: './create-campaign-video-url.component.html',
  styleUrl: './create-campaign-video-url.component.scss'
})
export class CreateCampaignVideoUrlComponent {
  primaryForm: FormGroup;
  userData;
  supplierId;
  isLoading: boolean = false;
  submitted: boolean = false;
  editData;
  canvasTitle: string = "Add";

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private fb: FormBuilder,
    private httpService: HttpService,
    private _authService: AuthService,
    private campaignService: CampaignService
  ) {}

  ngOnInit(): void {
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;

    // Get edit data if any
    this.editData = this.campaignService.getEditVideoUrlItem();
    if (this.editData?.video_url) {
      this.campaignService.setEditVideoUrlItem("");
      this.canvasTitle = "Edit";
    }

    this.setPrimaryForm();
  }

  setPrimaryForm = () => {
    this.primaryForm = new FormGroup({
      url: new FormControl(
        this.editData?.video_url ? this.editData.video_url : "",
        Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(500)])
      ),
    });
  };

  formValidationErrorCheck = (fieldName: string) => {
    return (
      this.primaryForm.controls[fieldName].invalid && (this.submitted || this.primaryForm.controls[fieldName].dirty)
    );
  };

  handleSubmit = async () => {
    this.submitted = true;
    if (!this.primaryForm.valid) {
      console.log("primaryForm", this.primaryForm);
      return false;
    }
    this.isLoading = true;

    const formData = this.primaryForm.getRawValue();
    let payload = {
      supplier_id: this.supplierId,
      video_url: formData.url
    };
    try {
      if (this.editData?.video_url) {
        payload['video_url_id'] = this.editData.id;
        await this.campaignService.editCampaignVideoUrl(payload);
      } else {
        await this.campaignService.addCampaignVideoUrl(payload);
      }
      this.activeCanvas.dismiss("Cross click");
      this.isLoading = false;
    } catch (e) {
      console.log(e);
    }
  };
}
