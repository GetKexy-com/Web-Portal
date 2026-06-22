import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EditorUtilsService {

  buildImagePlaceholderSvg(label: string, width: number, height: number, color: string): string {
    const fontSize = Math.max(30, Math.round(width / 18));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<rect width="100%" height="100%" fill="${color}"/>` +
      `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="${fontSize}" fill="#ffffff">${label}</text>` +
      `</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  buildVideoPlaceholderSvg(label: string, width: number, height: number): string {
    const r = Math.round(width / 12);
    const cx = width / 2;
    const cy = height / 2;
    const fontSize = Math.max(22, Math.round(width / 34));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#334155"/></linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="0.92"/>` +
      `<polygon points="${cx - 18},${cy - 28} ${cx - 18},${cy + 28} ${cx + 36},${cy}" fill="#0f172a"/>` +
      `<text x="50%" y="82%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="${fontSize}" fill="#ffffff">${label}</text>` +
      `</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getImageRatio(src: string): Promise<number> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => resolve(16 / 9);
      img.src = src;
    });
  }

  clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  escapeAttribute(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  normalizeFontTags(root: HTMLElement): void {
    const sizeMap: Record<string, string> = {
      '1': '10px', '2': '12px', '3': '14px', '4': '16px',
      '5': '18px', '6': '24px', '7': '30px'
    };
    root.querySelectorAll('font').forEach((fontTag) => {
      const span = document.createElement('span');
      span.innerHTML = fontTag.innerHTML;
      const styles: string[] = [];
      const color = fontTag.getAttribute('color');
      const face = fontTag.getAttribute('face');
      const size = fontTag.getAttribute('size');
      if (color) styles.push(`color:${color}`);
      if (face) styles.push(`font-family:${face}`);
      if (size) styles.push(`font-size:${sizeMap[size] || '14px'}`);
      span.setAttribute('style', styles.join(';'));
      fontTag.replaceWith(span);
    });
  }

  inlineEmailStyles(root: HTMLElement): void {
    const map: [string, string][] = [
      ['p', 'margin:0 0 16px; font-size:14px; line-height:1.6;'],
      ['h1', 'margin:0 0 16px; font-size:28px; line-height:1.25;'],
      ['h2', 'margin:0 0 14px; font-size:22px; line-height:1.3;'],
      ['h3', 'margin:0 0 12px; font-size:18px; line-height:1.35;'],
      ['ul', 'margin:0 0 16px 22px; padding:0;'],
      ['ol', 'margin:0 0 16px 22px; padding:0;'],
      ['li', 'margin:0 0 8px;'],
      ['blockquote', 'margin:0 0 16px; padding-left:12px; border-left:4px solid #b8dff8; color:#475569;'],
      ['table', 'width:100%; border-collapse:collapse; margin:0 0 16px;'],
      ['td', 'border:1px solid #d7deea; padding:8px;'],
      ['th', 'border:1px solid #d7deea; padding:8px; text-align:left; background:#f8fbff;'],
      ['a', 'color:#2ea3f2; text-decoration:underline;'],
    ];
    map.forEach(([selector, styles]) => {
      root.querySelectorAll(selector).forEach((el) => this.appendStyle(el as HTMLElement, styles));
    });
  }

  appendStyle(el: HTMLElement, styles: string): void {
    const current = el.getAttribute('style') || '';
    el.setAttribute('style', `${current}${current && !current.trim().endsWith(';') ? ';' : ''}${styles}`);
  }

  replaceNodeWithHtml(node: Element, html: string): void {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    node.replaceWith(template.content);
  }

  transformMediaBlocks(root: HTMLElement, escHtml: (v: string) => string, escAttr: (v: string) => string): void {
    root.querySelectorAll('.media-block').forEach((block) => {
      const el = block as HTMLElement;
      const align = el.dataset['align'] || 'center';
      const alignAttr = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
      // Full margin per alignment. Centering needs BOTH side margins auto; right
      // needs left auto; left needs right auto. (margin: top right bottom left)
      const blockMargin =
        align === 'right' ? '0 0 16px auto' :
        align === 'left' ? '0 auto 16px 0' :
        '0 auto 16px';
      const width = Number(el.dataset['width']) || 320;
      const height = Number(el.dataset['height']) || 180;
      const link = el.dataset['link'] || '';
      const alt = el.dataset['alt'] || '';
      const kind = el.dataset['kind'];

      if (kind === 'image') {
        const img = `<img src="${escAttr(el.dataset['src'] || '')}" alt="${escAttr(alt)}" width="${width}" height="${height}" style="display:block; width:${width}px; height:${height}px; border:0; outline:none; text-decoration:none;" />`;
        const content = link
          ? `<a href="${escAttr(link)}" target="_blank" rel="noopener" style="text-decoration:none;">${img}</a>`
          : img;
        this.replaceNodeWithHtml(el, `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="${alignAttr}" style="margin:${blockMargin}; border-collapse:collapse;">
            <tr><td align="${alignAttr}" style="padding:0; border:0;">${content}</td></tr>
          </table>
        `);
      } else {
        const href = link || '#';
        const poster = el.dataset['poster'] || '';
        const fileName = el.dataset['fileName'] || 'Video';
        this.replaceNodeWithHtml(el, `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="${alignAttr}" style="margin:${blockMargin}; border-collapse:collapse; width:${width}px;">
            <tr>
              <td align="${alignAttr}" style="padding:0; border:0;">
                <a href="${escAttr(href)}" target="_blank" rel="noopener" style="text-decoration:none; display:block;">
                  <img src="${escAttr(poster)}" alt="${escAttr(alt)}" width="${width}" height="${height}" style="display:block; width:${width}px; height:${height}px; border:0; outline:none; text-decoration:none;" />
                </a>
              </td>
            </tr>
            <tr>
              <td align="${alignAttr}" style="padding:10px 0 0; border:0; font-size:13px; font-family:Arial, Helvetica, sans-serif; font-weight:700; color:#1f2937;">${escHtml(alt || fileName)}</td>
            </tr>
            <tr>
              <td align="${alignAttr}" style="padding:10px 0 0; border:0;">
                <a href="${escAttr(href)}" target="_blank" rel="noopener" style="display:inline-block; padding:10px 16px; border-radius:999px; background:#111827; color:#ffffff; text-decoration:none; font-size:13px; font-weight:700; font-family:Arial, Helvetica, sans-serif;">&#9654; Watch video</a>
              </td>
            </tr>
          </table>
        `);
      }
    });
  }
}
