import { Component, Input } from "@angular/core";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import {CKEditorModule} from '@ckeditor/ckeditor5-angular';

@Component({
  selector: 'kexy-rich-editor',
  imports: [
    CKEditorModule
  ],
  templateUrl: './kexy-rich-editor.component.html',
  styleUrl: './kexy-rich-editor.component.scss'
})
export class KexyRichEditorComponent {
  @Input() content = "";
  @Input() border = false;
  @Input() onContentUpdate;

  public editor = ClassicEditor;
  ckEditorConfig = {
    toolbar: {
      items: ["heading", "|", "bold", "italic", "|", "link"],
      shouldNotGroupWhenFull: true,
    },
  };

  onChange = ({ editor }) => {
    setTimeout(() => {
      this.onContentUpdate(editor);
    }, 10)
  };
}
