import { Injectable } from '@angular/core';

import { MOCK_PROSPECT_INSIGHTS, MOCK_PROSPECT_SCORE } from '../helpers/prospect-profile.mock';
import { IProspectInsights, IProspectScore } from '../models/ProspectProfile';
import { HttpService } from './http.service';

/**
 * The score and insights APIs do not exist yet (contract: `docs/prospect-profile-api/`).
 * While this is true the page is fed the example payloads and says so on screen. Flip to
 * `false` once KexyApi serves both routes — nothing else changes.
 */
export const PROSPECT_PROFILE_USE_MOCK = true;

/** Long enough to exercise the loading skeletons, short enough not to annoy. */
const MOCK_LATENCY_MS = 450;

@Injectable({ providedIn: 'root' })
export class ProspectProfileService {
  constructor(private httpService: HttpService) {}

  /** Lead strength: the score, its breakdown, and what to do next. */
  getScore = (campaignId: number, email: string): Promise<IProspectScore> =>
    PROSPECT_PROFILE_USE_MOCK
      ? this.__mock({ ...MOCK_PROSPECT_SCORE, email })
      : this.__getData(`drip-campaigns/${campaignId}/prospects/score?email=${encodeURIComponent(email)}`);

  /** Signals, opener choice, timeline, contact details and safety checks. */
  getInsights = (campaignId: number, email: string): Promise<IProspectInsights> =>
    PROSPECT_PROFILE_USE_MOCK
      ? this.__mock({ ...MOCK_PROSPECT_INSIGHTS, email })
      : this.__getData(`drip-campaigns/${campaignId}/prospects/insights?email=${encodeURIComponent(email)}`);

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
