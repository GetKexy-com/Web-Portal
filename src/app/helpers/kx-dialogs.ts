import Swal from 'sweetalert2';

/**
 * General-purpose popups in the portal's current design: the `.kx-discard-popup` frame
 * from `styles.scss` (rounded card, soft badge instead of SweetAlert's big icon, pill
 * buttons), as used by the Inbox's discard dialog and the drip email delete dialogs.
 *
 * - `kxConfirm`: two buttons. `tone: 'danger'` (red badge + red action, for destructive
 *   steps) or `'primary'` (blue). The quiet cancel button is the default focus, and Esc /
 *   the backdrop cancel too.
 * - `kxForm`: a few labelled text boxes plus Cancel / action, with inline validation.
 * - `kxNotice`: one button. `tone: 'info'` (blue) or `'success'` (green, closes itself
 *   after a few seconds with a progress bar).
 *
 * Text is escaped; pass `html` only for markup you built yourself.
 */

const BASE_CLASSES = {
  icon: 'kx-discard-icon',
  title: 'kx-discard-title',
  htmlContainer: 'kx-discard-body',
  actions: 'kx-discard-actions',
};

export async function kxConfirm(opts: {
  title: string;
  text?: string;
  html?: string;
  /** Font Awesome 4 icon, e.g. `fa-play`. */
  icon: string;
  confirmText: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
}): Promise<boolean> {
  const danger = opts.tone === 'danger';
  const result = await Swal.fire({
    width: '27rem',
    title: escapeHtml(opts.title),
    html: opts.html ?? (opts.text ? `<p class="kx-discard-lead">${escapeHtml(opts.text)}</p>` : ''),
    iconHtml: `<i class="fa ${opts.icon}" aria-hidden="true"></i>`,
    icon: danger ? 'warning' : 'info',
    showCancelButton: true,
    confirmButtonText: escapeHtml(opts.confirmText),
    cancelButtonText: escapeHtml(opts.cancelText ?? 'Cancel'),
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    customClass: {
      ...BASE_CLASSES,
      popup: danger ? 'kx-discard-popup' : 'kx-discard-popup kx-discard-popup--info',
      confirmButton: `kx-discard-btn ${danger ? 'kx-discard-btn--danger' : 'kx-discard-btn--primary'}`,
      cancelButton: 'kx-discard-btn kx-discard-btn--ghost',
    },
  });
  return result.isConfirmed;
}

export async function kxNotice(opts: {
  title: string;
  text: string;
  icon: string;
  button?: string;
  tone?: 'info' | 'success';
  /** How long a success notice stays before closing itself (default 5s). */
  timerMs?: number;
}): Promise<void> {
  const success = opts.tone === 'success';
  await Swal.fire({
    width: '27rem',
    title: escapeHtml(opts.title),
    html: `<p class="kx-discard-lead">${escapeHtml(opts.text)}</p>`,
    iconHtml: `<i class="fa ${opts.icon}" aria-hidden="true"></i>`,
    icon: success ? 'success' : 'info',
    confirmButtonText: escapeHtml(opts.button ?? (success ? 'Done' : 'Got it')),
    ...(success ? { timer: opts.timerMs ?? 5000, timerProgressBar: true } : {}),
    buttonsStyling: false,
    customClass: {
      ...BASE_CLASSES,
      popup: `kx-discard-popup kx-discard-popup--info${success ? ' kx-discard-popup--success' : ''}`,
      confirmButton: `kx-discard-btn ${success ? 'kx-discard-btn--success' : 'kx-discard-btn--primary'}`,
      ...(success ? { timerProgressBar: 'kx-success-progress' } : {}),
    },
  });
}

/**
 * A small form in the same popup frame: one labelled text box per field, then Cancel and
 * the action. Resolves to the trimmed values, or `null` if cancelled. `validate` returns
 * the message to show under the fields (the popup stays open), or `null` when fine.
 * Enter submits.
 */
