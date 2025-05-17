import { Component, OnInit, Input } from "@angular/core";
import {CommonModule, Location} from "@angular/common";
import Swal from "sweetalert2";
import { AuthService } from "../../services/auth.service";
import { DripCampaignService } from "../../services/drip-campaign.service";
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {FileDropComponent} from '../file-drop/file-drop.component';

interface SuppressionUser {
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
}

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
export class UploadVendorsModalContentComponent implements OnInit {
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
    const rows = this.parseCSV(decodedString);
    this.userObjList = rows.map((row: any) => ({
      contactFirstName: row["First Name"],
      contactLastName: row["Last Name"],
      contactEmail: row["Email"],
    }));
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

  userObjList: SuppressionUser[] = [];
  submitted: boolean = false;
  isLoading: boolean = false;
  saveBtnClicked = async () => {
    this.submitted = true;

    // Validation check
    if (!this.userObjList.length && !this.userObjList.some((i) => i.contactFirstName && i.contactLastName && i.contactEmail)) {
      console.log(this.userObjList);
      await Swal.fire("Error", "Validation error!");
      return;
    }

    this.isLoading = true;

    const payload = {
      companyId: this.userData.supplier_id,
      suppressionUsers: this.userObjList,
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
