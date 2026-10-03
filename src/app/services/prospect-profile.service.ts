import { Injectable } from '@angular/core';

import { MOCK_PROSPECT_INSIGHTS } from '../helpers/prospect-profile.mock';
import { IProspectInsights, IProspectTimeline } from '../models/ProspectProfile';
import { HttpService } from './http.service';

/**
 * The insights API does not exist yet (contract: `docs/prospect-profile-api/`). While this
 * is true the page is fed the example payload and says so on screen. Flip to `false` once
 * KexyApi serves it — nothing else changes. The score and timeline are already served
 * (`getTimeline`), the score by the real Score API.
 */
export const PROSPECT_PROFILE_USE_MOCK = true;

/**
 * Shows the "Profile/Score" column in Insights → Prospects, the only way into the
 * profile. `false` hides the column (and with it the profile drawer).
 */
export const PROSPECT_PROFILE_ENABLED = true;

/** Long enough to exercise the loading skeletons, short enough not to annoy. */
const MOCK_LATENCY_MS = 450;

@Injectable({ providedIn: 'root' })
export class ProspectProfileService {
  constructor(private httpService: HttpService) {}

  /** Signals and opener choice. */
  getInsights = (campaignId: number, email: string): Promise<IProspectInsights> =>
    PROSPECT_PROFILE_USE_MOCK
      ? this.__mock({ ...MOCK_PROSPECT_INSIGHTS, email })
      : this.__getData(`drip-campaigns/${campaignId}/prospects/insights?email=${encodeURIComponent(email)}`);

  /**
   * "What happened so far" and the current score (Lead strength). Reads only — the Score API
   * is called by KexyApi's 5-minute run. `poll` marks the page refreshing itself while a
   * score is coming (KexyApi ignores it).
   */
  getTimeline = (campaignId: number, email: string, poll = false): Promise<IProspectTimeline> =>
    this.__getData(
      `drip-campaigns/${campaignId}/prospects/timeline?email=${encodeURIComponent(email)}${poll ? '&poll=true' : ''}`,
    );

  private __mock = <T>(data: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), MOCK_LATENCY_MS));

  private __getData = <T>(url: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      this.httpService.get(url).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => reject(err?.error ?? err),
      });
    });
}
