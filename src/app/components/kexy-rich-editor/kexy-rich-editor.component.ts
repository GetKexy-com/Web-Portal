import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { environment } from '../../../environments/environment';
import {
  Autoformat,
  BlockQuote,
  Bold,
  Image,
  ClassicEditor,
  CloudServices,
  Essentials, Heading, ImageCaption, ImageResize, ImageStyle, ImageToolbar, ImageUpload, Indent, IndentBlock,
  Italic, Link, List, MediaEmbed, Mention,
  Paragraph, PasteFromOffice, PictureEditing, Table, TableColumnResize, TableToolbar, TextTransformation,
  Underline, SourceEditing,
} from 'ckeditor5';

@Component({
  selector: 'kexy-rich-editor',
  encapsulation: ViewEncapsulation.None,
  imports: [CKEditorModule],
  standalone: true,
  templateUrl: './kexy-rich-editor.component.html',
  styleUrl: './kexy-rich-editor.component.scss',
})
export class KexyRichEditorComponent {
  @Input() content = '';
  @Input() border = false;
  @Input() onContentUpdate;

  public Editor = ClassicEditor;
  public config = {
    licenseKey: 'GPL', // Or 'GPL'.
    extraPlugins: [CustomUploadAdapterPlugin],
    plugins: [
      Autoformat,
      BlockQuote,
      Bold,
      CloudServices,
      Essentials,
      Heading,
      Image,
      ImageCaption,
      ImageResize,
      ImageStyle,
      ImageToolbar,
      ImageUpload,
      Indent,
      IndentBlock,
      Italic,
      Link,
      List,
      MediaEmbed,
      Mention,
      Paragraph,
      PasteFromOffice,
      PictureEditing,
      Table,
      TableColumnResize,
      TableToolbar,
      TextTransformation,
      Underline,
      SourceEditing,
    ],
    toolbar: [
      'sourceEditing', '|',
      {
        label: 'Fonts',
        items: [ 'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor' ]
      },
      '|',
      'undo',
      'redo',
      '|',
      'heading',
      '|',
      'bold',
      'italic',
      'underline',
      'strikethrough',
      '|',
      'alignment',
      '|',
      'link',
      'uploadImage',
      'insertTable',
      'blockQuote',
      'mediaEmbed',
      '|',
      {
        label: 'Lists',
        icon: false,
        items: [ 'bulletedList', 'numberedList', 'todoList' ]
      },
      '|',
      'outdent',
      'indent',
    ],
    image: {
      resizeOptions: [
        {
          name: 'resizeImage:original',
          label: 'Default image width',
          value: null,
        },
        {
          name: 'resizeImage:50',
          label: '50% page width',
          value: '50',
        },
        {
          name: 'resizeImage:75',
          label: '75% page width',
          value: '75',
        },
      ],
      toolbar: [
        'imageTextAlternative',
        'toggleImageCaption',
        '|',
        'imageStyle:inline',
        'imageStyle:wrapText',
        'imageStyle:breakText',
        '|',
        'resizeImage',
      ],
    },
    link: {
      addTargetToExternalLinks: true,
      defaultProtocol: 'https://',
    },
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
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
  private url: string = environment.baseUrl + `landing-pages/save-image`;

  constructor(loader: any) {
    this.loader = loader;
  }

  async upload(): Promise<any> {
    const file = await this.loader.file;
    return await this.sendFile(file);
  }

  private async sendFile(file: File): Promise<any> {
    const based64String = await this.getBase64FromFile(file);
    const userToken = localStorage.getItem('userToken');
    if (!userToken) {
      throw new Error('Unauthorized');
      return;
    }
    const authToken = JSON.parse(userToken);
    const payload = {
      imageData: based64String,
    };

    return new Promise(async (resolve, reject) => {
      const response: Response = await fetch(this.url, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: {
          'Authorization': `Bearer ${authToken.token}`,
          'Content-Type': 'application/json',
        },
      });
      // Parse JSON response
      const responseData = await response.json();
      return resolve({
        default: environment.imageUrl + responseData['data'].name,
      });
    });
  }

  private getBase64FromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        // `reader.result` is a Base64 string (data URL)
        resolve(reader.result as string);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsDataURL(file); // Converts file to base64
    });
  }

  abort(): void {
    // Abort upload logic (if needed)
  }
}
