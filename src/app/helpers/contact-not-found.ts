import Swal from 'sweetalert2';

/**
 * "Contact not found" — a contact link pointed at someone who has since been deleted.
 *
 * Uses the `.kx-discard-popup` frame from `styles.scss` (same rounded card, badge and pill
 * buttons as the Inbox's discard dialog) with the `--info` variant, so it reads as a notice
 * rather than SweetAlert's stock alert. One button: there is nothing to decide.
 */
export async function showContactNotFound(name: string, email: string): Promise<void> {
  const who = name && name !== email ? `<strong>${escapeHtml(name)}</strong> (${escapeHtml(email)})` : `<strong>${escapeHtml(email)}</strong>`;

  await Swal.fire({
    width: '27rem',
    title: 'Contact not found',
    html: `<p class="kx-discard-lead">${who} has been deleted from your contacts, so there's nothing to edit. Their past engagement is still counted on the dashboard.</p>`,
    iconHtml: '<i class="fa fa-user-times" aria-hidden="true"></i>',
    icon: 'info',
    confirmButtonText: 'Got it',
    buttonsStyling: false,
    customClass: {
      popup: 'kx-discard-popup kx-discard-popup--info',
      icon: 'kx-discard-icon',
      title: 'kx-discard-title',
      htmlContainer: 'kx-discard-body',
      actions: 'kx-discard-actions',
      confirmButton: 'kx-discard-btn kx-discard-btn--primary',
    },
  });
}

function escapeHtml(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
