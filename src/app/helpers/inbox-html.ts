import { constants } from './constants';

/*
 * What KexyApi does to a drip email's body on the way out (KexyApi
 * `src/drip-campaigns/inbox-html.ts`), so the Preview drawer shows what the inbox gets.
 * A COPY: keep the two in step — a change on the server must be made here too.
 */

const HTML_STYLE = 'html';

/**
 * Makes a stored email body look in the inbox the way it looks in the editor, as if it
 * had been typed into the mail client's own compose window. Run on the way out by the
 * real send and the test send; the stored body is never changed.
 *
 * 1. **No body padding.** The editor's Plain Text export is a document whose `<body>`
 *    carries `padding:14px` — the editor canvas's own margin. Gmail keeps it, so every
 *    email was indented 14px from the sender line, which a composed email never is.
 * 2. **Line breaks that only CSS kept become `<br>`.** Text pasted into the editor can
 *    arrive as `<span style="white-space: pre-wrap">Line 1\nLine 2</span>`. A browser
 *    (and so the editor and the portal's preview) shows two lines; Gmail drops
 *    `white-space` and shows one ("Scott Graham, Founder TubeSurge (a KEXY company) …").
 * 3. **Composed, not a web page** — Plain Text style only (`plainText`); a designed (HTML
 *    style) email is left as it is. See {@link toComposedHtml}.
 */
export function toInboxHtml(
  html: string,
  opts: { plainText?: boolean; userWritten?: boolean } = {},
): string {
  if (!html) return html;
  const fixed = preserveCssLineBreaks(removeBodyPadding(html));
  return opts.plainText ? toComposedHtml(fixed, !!opts.userWritten) : fixed;
}

/**
 * The {@link toInboxHtml} options for one drip email. User-written = a Template email.
 * Plain Text unless it is a Template email styled HTML: an AI-written email (Spintax /
 * Prospect Insights) is always written as plain paragraphs — the style is not sent to the
 * AI — so an "HTML" style on one means nothing and must not skip the typed clean-up.
 * Older rows have no style; the editor's default is Plain Text.
 */
export function inboxHtmlOptions(email: {
  emailStyle?: string | null;
  templateOptions?: string | null;
}): { plainText: boolean; userWritten: boolean } {
  return {
    plainText: email.templateOptions !== constants.TEMPLATE_KEY || email.emailStyle !== HTML_STYLE,
    userWritten: email.templateOptions === constants.TEMPLATE_KEY,
  };
}

/**
 * Builds a Plain Text email the way a mail client's compose window does: the content in a
 * `<div dir="ltr">`, not a whole HTML page. docs/inbox-placement.md, option 3 (variant 2,
 * client's decision 2026-10-17):
 *
 * - **Every email:** no doctype, `<html>`, `<head>` or `<title>` — a page wrapper a typed
 *   email never has. The `<body>`'s style moves onto the `<div>`, and `data-*` attributes
 *   (pasted editor markers) are dropped. Neither changes how the email looks.
 * - **AI-written emails only** (`userWritten` false — Spintax / Prospect Insights): inline
 *   styles keep only what a compose window can set (bold, italic, underline /
 *   strikethrough, alignment), so the email shows in the reader's own font.
 * - **Template emails (`userWritten`) keep every style the user set** — the user chose
 *   that look, so it goes out exactly as it looks in the editor.
 */
export function toComposedHtml(html: string, userWritten: boolean): string {
  const { content, bodyStyle } = unwrapDocument(html);
  let out = stripDataAttributes(content).trim();
  if (!userWritten) out = keepComposeStylesOnly(out);
  const style = bodyStyle ? ` style="${bodyStyle.replace(/"/g, '&quot;')}"` : '';
  return `<div dir="ltr"${style}>${out}</div>`;
}

/**
 * What is inside `<body>`, and the body's own style. A fragment (no document) comes back
 * as it is. `<style>` blocks would be kept, but no stored email has one (checked
 * 2026-10-17); the head holds only `<meta>` and `<title>`.
 */
