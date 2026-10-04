import { Injectable } from '@angular/core';

import { MOCK_PROSPECT_INSIGHTS } from '../helpers/prospect-profile.mock';
import { IProspectInsights, IProspectTimeline } from '../models/ProspectProfile';
import { HttpService } from './http.service';

/**
 * `true` feeds the insights section the example payload (`docs/prospect-profile-api/`) and
 * says so on screen — for working on the page without KexyApi. KexyApi now serves the real
 * Prospect Insights answer, so this is off. The score and timeline are always real
 * (`getTimeline`).
 */
export const PROSPECT_PROFILE_USE_MOCK = false;

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
