import Swal from 'sweetalert2';

/** Longest preview of the unsent text shown in the dialog. */
const PREVIEW_CHARS = 140;

/**
 * "Discard this message?" for the Inbox compose window (Inbox and Sent pages), shown when it is
 * closed without sending while something is written in it. Resolves true to discard.
 *
 * Styled by `.kx-discard-popup` in `styles.scss` (SweetAlert renders outside the page, so the
 * styles are global): same rounded frame and type as the compose window, a soft badge instead of
 * SweetAlert's big icon, a preview of what would be lost, and a quiet "Keep editing" default next
 * to a red "Discard". Esc, the backdrop and "Keep editing" all keep the message.
 */
export async function confirmDiscardMessage(text: string): Promise<boolean> {
  const preview = text.replace(/\s+/g, ' ').trim();
  const shown = preview.length > PREVIEW_CHARS ? `${preview.slice(0, PREVIEW_CHARS).trimEnd()}…` : preview;

  const result = await Swal.fire({
    width: '27rem',
    title: 'Discard this message?',
    html: `
      <p class="kx-discard-lead">What you've written won't be saved if you close this window.</p>
      ${shown ? `<div class="kx-discard-preview">${escapeHtml(shown)}</div>` : ''}
    `,
    iconHtml: '<i class="fa fa-trash-o" aria-hidden="true"></i>',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Discard',
    cancelButtonText: 'Keep editing',
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    customClass: {
      popup: 'kx-discard-popup',
      icon: 'kx-discard-icon',
      title: 'kx-discard-title',
      htmlContainer: 'kx-discard-body',
      actions: 'kx-discard-actions',
      confirmButton: 'kx-discard-btn kx-discard-btn--danger',
      cancelButton: 'kx-discard-btn kx-discard-btn--ghost',
    },
  });
  return result.isConfirmed;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
