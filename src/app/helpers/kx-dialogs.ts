import Swal from 'sweetalert2';

/**
 * General-purpose popups in the portal's current design: the `.kx-discard-popup` frame
 * from `styles.scss` (rounded card, soft badge instead of SweetAlert's big icon, pill
 * buttons), as used by the Inbox's discard dialog and the drip email delete dialogs.
 *
 * - `kxConfirm`: two buttons. `tone: 'danger'` (red badge + red action, for destructive
 *   steps) or `'primary'` (blue). The quiet cancel button is the default focus, and Esc /
 *   the backdrop cancel too.
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
}): Promise<void> {
  const success = opts.tone === 'success';
  await Swal.fire({
    width: '27rem',
    title: escapeHtml(opts.title),
    html: `<p class="kx-discard-lead">${escapeHtml(opts.text)}</p>`,
    iconHtml: `<i class="fa ${opts.icon}" aria-hidden="true"></i>`,
    icon: success ? 'success' : 'info',
    confirmButtonText: escapeHtml(opts.button ?? (success ? 'Done' : 'Got it')),
    ...(success ? { timer: 5000, timerProgressBar: true } : {}),
    buttonsStyling: false,
    customClass: {
      ...BASE_CLASSES,
      popup: `kx-discard-popup kx-discard-popup--info${success ? ' kx-discard-popup--success' : ''}`,
      confirmButton: `kx-discard-btn ${success ? 'kx-discard-btn--success' : 'kx-discard-btn--primary'}`,
      ...(success ? { timerProgressBar: 'kx-success-progress' } : {}),
    },
  });
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