export async function kxForm(opts: {
  title: string;
  text?: string;
  /** Font Awesome 4 icon, e.g. `fa-plus`. */
  icon: string;
  confirmText: string;
  cancelText?: string;
  /** `multiline` renders a textarea (Enter adds a line instead of submitting). */
  fields: {
    key: string;
    label: string;
    placeholder?: string;
    value?: string;
    multiline?: boolean;
    /** `password` hides what is typed. */
    type?: 'text' | 'password';
  }[];
  validate?: (values: Record<string, string>) => string | null;
}): Promise<Record<string, string> | null> {
  const id = (key: string) => `kx-form-${key}`;
  const read = (): Record<string, string> =>
    Object.fromEntries(
      opts.fields.map((f) => [f.key, ((document.getElementById(id(f.key)) as HTMLInputElement)?.value || '').trim()]),
    );
  const fieldsHtml = opts.fields
    .map(
      (f) =>
        `<label class="kx-form-field" for="${id(f.key)}"><span>${escapeHtml(f.label)}</span>` +
        (f.multiline
          ? `<textarea id="${id(f.key)}" rows="5" placeholder="${escapeHtml(f.placeholder ?? '')}">` +
            `${escapeHtml(f.value ?? '')}</textarea></label>`
          : f.type === 'password'
            ? // A password gets an eye button to show what was typed or pasted. The icon shows the
              // CURRENT state (owner's call, 2026-10-28): crossed eye = hidden, eye = shown.
              `<span class="kx-form-pw"><input id="${id(f.key)}" type="password" autocomplete="new-password"` +
              ` placeholder="${escapeHtml(f.placeholder ?? '')}" value="${escapeHtml(f.value ?? '')}" />` +
              `<button type="button" class="kx-form-eye" data-eye-for="${id(f.key)}" aria-label="Show password"` +
              ` title="Show password"><i class="fa fa-eye-slash" aria-hidden="true"></i></button></span></label>`
            : `<input id="${id(f.key)}" type="text" autocomplete="off" placeholder="${escapeHtml(f.placeholder ?? '')}"` +
            ` value="${escapeHtml(f.value ?? '')}" /></label>`),
    )
    .join('');
  const result = await Swal.fire({
    width: '27rem',
    title: escapeHtml(opts.title),
    html:
      (opts.text ? `<p class="kx-discard-lead">${escapeHtml(opts.text)}</p>` : '') +
      `<div class="kx-form-fields">${fieldsHtml}</div>`,
    iconHtml: `<i class="fa ${opts.icon}" aria-hidden="true"></i>`,
    icon: 'info',
    showCancelButton: true,
    confirmButtonText: escapeHtml(opts.confirmText),
    cancelButtonText: escapeHtml(opts.cancelText ?? 'Cancel'),
    reverseButtons: true,
    focusConfirm: false,
    buttonsStyling: false,
    customClass: {
      ...BASE_CLASSES,
      popup: 'kx-discard-popup kx-discard-popup--info',
      confirmButton: 'kx-discard-btn kx-discard-btn--primary',
      cancelButton: 'kx-discard-btn kx-discard-btn--ghost',
      validationMessage: 'kx-form-error',
    },
    didOpen: (popup) => {
      (popup.querySelector('input, textarea') as HTMLElement | null)?.focus();
      popup.querySelectorAll<HTMLButtonElement>('.kx-form-eye').forEach((btn) =>
        btn.addEventListener('click', () => {
          const input = document.getElementById(btn.dataset['eyeFor'] ?? '') as HTMLInputElement | null;
          if (!input) return;
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          const label = show ? 'Hide password' : 'Show password';
          btn.setAttribute('aria-label', label);
          btn.title = label;
          btn.querySelector('i')?.classList.toggle('fa-eye', show);
          btn.querySelector('i')?.classList.toggle('fa-eye-slash', !show);
        }),
      );
      popup.querySelectorAll('input').forEach((input) =>
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            Swal.clickConfirm();
          }
        }),
      );
    },
    preConfirm: () => {
      const values = read();
      const error = opts.validate?.(values) ?? null;
      if (error) {
        Swal.showValidationMessage(escapeHtml(error));
        return false;
      }
      return values;
    },
  });
  return result.isConfirmed ? (result.value as Record<string, string>) : null;
}

/** The API's message from a rejected service call: a string, or an object with `message`. */
export function errorText(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof e === 'string' && e) return e;
  const message = (e as { message?: unknown })?.message;
  return typeof message === 'string' && message ? message : fallback;
}

function escapeHtml(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
