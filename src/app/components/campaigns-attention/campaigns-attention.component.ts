import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { routeConstants } from '../../helpers/routeConstants';
import { ICampaignIssue, ICampaignsAttention } from '../../models/DripCampaign';
import { DripCampaignService } from '../../services/drip-campaign.service';

/** How many flagged campaigns show before "Show all". */
const COLLAPSED = 3;

/**
 * "Needs attention" above the campaign list: every ACTIVE campaign that is not sending as it
 * should, and why (`GET drip-campaigns/attention` — no SMTP, Insights holds, a platform-wide
 * pause). Covers ALL the user's active campaigns, so one deep in the table's pages is still
 * flagged here. Hidden when nothing needs attention.
 *
 * Collapsed to its one-line header by default, so it doesn't push the table down; the
 * dashboard's alert links here with `?attention=open`, which opens it.
 *
 * Also hands the page each campaign's issues (`issuesChange`) for the table's row chips.
 * Refetched with the table (`refreshKey`) and when the tab comes back into view.
 */
@Component({
  selector: 'campaigns-attention',
  imports: [CommonModule],
  templateUrl: './campaigns-attention.component.html',
  styleUrl: './campaigns-attention.component.scss',
})
export class CampaignsAttentionComponent implements OnInit, OnChanges {
  /** Anything that changes when the page's list is refetched (its timestamp). */
  @Input() refreshKey: unknown = null;
  /** Each flagged campaign's issues, by campaign id. */
  @Output() issuesChange = new EventEmitter<Record<number, ICampaignIssue[]>>();
  /** The table below is showing only these campaigns (its "Needs attention" filter). */
  @Input() filtered = false;
  /** "Show only these" (true) / "Show all campaigns" (false): the page sets the filter. */
  @Output() filterChange = new EventEmitter<boolean>();

  data: ICampaignsAttention | null = null;
  /** The card's body (the campaigns and their issues). Collapsed by default. */
  open = false;
  /** Inside the open card: every flagged campaign, or the first {@link COLLAPSED}. */
  expanded = false;
  readonly collapsed = COLLAPSED;
  private seq = 0;

  constructor(
    private dripCampaignService: DripCampaignService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.open = this.route.snapshot.queryParamMap.get('attention') === 'open';
    this.load().then();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey'] && !changes['refreshKey'].firstChange) this.load().then();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (!document.hidden) this.load().then();
  }

  get shown() {
    const all = this.data?.campaigns ?? [];
    return this.expanded ? all : all.slice(0, COLLAPSED);
  }

  get stopping(): number {
    return (this.data?.campaigns ?? []).filter((c) => c.issues.some((i) => i.severity === 'stop'))
      .length;
  }

  trackByCampaign = (_: number, item: { campaignId: number }) => item.campaignId;

  actionLabel(action: ICampaignIssue['action']): string | null {
    if (action === 'add_smtp') return 'Add SMTP account';
    if (action === 'choose_smtp') return 'Choose SMTP account';
    if (action === 'open_campaign') return 'Open campaign';
    return null;
  }

  act(campaignId: number, action: ICampaignIssue['action']) {
    if (action === 'add_smtp') {
      this.router.navigate(['/' + routeConstants.BRAND.SMTP_SETTINGS]);
      return;
    }
    // The campaign page shows the same issue with its own fix (e.g. the SMTP picker).
    this.router.navigate([routeConstants.BRAND.EDIT_DRIP_CAMPAIGN], { queryParams: { id: campaignId } });
  }

  private async load() {
    if (document.hidden) return;
    const seq = ++this.seq;
    try {
      const res = await this.dripCampaignService.getCampaignsAttention();
      if (seq !== this.seq) return;
      this.data = res;
      const byId: Record<number, ICampaignIssue[]> = {};
      for (const c of res?.campaigns ?? []) byId[c.campaignId] = c.issues;
      this.issuesChange.emit(byId);
    } catch (e) {
      // Not worth a dialog: keep what is shown, and the next look retries.
      console.error('Could not load campaigns needing attention', e);
    }
  }
}
