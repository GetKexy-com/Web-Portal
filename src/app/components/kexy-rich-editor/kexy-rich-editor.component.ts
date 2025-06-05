import { Component, Input } from '@angular/core';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
// import ImageResize from '@ckeditor/ckeditor5-image/src/imageresize';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'kexy-rich-editor',
  imports: [
    CKEditorModule,
  ],
  templateUrl: './kexy-rich-editor.component.html',
  styleUrl: './kexy-rich-editor.component.scss',
})
export class KexyRichEditorComponent {
  @Input() content = '';
  @Input() border = false;
  @Input() onContentUpdate;

  public editor = ClassicEditor;
  ckEditorConfig = {
    extraPlugins: [CustomUploadAdapterPlugin],
    toolbar: {
      items: [
        'bold', 'italic', 'underline', 'strikethrough', 'code', 'superscript', 'subscript',
        'alignment:left', 'alignment:center', 'alignment:right', 'alignment:justify',
        'bulletedList', 'numberedList', 'todoList',
        'outdent', 'indent',
        'link', 'blockQuote', 'imageUpload', 'insertTable', 'mediaEmbed',
        'undo', 'redo',
        'heading', 'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor',
        'highlight', 'horizontalLine', 'removeFormat',
        'specialCharacters', 'codeBlock', 'htmlEmbed',
        'restrictedEditingException', 'pageBreak',
        'sourceEditing', 'findAndReplace', 'selectAll',
        'style', 'textPartLanguage',
      ],
      shouldNotGroupWhenFull: true,
    },
  };

  onChange = ({ editor }) => {
    setTimeout(() => {
      this.onContentUpdate(editor);
    }, 10);
  };
}

function CustomUploadAdapterPlugin(editor: any) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
    return new CustomUploadAdapter(loader);
  };
}

class CustomUploadAdapter {
  private loader;
  private url: string = environment.baseUrl;
  private maxWidth: number = 800; // Set your maximum width
  private maxHeight: number = 600; // Set your maximum height

  constructor(loader: any) {
    this.loader = loader;
  }

  async upload(): Promise<any> {
    const file = await this.loader.file;
    return this.sendFile(file);
  }

  private async sendFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('upload', file); // Adjust field name as per your API
    console.log(formData);
    return {
      default: 'https://yt3.ggpht.com/mjUV8siVwH2jbHOu5NmLlJXo4bsenPFf8E1RAyOM-vGuqBYQWk7mpubRgLYp2iU0pDcguA7ZFCgYAw=s400-c-fcrop64=1,2ae10000de14ffff-nd-v1',
    };
    // const response = await fetch(this.url, {
    //   method: 'POST',
    //   body: formData,
    // });
    //
    // if (!response.ok) {
    //   throw new Error('Upload failed');
    // }

    // return response.json();
  }

  abort(): void {
    // Abort upload logic (if needed)
  }
}
