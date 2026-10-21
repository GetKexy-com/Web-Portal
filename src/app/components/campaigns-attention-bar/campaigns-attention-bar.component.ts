import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { routeConstants } from '../../helpers/routeConstants';
import { ICampaignIssue, ICampaignsAttention } from '../../models/DripCampaign';
import { DripCampaignService } from '../../services/drip-campaign.service';

type Flagged = ICampaignsAttention['campaigns'][number];

/**
 * The dashboard's alert when an ACTIVE campaign isn't sending as it should (the same
 * `GET drip-campaigns/attention` as the campaign list's card), so it is seen at login. One
 * campaign: what is wrong and a button straight to its fix. Several: how many, and a button to
 * the campaign list with its "needs attention" card open. Hidden when nothing is wrong, and
 * when the request fails (it is not worth an error on the dashboard).
 */
@Component({
  selector: 'campaigns-attention-bar',
  imports: [CommonModule],
  templateUrl: './campaigns-attention-bar.component.html',
  styleUrl: './campaigns-attention-bar.component.scss',
})
export class CampaignsAttentionBarComponent implements OnInit {
  data: ICampaignsAttention | null = null;

  constructor(
    private dripCampaignService: DripCampaignService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.data = await this.dripCampaignService.getCampaignsAttention();
    } catch (e) {
      console.error('Could not load campaigns needing attention', e);
    }
  }

  get campaigns(): Flagged[] {
    return this.data?.campaigns ?? [];
  }

  get stopping(): number {
    return this.campaigns.filter((c) => c.issues.some((i) => i.severity === 'stop')).length;
  }

  /** The one campaign's most serious issue (the API sorts stops first). */
  get first(): ICampaignIssue | null {
    return this.campaigns[0]?.issues[0] ?? null;
  }

  /** Up to two names, then "and N more". */
  get names(): string {
    const titles = this.campaigns.map((c) => `"${c.title || 'Untitled campaign'}"`);
    if (titles.length <= 2) return titles.join(' and ');
    return `${titles.slice(0, 2).join(', ')} and ${titles.length - 2} more`;
  }

  fixLabel(issue: ICampaignIssue | null): string {
    if (issue?.action === 'add_smtp') return 'Add SMTP account';
    if (issue?.action === 'choose_smtp') return 'Choose SMTP account';
    return 'Open campaign';
  }

  fix(campaign: Flagged) {
    if (campaign.issues[0]?.action === 'add_smtp') {
      this.router.navigate(['/' + routeConstants.BRAND.SMTP_SETTINGS]);
      return;
    }
    this.router.navigate(['/' + routeConstants.BRAND.EDIT_DRIP_CAMPAIGN], {
      queryParams: { id: campaign.campaignId },
    });
  }

  review() {
    this.router.navigate(['/' + routeConstants.BRAND.LIST_DRIP_CAMPAIGN], {
      queryParams: { attention: 'open' },
    });
  }
}
