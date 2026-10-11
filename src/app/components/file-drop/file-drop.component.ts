import { Component, OnInit, Input } from "@angular/core";
import {NgxFileDropEntry, FileSystemFileEntry, NgxFileDropModule} from "ngx-file-drop";

import { CsvHelper } from '../../helpers/CSVHelper';

@Component({
  selector: 'file-drop',
  imports: [
    NgxFileDropModule
  ],
  templateUrl: './file-drop.component.html',
  styleUrl: './file-drop.component.scss'
})
export class FileDropComponent {
  @Input() getSelectedFile;
  /** File picker filter; drops are checked in `dropped`. */
  readonly accept = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  public files: NgxFileDropEntry[] = [];

  constructor() {}

  ngOnInit() {}

  public dropped(files: NgxFileDropEntry[]) {
    this.files = files;
    for (const droppedFile of files) {
      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          const kind = CsvHelper.importFileKind(file.name);
          if (kind === 'xls') {
            alert('Old Excel files (.xls) are not supported. Save it as .xlsx or CSV and try again.');
            return;
          }
          if (!kind) {
            alert('Invalid file type. Please choose a CSV or Excel (.xlsx) file.');
            return;
          }
          // Excel is parsed from the File itself; only a CSV needs the data URL.
          if (kind === 'xlsx') {
            this.getSelectedFile(null, file);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            this.getSelectedFile(reader.result, file);
          };
          reader.readAsDataURL(file);
        });
      }
    }
  }

  public fileOver(event) {
    console.log(event);
  }

  public fileLeave(event) {
    console.log(event);
  }
}
