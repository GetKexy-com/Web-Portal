import { NgbOffcanvas, NgbOffcanvasRef, OffcanvasDismissReasons } from '@ng-bootstrap/ng-bootstrap';

import { ProspectProfileContentComponent } from '../components/prospect-profile-content/prospect-profile-content.component';
import { IEmailSendItem } from '../models/EmailSendProgress';

export interface IOpenProspectProfile {
  campaignId: number;
  /** 1-based position in the sequence, for "Replied to Email 3" in the profile. */
  emailSequence: number | null;
  /** The campaign's "un-enroll if reply" setting. */
  stopsOnReply: boolean;
  prospect: IEmailSendItem;
}

/**
 * Opens a prospect's Profile/Score as a second drawer STACKED on the Insights drawer — Insights
 * stays open underneath, so closing the profile returns to the same view. Shared by the
 * Prospects list and "Most engaged contacts".
 *
 * `scroll: true` is deliberate: ng-bootstrap tracks one scroll lock, and the Insights
 * drawer already holds it. If this drawer took it too, closing this one would release
 * it and the page behind Insights would start scrolling. The panel/backdrop classes
 * lift it above Insights (global `styles.scss`).
 */
export function openProspectProfile(ngbOffcanvas: NgbOffcanvas, opts: IOpenProspectProfile): NgbOffcanvasRef {
  const ref = ngbOffcanvas.open(ProspectProfileContentComponent, {
    panelClass: 'prospect-profile-drawer',
    backdropClass: 'prospect-profile-backdrop',
    position: 'end',
    scroll: true,
  });
  ref.componentInstance.campaignId = opts.campaignId;
  ref.componentInstance.emailSequence = opts.emailSequence;
  ref.componentInstance.stopsOnReply = opts.stopsOnReply;
  ref.componentInstance.prospect = opts.prospect;

  // Esc must close the TOP drawer. ng-bootstrap listens for Esc on each panel's own
  // element, so it goes to whichever panel has focus — and focus is still on the
  // "View" button, inside Insights, until the profile has animated in. Esc then closed
  // Insights and left the profile floating. Both panels ignore an Esc whose default is
  // already prevented, so claim it first, for as long as the profile is open.
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    ref.dismiss(OffcanvasDismissReasons.ESC);
  };
  document.addEventListener('keydown', onKeydown, true);
  const cleanup = (): void => document.removeEventListener('keydown', onKeydown, true);
  ref.result.then(cleanup, cleanup);
  return ref;
}
