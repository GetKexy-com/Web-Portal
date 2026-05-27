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
  @Input() content = '';
  @Input() border = false;
  @Input() onContentUpdate;

  public Editor = ClassicEditor;
  public config = {
    licenseKey: 'GPL',
    extraPlugins: [CustomUploadAdapterPlugin],
    plugins: [
      Autoformat,
      Alignment,
      Font,
      FontSize,
      FontFamily,
      Strikethrough,
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
      TodoList,
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
      LinkImage
    ],

    toolbar: [
      'sourceEditing', '|',
      '|',
      'bulletedList', 'numberedList', 'todoList', '|',
      'undo',
      'redo',
      '|',
      'uploadImage',
      'linkImage',
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
      'font', 'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor',
      '|',
      'link',
      'insertTable',
      'blockQuote',
      'mediaEmbed',
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
    shouldNotGroupWhenFull: false,
  };

  onChange = ({ editor }) => {
    setTimeout(() => {
      const rawHtml = editor.getData();
      const emailSafeHtml = convertImagesToEmailSafe(rawHtml);
      console.log(emailSafeHtml);
      // Pass a proxy editor object so callers get email-safe HTML via editor.getData()
      const editorProxy = {
        ...editor,
        getData: () => emailSafeHtml,
      };
      this.onContentUpdate(editorProxy);
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

/**
 * Converts CKEditor's resized image markup to email-safe HTML.
 *
 * CKEditor outputs:
 *   <figure class="image image_resized" style="width:50%;">
 *     <img src="..." style="aspect-ratio:...">
 *   </figure>
 *
 * Email clients ignore CSS, so we:
 *   1. Pull the % width off the <figure> and write it as width="50%" on <img>
 *   2. Unwrap the <figure> (most email clients don't support it)
 *   3. Keep the src and alt intact
 */
function convertImagesToEmailSafe(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('figure.image').forEach((figure: Element) => {
    const img = figure.querySelector('img');
    if (!img) return;

    const figureEl = figure as HTMLElement;

    // --- 1. Extract true width ---
    // CKEditor puts the real resize % on the <img> width attribute (e.g. "60.28%")
    // The <figure> style.width is the container width (often 100%), not the resize value
    const imgWidthAttr = img.getAttribute('width') ?? '';
    const figureStyleWidth = figureEl.style.width ?? '';

    // Use img width attr if it's a percentage, else fall back to figure style
    const isPercentage = (v: string) => v.includes('%');
    const resolvedWidth = isPercentage(imgWidthAttr)
      ? imgWidthAttr                          // e.g. "60.28%"
      : isPercentage(figureStyleWidth) && figureStyleWidth !== '100%'
        ? figureStyleWidth
        : null;                               // null = no explicit resize, use full width

    // Remove invalid % from width attribute — email clients expect px or nothing
    img.removeAttribute('width');
    img.removeAttribute('height');            // aspect-ratio height is also meaningless in email

    if (resolvedWidth) {
      img.style.width = resolvedWidth;
      img.style.maxWidth = '100%';
    } else {
      img.style.width = '100%';
      img.style.maxWidth = '100%';
    }
    img.style.height = 'auto';               // always override CKEditor's aspect-ratio height
    img.style.display = 'block';

    // Remove aspect-ratio from img style (set by CKEditor, breaks email layout)
    img.style.removeProperty('aspect-ratio');

    // --- 2. Alignment ---
    const classList = figure.classList;
    let wrapperStyle = '';
    let imgAlign = '';

    if (classList.contains('image-style-align-left') || classList.contains('image-style-side-left')) {
      wrapperStyle = `float: left; margin: 0 16px 8px 0;`;
      if (resolvedWidth) wrapperStyle += ` width: ${resolvedWidth};`;
      imgAlign = 'left';
    } else if (
      classList.contains('image-style-align-right') ||
      classList.contains('image-style-side') ||
      classList.contains('image-style-side-right')
    ) {
      wrapperStyle = `float: right; margin: 0 0 8px 16px;`;
      if (resolvedWidth) wrapperStyle += ` width: ${resolvedWidth};`;
      imgAlign = 'right';
    } else {
      // Center or default
      wrapperStyle = `text-align: center; margin-left: auto; margin-right: auto;`;
      if (resolvedWidth) wrapperStyle += ` width: ${resolvedWidth};`;
      else wrapperStyle += ` width: 100%;`;
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

  // Clearfix after floated wrappers
  doc.querySelectorAll('div[style*="float"]').forEach((floatDiv) => {
    const clearfix = doc.createElement('div');
    clearfix.setAttribute('style', 'clear: both;');
    floatDiv.parentNode?.insertBefore(clearfix, floatDiv.nextSibling);
  });

  return doc.body.innerHTML;
}
