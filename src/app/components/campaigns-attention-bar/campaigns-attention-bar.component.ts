import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { routeConstants } from '../../helpers/routeConstants';
import { ICampaignIssue, ICampaignsAttention } from '../../models/DripCampaign';
import { DripCampaignService } from '../../services/drip-campaign.service';

type Flagged = ICampaignsAttention['campaigns'][number];

/**
 * The dashboard's alert when an ACTIVE campaign isn't sending as it should (the same
 * `GET drip-campaigns/attention` as the campaign list's card), so it is seen at login. Says
 * what is wrong and offers the one click that fixes it; names only matter for ONE campaign:
 * - one campaign: its name, what is wrong, and a button straight to its fix;
 * - several with the same cause: the cause, no names (no SMTP on the account is one fix for
 *   all of them: Add SMTP account);
 * - several with different causes: how many, and a button to the campaign list with its
 *   "needs attention" card open, where the names and details are.
 * Hidden when nothing is wrong, and when the request fails (not worth an error here).
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

  /**
   * The issue every flagged campaign has as its most serious one (the API sorts stops
   * first), with the same fix, or null when the causes differ.
   */
  get sharedCause(): ICampaignIssue | null {
    const leads = this.campaigns.map((c) => c.issues[0]).filter(Boolean);
    if (leads.length < 2 || leads.length !== this.campaigns.length) return null;
    const [first] = leads;
    return leads.every((i) => i.code === first.code && i.action === first.action) ? first : null;
  }

  /** The shared cause in one sentence, for N campaigns. */
  causeMessage(issue: ICampaignIssue): string {
    const n = this.campaigns.length;
    switch (issue.code) {
      case 'no_smtp':
        return issue.action === 'add_smtp'
          ? `Your account has no working SMTP account, so ${n} active campaigns will pause at their next send.`
          : `${n} active campaigns have no SMTP account chosen, so they will pause at their next send.`;
      case 'insights_blocked':
        return `${n} active campaigns have emails on hold until someone clicks Retry now.`;
      case 'insights_daily_limit':
        return `${n} active campaigns have emails waiting until tomorrow: picking how they open failed 3 times today.`;
      default:
        // The platform-wide pauses already speak for every campaign.
        return issue.message;
    }
  }

  fixLabel(issue: ICampaignIssue | null): string {
    if (issue?.action === 'add_smtp') return 'Add SMTP account';
    if (issue?.action === 'choose_smtp') return 'Choose SMTP account';
    return 'Open campaign';
  }

  addSmtp() {
    this.router.navigate(['/' + routeConstants.BRAND.SMTP_SETTINGS]);
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
