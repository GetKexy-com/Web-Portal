import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import Swal from 'sweetalert2';

import { DripCampaignService } from '../services/drip-campaign.service';

/**
 * Leaving the campaign builder while page 1 of a running or paused campaign has unsaved
 * edits (sidebar, breadcrumb, browser back) asks first. Nothing to ask → leaves at once.
 */
export const unsavedDripChangesGuard: CanDeactivateFn<unknown> = async () => {
  const dripCampaignService = inject(DripCampaignService);
  if (!dripCampaignService.hasUnsavedChanges()) return true;
  const answer = await Swal.fire({
    title: 'You have unsaved changes',
    text: "Leave without saving? Your changes to this campaign won't be kept.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Leave without saving',
    cancelButtonText: 'Stay on this page',
  });
  if (!answer.isConfirmed) return false;
  dripCampaignService.setUnsavedChangesCheck(null);
  return true;
};
