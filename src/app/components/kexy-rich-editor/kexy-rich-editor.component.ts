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
  Underline, SourceEditing, Alignment, Font, FontSize, FontFamily, Strikethrough, TodoList, LinkImage,
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
  @Input() border = false;
  @Input() onContentUpdate: (data: { rawHtml: string; emailHtml: string }) => void;

  @Input() set content(value: string) {
    this._rawContent = value ?? '';
  }
  get content(): string {
    return this._rawContent;
  }

  private _rawContent = '';

  public Editor = ClassicEditor;
  public config = {
    licenseKey: 'GPL',
    extraPlugins: [CustomUploadAdapterPlugin],
    plugins: [
      Autoformat, Alignment, Font, FontSize, FontFamily, Strikethrough,
      BlockQuote, Bold, CloudServices, Essentials, Heading, Image,
      ImageCaption, ImageResize, ImageStyle, ImageToolbar, ImageUpload,
      Indent, IndentBlock, Italic, Link, TodoList, List, MediaEmbed,
      Mention, Paragraph, PasteFromOffice, PictureEditing, Table,
      TableColumnResize, TableToolbar, TextTransformation, Underline,
      SourceEditing, LinkImage,
    ],
    toolbar: [
      'sourceEditing', '|',
      'bulletedList', 'numberedList', 'todoList', '|',
      'undo', 'redo', '|',
      'uploadImage', 'linkImage', '|',
      'heading', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'alignment', '|',
      'font', 'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
      'link', 'insertTable', 'blockQuote', 'mediaEmbed', '|',
      'outdent', 'indent',
    ],
    image: {
      resizeOptions: [
        { name: 'resizeImage:original', label: 'Default image width', value: null },
        { name: 'resizeImage:50', label: '50% page width', value: '50' },
        { name: 'resizeImage:75', label: '75% page width', value: '75' },
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
    shouldNotGroupWhenFull: false,
  };

  onChange = ({ editor }) => {
    setTimeout(() => {
      this._rawContent = editor.getData();
      const emailHtml = convertImagesToEmailSafe(this._rawContent);
      this.onContentUpdate({ rawHtml: this._rawContent, emailHtml });
    }, 10);
  };
}

// ─── Image Email Conversion ───────────────────────────────────────────────────

function convertImagesToEmailSafe(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove any images with missing or empty src — ghost nodes from failed uploads
  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (!src || src.trim() === '') {
      const parent = img.closest('figure') ?? img.parentElement;
      if (parent && parent.querySelectorAll('img').length === 1) {
        parent.remove();
      } else {
        img.remove();
      }
    }
  });

  doc.querySelectorAll('figure.image').forEach((figure: Element) => {
    const img = figure.querySelector('img');
    if (!img) return;

    const figureEl = figure as HTMLElement;
    const classList = figure.classList;

    // --- 1. Resolve true width ---
    const imgWidthAttr = img.getAttribute('width') ?? '';
    const figureStyleWidth = figureEl.style.width ?? '';
    const isPercentage = (v: string) => v.includes('%');

    const resolvedWidth =
      isPercentage(imgWidthAttr)
        ? imgWidthAttr
        : isPercentage(figureStyleWidth) && figureStyleWidth !== '100%'
          ? figureStyleWidth
          : null;

    img.removeAttribute('width');
    img.removeAttribute('height');
    img.style.removeProperty('aspect-ratio');
    img.style.width = resolvedWidth ?? '100%';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';

    // --- 2. Resolve alignment ---
    const isLeft = classList.contains('image-style-block-align-left');
    const isRight = classList.contains('image-style-block-align-right');

    let wrapperStyle = '';
    let imgAlign = '';

    if (isLeft) {
      wrapperStyle = [
        'float: left',
        'margin: 0 16px 8px 0',
        `width: ${resolvedWidth ?? '100%'}`,
      ].join('; ') + ';';
      imgAlign = 'left';
    } else if (isRight) {
      wrapperStyle = [
        'float: right',
        'margin: 0 0 8px 16px',
        `width: ${resolvedWidth ?? '100%'}`,
      ].join('; ') + ';';
      imgAlign = 'right';
    } else {
      wrapperStyle = [
        'text-align: center',
        'margin-left: auto',
        'margin-right: auto',
        `width: ${resolvedWidth ?? '100%'}`,
      ].join('; ') + ';';
    }

    if (imgAlign) {
      img.setAttribute('align', imgAlign);
    }

    // --- 3. Replace <figure> with <div> ---
    const wrapper = doc.createElement('div');
    wrapper.setAttribute('style', wrapperStyle);
    while (figure.firstChild) {
      wrapper.appendChild(figure.firstChild);
    }
    figure.parentNode?.replaceChild(wrapper, figure);
  });

  // --- 4. Clearfix after floated wrappers ---
  doc.querySelectorAll('div[style*="float"]').forEach((floatDiv) => {
    const clearfix = doc.createElement('div');
    clearfix.setAttribute('style', 'clear: both;');
    floatDiv.parentNode?.insertBefore(clearfix, floatDiv.nextSibling);
  });

  return doc.body.innerHTML;
}

// ─── Upload Adapter ───────────────────────────────────────────────────────────

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
    const base64String = await this.getBase64FromFile(file);
    const userToken = localStorage.getItem('userToken');
    if (!userToken) throw new Error('Unauthorized');
    const authToken = JSON.parse(userToken);

    return new Promise(async (resolve, reject) => {
      const response: Response = await fetch(this.url, {
        method: 'PATCH',
        body: JSON.stringify({ imageData: base64String }),
        headers: {
          'Authorization': `Bearer ${authToken.token}`,
          'Content-Type': 'application/json',
        },
      });
      const responseData = await response.json();
      resolve({ default: environment.imageUrl + responseData['data'].name });
    });
  }

  private getBase64FromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  abort(): void {}
}
