import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from "@angular/core";
import {CommonModule, Location} from "@angular/common";
import { AuthService } from "../../services/auth.service";
import Papa from "papaparse";
import { AddOrDeleteContactLabelComponent } from "../add-or-delete-contact-label/add-or-delete-contact-label.component";
import { NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingService } from "../../services/prospecting.service";
import { Subscription } from "rxjs";
import {FileDropComponent} from '../file-drop/file-drop.component';
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';

@Component({
  selector: 'upload-file-modal-content',
  imports: [
    FileDropComponent,
    KexyButtonComponent,
    KexySelectDropdownComponent,
    CommonModule,
  ],
  templateUrl: './upload-file-modal-content.component.html',
  styleUrl: './upload-file-modal-content.component.scss'
})
export class UploadFileModalContentComponent {
  @Input() closeModal;
  @Input() sampleCsvUrl;
  @Input() isLoading = false;
  @Input() bypassZerobounce;
  @Input() additionalFileRelatedText;
  @Input() showListsDropdown = false;
  @Output() parsedFileData = new EventEmitter<any>();
  @Output() selectedLists = new EventEmitter<any>();
  clickCount = 0;
  userData;
  labelOptions = [];
  selectedLabel: object;
  labelsSubscription: Subscription;

  constructor(
    private location: Location,
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private ngbOffcanvas: NgbOffcanvas,
  ) {
  }

  ngOnInit() {
    this.userData = this._authService.userTokenValue;
    this.clickCount = 0;
    this.setLabelsSubscription();
  }

  ngOnDestroy() {
    if (this.labelsSubscription) this.labelsSubscription.unsubscribe();
  }

  setLabelsSubscription = () => {
    this.labelsSubscription = this.prospectingService.labels.subscribe((labels) => {
      this.labelOptions = [];
      labels.forEach(i => {
        const labelObj = {
          key: i.label,
          value: i.label,
          itemBgColor: i.bg_color,
          itemTextColor: i.text_color,
          id: i.id,
        };
        this.labelOptions.push(labelObj);
      });
    });
  };

  closeIconClick = () => {
    this.closeModal();
  };

  fileInfo;
  getSelectedFile = (file, fileInfo) => {
    this.fileInfo = fileInfo;
    const base64Data = file.split(",")[1];
    const decodedString = atob(base64Data);
    Papa.parse(decodedString, {
      header: true,  // Set to true if the first contact contains headers
      skipEmptyLines: true,  // Skip empty lines in the CSV
      complete: (results) => {
        this.parsedData = results.data;
      },
    });
  };

  removeSelectedFile = () => {
    this.fileInfo = "";
  };

  parsedData = [];
  submitted: boolean = false;
  saveBtnClicked = async () => {
    if (this.selectedLabel?.["id"]) {
      this.selectedLists.emit(this.selectedLabel);
    }
    this.parsedFileData.emit(this.parsedData);
  };

  checkHiddenClick = () => {
    this.clickCount += 1;
    if (this.clickCount > 4) {
      this.bypassZerobounce(true);
    } else {
      this.bypassZerobounce(false);
    }
  };

  onLabelSelect = (selectedValue, index = null, rowIndex = null) => {
    if (!selectedValue.key) {
      this.selectedLabel = null;
      return;
    }
    this.selectedLabel = selectedValue;
  };

  openContactLabelCanvas = () => {
    this.ngbOffcanvas.open(AddOrDeleteContactLabelComponent, {
      panelClass: "attributes-bg csv-label-create-offcanvas-panel",
      backdropClass: "edit-rep-canvas-backdrop csv-label-create-offcanvas-backdrop",
      position: "end",
      scroll: false,
    });
  };
}
