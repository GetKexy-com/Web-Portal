import { Component, OnInit } from '@angular/core';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { ErrorMessageCardComponent } from '../../components/error-message-card/error-message-card.component';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { NgForOf, NgIf } from '@angular/common';
import {
  ProspectingCommonCardComponent,
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import {
  CampaignLayoutBottmBtnsComponent,
} from '../../components/campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import { KexySelectDropdownComponent } from '../../components/kexy-select-dropdown/kexy-select-dropdown.component';
import { FileSystemDirectoryEntry, FileSystemFileEntry, NgxFileDropEntry, NgxFileDropModule } from 'ngx-file-drop';
import { environment } from '../../../environments/environment';
import { constants } from '../../helpers/constants';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';
import { HttpService } from '../../services/http.service';
import { PageUiService } from '../../services/page-ui.service';

@Component({
  selector: 'app-import-contacts-in-sendy',
  imports: [
    BrandLayoutComponent,
    ErrorMessageCardComponent,
    FormsModule,
    KexyButtonComponent,
    NgForOf,
    NgIf,
    ProspectingCommonCardComponent,
    ReactiveFormsModule,
    CampaignLayoutBottmBtnsComponent,
    KexySelectDropdownComponent,
    NgxFileDropModule,
  ],
  templateUrl: './import-contacts-in-sendy.component.html',
  styleUrl: './import-contacts-in-sendy.component.scss',
})
export class ImportContactsInSendyComponent implements OnInit {
  public primaryForm: FormGroup;
  public sellSheetFileName;
  isWaitingFlag = false;
  submitted = false;

  constructor(
    private httpService: HttpService,
  ) {
  }


  async ngOnInit() {
    this.primaryForm = new FormGroup({
      listId: new FormControl(''),
      sellSheet: new FormControl(''),
    });
  }


  sellSheetFileDrop(files: NgxFileDropEntry[]) {
    this.sellSheetFileName = files[0].fileEntry.name;

    for (const droppedFile of files) {
      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          console.log({ file });
          // Here you can access the real file
          if (file.type !== 'text/csv') {
            alert('Invalid File - Please select a CSV');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            this.primaryForm.patchValue({
              sellSheet: reader.result,
            });
          };
          reader.readAsDataURL(file);
        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
      }
    }
  }


  primaryFormSubmitted = async () => {
    console.log(this.primaryForm.getRawValue());

    this.submitted = true;

    if (!this.primaryForm.valid) {
      console.log('submitted data', this.primaryForm);
      return;
    }

    this.isWaitingFlag = true;
    const data = {
      csv_file: this.primaryForm.getRawValue().sellSheet,
      sendy_list_id: this.primaryForm.getRawValue().listId,
    };
    this.httpService.post(`admin/importContactsInSendy`, data, environment.oldBaseUrl).subscribe((response) => {
      if (response.success) {
        console.log('success', response);

        Swal.fire('Done!', 'Sent successfully!', 'success');
      } else {
        this.isWaitingFlag = false;
        let message = 'There was an error!';
        if (response.error && response.error.code && response.error.message) {
          message = response.error.message;
        }
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: message,
        });
      }
    });


  };
  protected readonly environment = environment;
  protected readonly constants = constants;
}
