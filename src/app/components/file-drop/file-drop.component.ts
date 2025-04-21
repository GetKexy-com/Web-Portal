import { Component, OnInit, Input } from "@angular/core";
import {NgxFileDropEntry, FileSystemFileEntry, NgxFileDropModule} from "ngx-file-drop";

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
          // Here you can access the real file
          if (file.type !== "text/csv") {
            alert("Invalid file type");
            return;
          }
          console.log('fff', file);
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
