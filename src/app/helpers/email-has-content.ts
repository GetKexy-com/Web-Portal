import { constants } from './constants';

/**
 * Whether email HTML has anything a reader would see: text, or an image/video. The same rule
 * as KexyApi's `email-has-content.ts` (keep the two in step): the editor's `getHtml()` is a
 * full document even when the body is blank, and its `<title>` is the subject, so only the
 * body counts. Merge tags and spintax count as text.
 */
export function emailHasContent(html: string | null | undefined): boolean {
  if (!html) return false;
  const body = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<(title|style|script)[\s\S]*?<\/\1>/gi, '');
  if (/<(img|video)\b/i.test(body)) return true;
  const text = body
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, '')
    .replace(/[\s ​]+/g, '');
  return text.length > 0;
}

/**
 * The place (1-based, by order) of the first Template email with an empty body, or null.
 * A Template email is sent exactly as stored, so a blank one would go out blank. AI emails
 * are written per prospect and don't count. The API refuses the activation the same way.
 */
export function firstBlankTemplateEmailPosition(
  emails: { templateOptions?: string | null; emailContent?: string | null; emailSequence?: number }[] | null | undefined,
): number | null {
  const ordered = [...(emails ?? [])].sort(
    (a, b) => Number(a.emailSequence ?? 0) - Number(b.emailSequence ?? 0),
  );
  const index = ordered.findIndex(
    (e) => e.templateOptions === constants.TEMPLATE_KEY && !emailHasContent(e.emailContent),
  );
  return index === -1 ? null : index + 1;
}