export function unwrapDocument(html: string): { content: string; bodyStyle: string } {
  if (!/<!doctype\b|<html[\s>]|<body[\s>]/i.test(html)) return { content: html, bodyStyle: '' };
  const styles = (html.match(/<style\b[\s\S]*?<\/style\s*>/gi) ?? []).join('');
  const body = /<body\b([^>]*)>([\s\S]*?)(<\/body\s*>|$)/i.exec(html);
  if (!body) {
    // A document with no <body>: drop the wrapper tags only.
    const content = html
      .replace(/<!doctype[^>]*>/gi, '')
      .replace(/<head\b[\s\S]*?<\/head\s*>/gi, '')
      .replace(/<\/?html\b[^>]*>/gi, '');
    return { content: styles + content, bodyStyle: '' };
  }
  const bodyStyle = /style\s*=\s*(["'])([\s\S]*?)\1/i.exec(body[1])?.[2]?.trim() ?? '';
  // Already-escaped quotes inside the attribute stay escaped when it is re-written.
  return {
    content: styles + body[2].replace(/<\/html\s*>\s*$/i, ''),
    bodyStyle: bodyStyle.replace(/&quot;/g, "'"),
  };
}

/** Drops `data-*` attributes from every tag; text is never touched. */
export function stripDataAttributes(html: string): string {
  return html.replace(/<[a-z][^>]*>/gi, (tag) =>
    tag.replace(/\s+data-[\w-]+(\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi, ''),
  );
}

/** Style properties a compose window can set (bold, italic, underline, alignment). */
const COMPOSE_STYLE_PROPS = /^(font-weight|font-style|text-decoration(-line)?|text-align)$/i;

/**
 * Keeps only {@link COMPOSE_STYLE_PROPS} in every `style` attribute; one left empty is
 * removed. Fonts, sizes, colours, line heights, backgrounds, borders and margins go, so the
 * reader's default font shows, as in a typed email. Never changes text or other attributes.
 */
export function keepComposeStylesOnly(html: string): string {
  return html.replace(/<[a-z][^>]*>/gi, (tag) =>
    tag.replace(/\s+style\s*=\s*(["'])([\s\S]*?)\1/i, (_m, quote: string, css: string) => {
      const kept = css
        .replace(/&quot;/g, "'")
        .split(';')
        .map((d) => d.trim())
        .filter((d) => COMPOSE_STYLE_PROPS.test(d.split(':')[0]?.trim() ?? '') && d.includes(':'));
      return kept.length ? ` style=${quote}${kept.join('; ')}${quote}` : '';
    }),
  );
}

/** Replaces every `padding` declaration in the `<body>` tag's style with `padding:0`. */
export function removeBodyPadding(html: string): string {
  return html.replace(/<body\b[^>]*>/i, (tag) =>
    tag.replace(
      /(style\s*=\s*)(["'])([\s\S]*?)\2/i,
      (_m, attr: string, quote: string, css: string) => {
        // `&quot;` (quoted font names) ends in `;` — make it a CSS quote before splitting.
        const declarations = css
          .replace(/&quot;/g, "'")
          .split(';')
          .map((d) => d.trim())
          .filter((d) => d && !/^padding(-[a-z]+)?\s*:/i.test(d));
        return `${attr}${quote}${[...declarations, 'padding:0'].join('; ')};${quote}`;
      },
    ),
  );
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

/** Elements whose own text is never shown, so their newlines are left alone. */
const RAW_TEXT_TAGS = new Set(['style', 'script', 'title', 'head']);

/** `white-space` values that keep newlines, and the same as the newer longhand
 * `white-space-collapse` (what Chrome writes on copy: `white-space-collapse: preserve`). */
const KEEPS_BREAKS =
  /white-space\s*:\s*(pre|pre-wrap|pre-line|break-spaces)\b|white-space-collapse\s*:\s*(preserve|preserve-breaks|preserve-spaces|break-spaces)\b/i;
const COLLAPSES_BREAKS =
  /white-space\s*:\s*(normal|nowrap)\b|white-space-collapse\s*:\s*collapse\b/i;

/**
 * Turns newlines into `<br>` inside elements styled `white-space: pre | pre-wrap |
 * pre-line` or `white-space-collapse: preserve`. Only text is touched, never a tag or an attribute, and everywhere else a
 * newline stays what HTML makes it: a space.
 */
export function preserveCssLineBreaks(html: string): string {
  if (!/white-space\s*:\s*pre|white-space-collapse\s*:\s*(preserve|break)/i.test(html)) return html;

  // One entry per open element: its tag name and whether it (or an ancestor) keeps breaks.
  const stack: { tag: string; keeps: boolean; raw: boolean }[] = [];
  const tokens = html.split(/(<!--[\s\S]*?-->|<[^>]+>)/);

  return tokens
    .map((token) => {
      if (!token) return token;
      if (token.startsWith('<!--')) return token;

      if (token.startsWith('<')) {
        const close = /^<\/\s*([a-z0-9-]+)/i.exec(token);
        if (close) {
          const name = close[1].toLowerCase();
          const at = stack.map((e) => e.tag).lastIndexOf(name);
          if (at !== -1) stack.length = at;
          return token;
        }
        const open = /^<\s*([a-z0-9-]+)/i.exec(token);
        if (!open) return token; // <!DOCTYPE …>, <?xml …?>
        const name = open[1].toLowerCase();
        if (VOID_TAGS.has(name) || /\/\s*>$/.test(token)) return token;
        const parent = stack[stack.length - 1];
        const style = /style\s*=\s*(["'])([\s\S]*?)\1/i.exec(token)?.[2] ?? '';
        const own = KEEPS_BREAKS.test(style);
        const resets = COLLAPSES_BREAKS.test(style);
        stack.push({
          tag: name,
          keeps: own ? true : resets ? false : !!parent?.keeps,
          raw: RAW_TEXT_TAGS.has(name) || !!parent?.raw,
        });
        return token;
      }

      const current = stack[stack.length - 1];
      if (!current?.keeps || current.raw) return token;
      return token.replace(/\r\n|\r|\n/g, '<br>');
    })
    .join('');
}

/**
 * KexyApi `AiEmailService.formatUSPhoneNumbers`, which the send runs on every drip body
 * (Template and AI). Text only — never inside a tag — and `(NNN)` stays one bracket. NOT
 * `PageUiService.formatUSPhoneNumbers` (profile phone fields; always adds +1).
 */
export function formatUSPhoneNumbers(html: string): string {
  return html
    .split(/(<!--[\s\S]*?-->|<[^>]+>)/)
    .map((part) => (part.startsWith('<') ? part : formatPhonesInText(part)))
    .join('');
}

function formatPhonesInText(text: string): string {
  return text.replace(/(?<![\w/=?&.+(-])\+?(?:\((?=\d{3}\)))?\d[\d\s().-]{9,}\d/g, (match) => {
    let digits = match.replace(/\D/g, '');
    const hasPlus = match.startsWith('+');
    if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
    if (digits.length === 10) {
      const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      return hasPlus ? `+1 ${formatted}` : formatted;
    }
    return match;
  });
}
