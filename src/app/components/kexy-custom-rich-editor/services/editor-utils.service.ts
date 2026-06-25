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
    const r = Math.round(width / 24);
    const cx = width / 2;
    const cy = height / 2;
    const fontSize = Math.max(22, Math.round(width / 34));
    // Match drawPlayBadge: translucent white disc + solid white triangle whose
    // centroid sits at the disc center (base at cx-a, tip at cx+2a).
    const a = r * 0.26;
    const hh = r * 0.38;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#334155"/></linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="0.5"/>` +
      `<polygon points="${cx - a},${cy - hh} ${cx - a},${cy + hh} ${cx + 2 * a},${cy}" fill="#ffffff"/>` +
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

  /**
   * Grab a still frame from a local video file to use as its poster/thumbnail.
   * Loads the file into an off-DOM <video> (object URL, same-origin → canvas is
   * not tainted), seeks slightly past the start to avoid a black first frame,
   * draws it to a canvas and returns a JPEG data URL plus the real dimensions.
   * Rejects on error/timeout so the caller can fall back to a placeholder.
   */
  captureVideoPoster(file: File, seekTime = 0.2): Promise<{ poster: string; width: number; height: number; ratio: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      (video as HTMLVideoElement & { playsInline: boolean }).playsInline = true;
      video.crossOrigin = 'anonymous';

      let settled = false;
      const cleanup = () => { URL.revokeObjectURL(url); video.removeAttribute('src'); video.load(); };
      const done = (v: { poster: string; width: number; height: number; ratio: number }) => {
        if (settled) return; settled = true; clearTimeout(timer); cleanup(); resolve(v);
      };
      const fail = (e: unknown) => {
        if (settled) return; settled = true; clearTimeout(timer); cleanup(); reject(e);
      };
      const timer = setTimeout(() => fail(new Error('video poster capture timed out')), 8000);

      video.onloadedmetadata = () => {
        const dur = isFinite(video.duration) ? video.duration : 0;
        video.currentTime = dur ? Math.min(seekTime, dur / 2) : 0;
      };
      video.onseeked = () => {
        try {
          const width = video.videoWidth || 1280;
          const height = video.videoHeight || 720;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { fail(new Error('no 2d context')); return; }
          ctx.drawImage(video, 0, 0, width, height);
          // Bake the play-button circle straight into the captured frame so it
          // travels through export → preview → the recipient's inbox (email
          // clients can't reliably composite a CSS/HTML overlay).
          this.drawPlayBadge(ctx, width, height);
          done({ poster: canvas.toDataURL('image/jpeg', 0.82), width, height, ratio: width / height || 16 / 9 });
        } catch (e) { fail(e); }
      };
      video.onerror = () => fail(new Error('could not load video for poster capture'));
      video.src = url;
    });
  }

  /**
   * Draw a centered play-button badge onto a 2D canvas context: a translucent
   * white disc + a solid white right-pointing triangle + a soft drop shadow (for
   * definition on light thumbnails). Matches the reference design. Sized as a
   * proportion of the image so it looks consistent at any resolution. The
   * triangle's CENTROID is placed at the disc center (tip extends twice as far
   * right as the base sits left) so the icon reads as optically centered.
   */
  drawPlayBadge(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2;
    // Disc diameter ≈ 10% of width, never taller than the frame allows.
    const r = Math.max(8, Math.min(w * 0.05, h * 0.15));

    ctx.save();

    // Soft drop shadow so the disc still reads on light/busy thumbnails.
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = r * 0.3;
    ctx.shadowOffsetY = r * 0.04;

    // Translucent white disc.
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    // Solid white triangle, centroid at (cx, cy): base at cx - a, tip at cx + 2a
    // → centroid x = (-a - a + 2a)/3 + cx = cx. Drawn without the shadow.
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const a = r * 0.26;
    const hh = r * 0.38;
    ctx.beginPath();
    ctx.moveTo(cx - a, cy - hh);
    ctx.lineTo(cx - a, cy + hh);
    ctx.lineTo(cx + 2 * a, cy);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  /**
   * Return a copy of `src` (any image URL/data URL) with the play-button badge
   * baked into it. Used for custom video thumbnails so the play icon persists in
   * the exported email. Loads with crossOrigin so same-origin/CORS images stay
   * untainted; on any load/taint failure resolves to the original `src`
   * unchanged (so insertion still succeeds, just without a baked overlay).
   */
  compositePlayButton(src: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const w = img.naturalWidth || 1280;
          const h = img.naturalHeight || 720;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(src); return; }
          ctx.drawImage(img, 0, 0, w, h);
          this.drawPlayBadge(ctx, w, h);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(src); // tainted canvas (cross-origin without CORS) — keep original
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }

  clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Make a user-entered link absolute. Without a scheme, a value like
   * `www.example.com` or `example.com/watch` is treated by the browser/email
   * client as a path RELATIVE to the current page (e.g. the portal domain), so
   * the link points at the wrong URL. Prepend `https://` when no scheme is
   * present. Left untouched: empty, anchors (`#…`), root/protocol-relative
   * (`/…`, `//…`), merge tags (`[…]`), and anything that already has a scheme
   * (`https:`, `mailto:`, `tel:`, …).
   */
  normalizeUrl(url: string): string {
    const u = (url || '').trim();
    if (!u) return u;
    if (/^(#|\/|\[)/.test(u)) return u;        // anchor, root/protocol-relative, merge tag
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u; // already has a scheme (http, mailto, tel, …)
    return `https://${u}`;
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
    ];
    map.forEach(([selector, styles]) => {
      root.querySelectorAll(selector).forEach((el) => this.appendStyle(el as HTMLElement, styles));
    });

    // Anchors are handled separately:
    // - Color: only supply the default link color when the anchor has NO color of
    //   its own, so a user-applied text color on a link is preserved.
    // - Underline: do NOT force it. Links are underlined ONLY when the user applied
    //   underline (which lives on a <u>/text-decoration child). Email clients
    //   underline <a> by default, so neutralize that with `text-decoration:none`,
    //   UNLESS the anchor itself already carries a decoration (don't clobber it).
    root.querySelectorAll('a').forEach((aEl) => {
      const a = aEl as HTMLElement;
      if (!a.style.color) this.appendStyle(a, 'color:#2ea3f2;');
      if (!a.style.textDecoration && !a.style.textDecorationLine) {
        this.appendStyle(a, 'text-decoration:none;');
      }
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
      // Emit the legacy `align` attribute ONLY for centered blocks. `align="left"`
      // / `align="right"` FLOAT the table, so following paragraphs wrap up its side
      // instead of sitting below it (the reported "broken text"). Horizontal
      // positioning for left/right is done purely with the auto-margins below,
      // which keep the table in normal flow (block) so text goes underneath.
      const tableAlignAttr = align === 'center' ? ' align="center"' : '';
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

      // Inline styles are assembled into variables (rather than written directly
      // in the style="..." attribute) so the IDE's embedded CSS validator doesn't
      // try to parse the ${...} interpolations as CSS values and flag them.
      const imgStyle = `display:block; width:${width}px; height:${height}px; border:0; outline:none; text-decoration:none;`;

      if (kind === 'image') {
        const imageTableStyle = `margin:${blockMargin}; border-collapse:collapse;`;
        const img = `<img src="${escAttr(el.dataset['src'] || '')}" alt="${escAttr(alt)}" width="${width}" height="${height}" style="${imgStyle}" />`;
        const content = link
          ? `<a href="${escAttr(this.normalizeUrl(link))}" target="_blank" rel="noopener" style="text-decoration:none;">${img}</a>`
          : img;
        this.replaceNodeWithHtml(el, `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"${tableAlignAttr} style="${imageTableStyle}">
            <tr><td style="padding:0; border:0;">${content}</td></tr>
          </table>
        `);
      } else {
        const href = this.normalizeUrl(link) || '#';
        const poster = el.dataset['poster'] || '';
        const fileName = el.dataset['fileName'] || 'Video';
        // Reproduce the design-view card: light background, rounded corners, the
        // poster rounded at the top and a padded, left-aligned caption below.
        // The poster carries its own play-button badge (baked in at capture /
        // custom-thumbnail / placeholder time), so no overlay markup is needed.
        const videoTableStyle = `margin:${blockMargin}; border-collapse:separate; width:${width}px; background:#f8fbff; border-radius:5px; overflow:hidden;`;
        // line-height:0 on the poster cell removes the inline-image whitespace
        // gap that otherwise leaves a thin sliver under the thumbnail.
        const posterImgStyle = `display:block; width:${width}px; height:${height}px; border:0; outline:none; text-decoration:none; border-radius:5px 5px 0 0;`;
        const captionStyle = `padding:10px 12px 12px; border:0; font-size:13px; line-height:1.4; font-family:Arial, Helvetica, sans-serif; font-weight:700; color:#1f2937; text-align:left; word-break:break-word;`;
        this.replaceNodeWithHtml(el, `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"${tableAlignAttr} style="${videoTableStyle}">
            <tr>
              <td style="padding:0; border:0; line-height:0;">
                <a href="${escAttr(href)}" target="_blank" rel="noopener" style="text-decoration:none; display:block;">
                  <img src="${escAttr(poster)}" alt="${escAttr(alt)}" width="${width}" height="${height}" style="${posterImgStyle}" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="${captionStyle}">${escHtml(alt || fileName)}</td>
            </tr>
          </table>
        `);
      }
    });
  }
}
