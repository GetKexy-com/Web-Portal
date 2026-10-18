import Swal, { SweetAlertOptions } from 'sweetalert2';

/**
 * Every SweetAlert popup in the portal in the current design — the `.kx-discard-popup` frame
 * of `kxConfirm` / `kxNotice` (helpers/kx-dialogs.ts): rounded card, a small tinted badge
 * instead of SweetAlert's 5em animated icon, pill buttons, the blurred backdrop.
 *
 * Installed once in `main.ts`, it wraps `Swal.fire`, so the ~190 existing calls (and new ones)
 * get the design without being rewritten. Nothing about what a popup does changes: same title,
 * text, buttons and result. Only how it looks:
 *
 * - **Badge** from the popup's `icon`; with none, from its title ("Error" → error, "Success"
 *   → success, "Are you sure?" → caution, else info). The badge says what the popup is about,
 *   and there is no amber (owner's picks, 2026-10-18):
 *   - a confirm that deletes / removes something: red, a bin (un-enroll / unsubscribe: a
 *     person with a cross);
 *   - any other confirm whose wording names its action: blue, that action's icon (launch 🚀,
 *     (re)activate ▶, buy 💳, send ✈, add / save ＋) — see `ACTION_GLYPHS`;
 *   - a caution or error: red "!"; success: green check (+ green button); info: blue "i";
 *     a question with nothing more specific: blue "?".
 * - **Buttons**: SweetAlert's inline colours (`confirmButtonColor` …) are dropped for the
 *   pill classes. A confirm whose wording deletes / removes something is red; every other
 *   confirm is blue. Cancel sits on the left (as in `kxConfirm`) unless the call says otherwise.
 * - **`text`** is escaped into the same lead paragraph `kxNotice` uses; a plain-text `html`
 *   (e.g. `Swal.fire('Error', e.message)`) gets it too; markup is left as written.
 * - **Popups already in the design** (any `kx-` class in `customClass.popup`) are untouched.
 *   Another `customClass` is kept and added to.
 * - A popup with no buttons and no icon (the "Please wait…" loaders) gets no badge.
 */
export function installKxSwalTheme(): void {
  const swal = Swal as unknown as { fire: (...args: unknown[]) => unknown; __kxThemed?: boolean };
  if (swal.__kxThemed) return;
  const fire = swal.fire.bind(Swal);
  swal.fire = (...args: unknown[]) => fire(kxSwalTheme(toParams(args)));
  swal.__kxThemed = true;
}

/** What the call asked for: its icon, or what its title reads as. */
type Tone = 'error' | 'warning' | 'success' | 'info';

/** How it is drawn: the badge colour and its glyph. */
type Look = 'delete' | 'action' | 'error' | 'question' | 'success' | 'info';

const LOOK: Record<Look, { popup: string; glyph: string; icon: string }> = {
  delete: { popup: 'kx-discard-popup', glyph: 'fa-trash-o', icon: 'warning' },
  action: { popup: 'kx-discard-popup kx-discard-popup--info', glyph: 'fa-check', icon: 'question' },
  error: { popup: 'kx-discard-popup', glyph: 'fa-exclamation', icon: 'error' },
  question: { popup: 'kx-discard-popup kx-discard-popup--info', glyph: 'fa-question', icon: 'question' },
  success: { popup: 'kx-discard-popup kx-discard-popup--info kx-discard-popup--success', glyph: 'fa-check', icon: 'success' },
  info: { popup: 'kx-discard-popup kx-discard-popup--info', glyph: 'fa-info', icon: 'info' },
};

/** A confirm's own action, read from its button and title → the badge's icon (first match). */
const ACTION_GLYPHS: [RegExp, string][] = [
  [/\blaunch/i, 'fa-rocket'],
  [/\b(re)?activate|\bresume|\brestart/i, 'fa-play'],
  [/\b(buy|purchase|upgrade)\b/i, 'fa-credit-card'],
  [/\bsend\b/i, 'fa-paper-plane'],
  [/\b(add|save)\b/i, 'fa-plus'],
];

/** Destructive wording about a person rather than a thing → a person with a cross, not a bin. */
const REMOVES_PERSON = /\b(un-?enroll|unsubscribe)/i;

/** Confirm wording that destroys or takes something away → a red button. */
const DESTRUCTIVE = /\b(delete|remove|discard|un-?enroll|unsubscribe|disconnect|archive|revoke|cancel (my|the|your|subscription|plan))\b/i;

