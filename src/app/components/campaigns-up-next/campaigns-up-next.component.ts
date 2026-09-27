import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';

import { routeConstants } from '../../helpers/routeConstants';
import { schedulePollDelay } from '../../helpers/send-schedule-label';
import { ICampaignsUpNext } from '../../models/EmailSendProgress';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { SendCountdownComponent } from '../send-countdown/send-countdown.component';

/**
 * "Up next" above the campaign list: the next few sends across ALL the user's ACTIVE
 * campaigns (`GET drip-campaigns/up-next`), each ticking live, so they are visible
 * without paging or filtering the table. Hidden when there is no active campaign.
 *
 * Loads itself and stays live with the same pacing as the Delay cards
 * (`schedulePollDelay`); a background tab skips the fetch. `refreshKey` lets the page
 * refetch it whenever the table refreshes, so a pause or delete there shows up here too.
 */
@Component({
  selector: 'campaigns-up-next',
  imports: [CommonModule, SendCountdownComponent],
  templateUrl: './campaigns-up-next.component.html',
  styleUrl: './campaigns-up-next.component.scss',
})
export class CampaignsUpNextComponent implements OnInit, OnChanges, OnDestroy {
  /** Anything that changes when the page's list is refetched (its timestamp). */
  @Input() refreshKey: unknown = null;

  data: ICampaignsUpNext | null = null;
  clockOffsetMs = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;
  private destroyed = false;

  constructor(
    private dripCampaignService: DripCampaignService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load().then();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey'] && !changes['refreshKey'].firstChange) this.load().then();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.__clearTimer();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (!document.hidden) this.load().then();
  }

  trackByCampaign = (_: number, item: { campaignId: number }) => item.campaignId;

  open(campaignId: number) {
    this.router.navigate([routeConstants.BRAND.EDIT_DRIP_CAMPAIGN], { queryParams: { id: campaignId } });
  }

  private async load() {
    this.__clearTimer();
    const seq = ++this.seq;
    if (!document.hidden) {
      try {
        const res = await this.dripCampaignService.getCampaignsUpNext();
        if (seq !== this.seq || this.destroyed) return;
        this.data = res;
        const serverNow = Date.parse(res?.serverTime);
        if (!Number.isNaN(serverNow)) this.clockOffsetMs = serverNow - Date.now();
      } catch (e) {
        // Not worth a dialog: keep what is shown, and the next look retries.
        console.error('Could not load the next sends', e);
      }
    }
    if (seq !== this.seq || this.destroyed) return;
    const delay = schedulePollDelay(
      (this.data?.items ?? []).map((i) => i.schedule),
      Date.now() + this.clockOffsetMs,
    );
    this.timer = setTimeout(() => this.load(), delay);
  }

  private __clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
