import { constants } from './constants';
import { kxConfirm } from './kx-dialogs';

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

/**
 * The warning before Activate / Resume when a Template email is blank. Saving, activating and
 * resuming with a blank email are ALLOWED (the client's decision, 2026-10-17: "it's not up to
 * you to tell me what I should and should not do"); a blank Template email is then sent blank.
 * Resolves true to go ahead (also when nothing is blank).
 */
export async function confirmBlankTemplateEmails(
  emails: { templateOptions?: string | null; emailContent?: string | null; emailSequence?: number }[] | null | undefined,
  action: 'activate' | 'resume',
): Promise<boolean> {
  const position = firstBlankTemplateEmailPosition(emails);
  if (!position) return true;
  return kxConfirm({
    title: `Email #${position} has no content`,
    text:
      'Template emails are sent exactly as written, so prospects will receive this one blank. ' +
      `${action === 'activate' ? 'Activate' : 'Resume'} anyway?`,
    icon: 'fa-exclamation',
    confirmText: action === 'activate' ? 'Activate anyway' : 'Resume anyway',
    cancelText: 'Go back',
    tone: 'danger',
  });
}