/** `Swal.fire(title, html, icon)` → the options object, as SweetAlert itself reads it. */
function toParams(args: unknown[]): SweetAlertOptions {
  const [first] = args;
  if (first && typeof first === 'object' && !(first instanceof Element)) {
    return { ...(first as SweetAlertOptions) };
  }
  const params: Record<string, unknown> = {};
  (['title', 'html', 'icon'] as const).forEach((name, i) => {
    const arg = args[i];
    if (typeof arg === 'string' || arg instanceof Element) params[name] = arg;
  });
  return params as SweetAlertOptions;
}

export function kxSwalTheme(input: SweetAlertOptions): SweetAlertOptions {
  const p: Record<string, any> = { ...input };
  const callerClass = (p['customClass'] ?? {}) as Record<string, string>;
  if (typeof callerClass === 'object' && /\bkx-/.test(callerClass['popup'] ?? '')) return input;
  if (p['toast']) return input;

  const words = `${p['confirmButtonText'] ?? ''} ${p['title'] ?? ''}`;
  const destructive = !!p['showCancelButton'] && DESTRUCTIVE.test(words);
  const tone = toneOf(p);
  const actionGlyph = p['showCancelButton']
    ? ACTION_GLYPHS.find(([re]) => re.test(words))?.[1]
    : undefined;
  const look: Look = destructive
    ? 'delete'
    : tone === 'error'
      ? 'error'
      : actionGlyph
        ? 'action'
        : tone === 'warning'
          ? 'error'
          : p['icon'] === 'question'
            ? 'question'
            : tone;
  const glyph =
    look === 'delete' && REMOVES_PERSON.test(words)
      ? 'fa-user-times'
      : look === 'action'
        ? actionGlyph!
        : LOOK[look].glyph;
  const showConfirm = p['showConfirmButton'] !== false;
  const hasButtons = showConfirm || !!p['showCancelButton'] || !!p['showDenyButton'];
  const badge = p['icon'] || hasButtons;

  if (badge && !p['iconHtml'] && !p['imageUrl']) {
    p['icon'] = LOOK[look].icon;
    p['iconHtml'] = `<i class="fa ${glyph}" aria-hidden="true"></i>`;
  }

  if (typeof p['text'] === 'string' && p['text'] && !p['html']) {
    p['html'] = lead(escapeHtml(p['text']));
    delete p['text'];
  } else if (typeof p['html'] === 'string' && p['html'] && !/<[a-z!/]/i.test(p['html'])) {
    p['html'] = lead(p['html']);
  }

  const confirmClass = destructive
      ? 'kx-discard-btn--danger'
      : !p['showCancelButton'] && look === 'success'
        ? 'kx-discard-btn--success'
        : 'kx-discard-btn--primary';

  delete p['confirmButtonColor'];
  delete p['cancelButtonColor'];
  delete p['denyButtonColor'];
  p['buttonsStyling'] = false;
  p['reverseButtons'] = p['reverseButtons'] ?? true;
  p['width'] = p['width'] ?? '28rem';
  p['customClass'] = {
    ...callerClass,
    popup: join(LOOK[look].popup, badge ? '' : 'kx-discard-popup--plain', callerClass['popup']),
    icon: join('kx-discard-icon', callerClass['icon']),
    title: join('kx-discard-title', callerClass['title']),
    htmlContainer: join('kx-discard-body', callerClass['htmlContainer']),
    actions: join('kx-discard-actions', callerClass['actions']),
    confirmButton: join('kx-discard-btn', confirmClass, callerClass['confirmButton']),
    cancelButton: join('kx-discard-btn kx-discard-btn--ghost', callerClass['cancelButton']),
    denyButton: join('kx-discard-btn kx-discard-btn--ghost', callerClass['denyButton']),
    ...(p['timerProgressBar'] ? { timerProgressBar: join('kx-success-progress', callerClass['timerProgressBar']) } : {}),
  };
  return p as SweetAlertOptions;
}

function toneOf(p: Record<string, any>): Tone {
  switch (p['icon']) {
    case 'error':
    case 'warning':
    case 'success':
    case 'info':
      return p['icon'];
    case 'question':
      return 'info';
  }
  const title = typeof p['title'] === 'string' ? p['title'] : '';
  if (/\b(error|failed|failure|oops|invalid|unable|denied|wrong|not allowed)\b/i.test(title)) return 'error';
  if (/\b(success|successful(ly)?|saved|done|updated|deleted|removed|sent|added|created|completed?|congrat\w*|thank)/i.test(title)) return 'success';
  if (/\b(warning|are you sure|sure\?|confirm|attention|careful)\b/i.test(title)) return 'warning';
  return 'info';
}

function lead(html: string): string {
  return `<p class="kx-discard-lead">${html}</p>`;
}

function join(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
