import { Component, OnInit, Input } from "@angular/core";
import {CommonModule, Location} from "@angular/common";
import Swal from "sweetalert2";
import { AuthService } from "../../services/auth.service";
import { DripCampaignService } from "../../services/drip-campaign.service";
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {FileDropComponent} from '../file-drop/file-drop.component';

@Component({
  selector: 'upload-vendors-modal-content',
  imports: [
    KexyButtonComponent,
    CommonModule,
    FileDropComponent,
  ],
  templateUrl: './upload-vendors-modal-content.component.html',
  styleUrl: './upload-vendors-modal-content.component.scss'
})
export class UploadVendorsModalContentComponent {
  @Input() closeModal;
  userData;

  constructor(private location: Location, private _authService: AuthService, private dripCampaignService: DripCampaignService) {
  }

  ngOnInit() {
    this.userData = this._authService.userTokenValue;
  }

  closeIconClick = () => {
    this.closeModal();
  };

  fileInfo;
  getSelectedFile = (file, fileInfo) => {
    this.fileInfo = fileInfo;
    const base64Data = file.split(",")[1];
    const decodedString = atob(base64Data);
    this.userObjList = this.parseCSV(decodedString);
  };

  parseCSV(csvContent: string): any[] {
    const lines = csvContent.trim().split("\n");
    const headers = lines[0].split(",");

    return lines.slice(1).map(line => {
      const data = line.split(",");
      return headers.reduce((obj, header, index) => {
        obj[header.trim()] = data[index].trim();
        return obj;
      }, {});
    });
  }

  removeSelectedFile = () => {
    this.fileInfo = "";
  };

  userObjList = [];
  submitted: boolean = false;
  isLoading: boolean = false;
  saveBtnClicked = async () => {
    this.submitted = true;

    // Set matching key value pair from parsed file data
    if (this.userObjList.length) {
      this.userObjList.map(i => {
        i.contact_first_name = i["First Name"];
        i.contact_last_name = i["Last Name"];
        i.contact_email = i["Email"];
      });
    }

    // Validation check
    if (!this.userObjList.length && !this.userObjList.some((i) => i.contact_first_name && i.contact_last_name && i.contact_email)) {
      console.log(this.userObjList);
      await Swal.fire("Error", "Validation error!");
      return;
    }

    this.isLoading = true;

    const payload = {
      supplier_id: this.userData.supplier_id,
      suppression_users: this.userObjList,
    };
    try {
      await this.dripCampaignService.addDripCampaignSuppressionUsers(payload);
      const suppressionListApiPostData = this.dripCampaignService.suppressionListApiPostData;
      await this.dripCampaignService.getSuppressionList(suppressionListApiPostData);
      this.closeModal();
      this.isLoading = false;
    } catch (e) {
      await Swal.fire("Error", e.message);
    }
  };
}
