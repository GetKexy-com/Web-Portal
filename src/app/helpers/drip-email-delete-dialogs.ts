import Swal from 'sweetalert2';

/**
 * The popups of the drip editor's "Delete" on an Email # card (`drip-campaign-card`).
 *
 * Same `.kx-discard-popup` frame as the Inbox's discard dialog (`confirm-discard.ts`) and
 * "Contact not found" (`contact-not-found.ts`): rounded card, soft badge instead of
 * SweetAlert's big icon, pill buttons. The confirm is the red variant with a quiet "Keep
 * email" default; notices are the blue `--info` variant with a single button, and the
 * success summary is green (`--success`).
 */

const POPUP_CLASSES = {
  icon: 'kx-discard-icon',
  title: 'kx-discard-title',
  htmlContainer: 'kx-discard-body',
  actions: 'kx-discard-actions',
};

/** Longest subject shown in the confirm. */
const SUBJECT_CHARS = 140;

export interface DeleteEmailConfirm {
  /** The card's title, e.g. "Email #2". */
  label: string;
  subject?: string | null;
  /** Prospects it was already sent to. */
  sentCount?: number;
  /** Prospects queued to receive it; deleting cancels those sends. */
  queuedCount?: number;
}

/** "Delete Email #2?" Resolves true to delete. Esc, the backdrop and "Keep email" keep it. */
export async function confirmDeleteEmail(opts: DeleteEmailConfirm): Promise<boolean> {
  const sent = opts.sentCount ?? 0;
  const queued = opts.queuedCount ?? 0;
  const subject = (opts.subject ?? '').replace(/\s+/g, ' ').trim();
  const shown = subject.length > SUBJECT_CHARS ? `${subject.slice(0, SUBJECT_CHARS).trimEnd()}…` : subject;

  const facts: string[] = [];
  if (sent) {
    facts.push(
      fact(
        'fa-paper-plane-o',
        `<strong>${prospects(sent)}</strong> already received this email. Their history stays.`,
      ),
    );
  }
  if (queued) {
    facts.push(
      fact(
        'fa-clock-o',
        `<strong>${prospects(queued)}</strong> ${queued === 1 ? 'is' : 'are'} queued to receive it. ` +
          `Their send is cancelled and they get the next email instead.`,
        'is-warn',
      ),
    );
  }

  const lead = queued
    ? 'To send it to them first, resume the campaign, let it send, then pause and delete.'
    : "This can't be undone. The emails after it move up one place.";

  const result = await Swal.fire({
    width: '32rem',
    title: `Delete ${escapeHtml(opts.label || 'this email')}?`,
    html: `
      ${shown ? `<div class="kx-discard-preview">${escapeHtml(shown)}</div>` : ''}
      ${facts.length ? `<ul class="kx-delete-facts">${facts.join('')}</ul>` : ''}
      <p class="kx-discard-lead kx-delete-lead">${lead}</p>
    `,
    iconHtml: '<i class="fa fa-trash-o" aria-hidden="true"></i>',
    icon: 'warning',
    showCancelButton: true,
    // Short enough for one line: the two buttons share the width equally.
    confirmButtonText: queued ? `Delete & cancel ${queued.toLocaleString()} send${queued === 1 ? '' : 's'}` : 'Delete email',
    cancelButtonText: 'Keep email',
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    customClass: {
      ...POPUP_CLASSES,
      popup: 'kx-discard-popup kx-delete-popup',
      confirmButton: 'kx-discard-btn kx-discard-btn--danger',
      cancelButton: 'kx-discard-btn kx-discard-btn--ghost',
    },
  });
  return result.isConfirmed;
}

/**
 * "Email #2 deleted": what the delete did, at a glance. Green badge, the subject struck
 * through, one row per change, and a Done button; closes by itself after a few seconds
 * (the progress bar shows when), since there is nothing left to decide.
 */
export async function showEmailDeleted(opts: {
  label: string;
  subject?: string | null;
  /** Emails left in the sequence. */
  remaining: number;
  /** Queued sends cancelled with it. */
  cancelled: number;
}): Promise<void> {
  const subject = (opts.subject ?? '').replace(/\s+/g, ' ').trim();
  const shown = subject.length > SUBJECT_CHARS ? `${subject.slice(0, SUBJECT_CHARS).trimEnd()}…` : subject;

  const facts = [
    fact(
      'fa-list-ol',
      `<strong>${opts.remaining} email${opts.remaining === 1 ? '' : 's'}</strong> left in the sequence. The ones after it moved up a place.`,
    ),
    opts.cancelled
      ? fact(
          'fa-ban',
          `<strong>${opts.cancelled} queued send${opts.cancelled === 1 ? '' : 's'}</strong> cancelled. They get the next email instead.`,
        )
      : '',
    fact('fa-user-o', `Every prospect is still on the right email.`),
  ].join('');

  await Swal.fire({
    width: '30rem',
    title: `${escapeHtml(opts.label || 'Email')} deleted`,
    html: `
      ${shown ? `<div class="kx-discard-preview kx-deleted-subject">${escapeHtml(shown)}</div>` : ''}
      <ul class="kx-delete-facts">${facts}</ul>
    `,
    iconHtml: '<i class="fa fa-check" aria-hidden="true"></i>',
    icon: 'success',
    confirmButtonText: 'Done',
    timer: 6000,
    timerProgressBar: true,
    buttonsStyling: false,
    customClass: {
      ...POPUP_CLASSES,
      popup: 'kx-discard-popup kx-delete-popup kx-discard-popup--success',
      confirmButton: 'kx-discard-btn kx-discard-btn--success',
      timerProgressBar: 'kx-success-progress',
    },
  });
}

/** A one-button notice in the same frame, blue badge: blocked, queue changed, error. */
export async function showDeleteNotice(opts: {
  title: string;
  text: string;
  /** Font Awesome 4 icon, e.g. `fa-pause`. */
  icon?: string;
  button?: string;
}): Promise<void> {
  await Swal.fire({
    width: '27rem',
    title: escapeHtml(opts.title),
    html: `<p class="kx-discard-lead">${escapeHtml(opts.text)}</p>`,
    iconHtml: `<i class="fa ${opts.icon ?? 'fa-info'}" aria-hidden="true"></i>`,
    icon: 'info',
    confirmButtonText: opts.button ?? 'Got it',
    buttonsStyling: false,
    customClass: {
      ...POPUP_CLASSES,
      popup: 'kx-discard-popup kx-discard-popup--info',
      confirmButton: 'kx-discard-btn kx-discard-btn--primary',
    },
  });
}

function fact(icon: string, html: string, modifier = ''): string {
  return `<li class="kx-delete-fact ${modifier}"><i class="fa ${icon}" aria-hidden="true"></i><span>${html}</span></li>`;
}

function prospects(n: number): string {
  return `${n.toLocaleString()} prospect${n === 1 ? '' : 's'}`;
}

function escapeHtml(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
