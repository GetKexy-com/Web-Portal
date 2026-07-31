import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { ICampaignAnalytics } from '../models/CampaignAnalytics';
import {
  IDashboardEngagedContacts,
  IDashboardStats,
} from '../models/DashboardStats';

/**
 * Dashboard statistics.
 *
 * Backed by `KexyApi/src/dashboard/` — two endpoints, both company-scoped and
 * JWT-guarded (the token goes on via `jwt.interceptor`). Payloads arrive under
 * `res.data`, per the global `ResponseSuccessInterceptor` contract.
 *
 * ── The request budget is the design ────────────────────────────────────────
 * `getStats` is called ONCE per dashboard visit, for the LARGEST range the UI offers.
 * The page then slices the shorter ranges and applies the campaign filter locally, so
 * the range switch, the campaign multi-select and the metric tabs are all free — no
 * request, no server work. That is why the endpoint returns a whole fact table rather
 * than pre-aggregated answers: those controls get clicked in rapid succession, and a
 * query per click would be interactive, unthrottled load on MySQL for data that has
 * not changed.
 *
 * `getEngagedContacts` is the one call that does repeat, because a leaderboard is a
 * top-N over an unbounded contact dimension and belongs in SQL. It is only re-fetched
 * when the DATE RANGE or CAMPAIGN SCOPE changes — never when the user switches metric
 * tab, since all three rankings come back in one response.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private httpService: HttpService) {}

  /**
   * The whole dashboard for `days` back from today.
   *
   * Pass the largest range the UI offers (90). Asking for less would make the range
   * switch a network round trip for no benefit, since the response is a per-day grid
   * the page can slice itself. The server caps `days` at 180.
   */
  getStats = (companyId: number, days = 90): Promise<IDashboardStats> => {
    const params = new URLSearchParams({
      companyId: String(companyId),
      days: String(days),
    });

    return new Promise((resolve, reject) => {
      this.httpService.get(`dashboard/stats?${params.toString()}`).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => reject(err.error ? err.error : err),
      });
    });
  };

  /**
   * Top contacts by opens, clicks and replies for the given window and campaign
   * scope. All three rankings in one response, so the page's metric tabs need no
   * further requests.
   *
   * `campaignIds` empty/omitted means every campaign, matching the page's default.
   */
  getEngagedContacts = (
    companyId: number,
    days: number,
    campaignIds: number[] = [],
    limit = 10,
  ): Promise<IDashboardEngagedContacts> => {
    const params = new URLSearchParams({
      companyId: String(companyId),
      days: String(days),
      limit: String(limit),
    });
    // Sent as a comma list; the DTO accepts that or a repeated param. Omitted entirely
    // when empty, so the server takes its "all campaigns" path rather than filtering
    // on an empty IN ().
    if (campaignIds.length) params.set('campaignIds', campaignIds.join(','));

    return new Promise((resolve, reject) => {
      this.httpService
        .get(`dashboard/engaged-contacts?${params.toString()}`)
        .subscribe({
          next: (res) => resolve(res.data),
          error: (err) => reject(err.error ? err.error : err),
        });
    });
  };

  /**
   * Everything the campaign Insights drawer draws, for ONE campaign.
   *
   * The deliberate opposite of `getStats`: scoped server-side, so this DOES cost a
   * request per range change. That is the right trade here — the drawer is opened
   * occasionally over the campaign you are editing, and the alternative is
   * downloading every campaign's history to render one of them.
   *
   * No `companyId`: the campaign row carries its owner and the API checks the caller
   * against that, so there is no company id here to get wrong.
   *
   * `emailId` narrows every figure to ONE email in the sequence — the same report at a
   * smaller scope, which is what backs the per-email Insights drawer. It replaced
   * `drip-campaigns/:id/insights`, which read the insights table through the TypeORM
   * repository and 400'd on a column that no longer exists (`email_notification_sent`).
   */
  getCampaignAnalytics = (
    campaignId: number,
    days = 30,
    limit = 10,
    emailId?: number,
  ): Promise<ICampaignAnalytics> => {
    const params = new URLSearchParams({ days: String(days), limit: String(limit) });
    if (emailId) params.set('emailId', String(emailId));

    return new Promise((resolve, reject) => {
      this.httpService
        .get(`dashboard/campaigns/${campaignId}?${params.toString()}`)
        .subscribe({
          next: (res) => resolve(res.data),
          error: (err) => reject(err.error ? err.error : err),
        });
    });
  };
}
