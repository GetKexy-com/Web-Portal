import { Injectable } from '@angular/core';

import { HttpService } from './http.service';

/**
 * Per-user UI preferences, backed by `KexyApi/src/users/` —
 * `GET/PUT/DELETE users/preferences/:key`, all JWT-guarded and scoped to the token's
 * user (there is no `userId` parameter). Payloads arrive under `res.data`, per the
 * global `ResponseSuccessInterceptor` contract, in the shape `{ key, value }`.
 *
 * The store is generic and the server never interprets a value, so a new screen adds
 * a key and a shape of its own — nothing here needs to change. `null` means "never
 * set", which is a normal first-visit state and NOT an error: `get` resolves it
 * rather than rejecting, so callers fall through to their own defaults.
 */
@Injectable({ providedIn: 'root' })
export class UserPreferenceService {
  constructor(private httpService: HttpService) {}

  get<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.httpService.get(`users/preferences/${encodeURIComponent(key)}`).subscribe({
        next: (res) => resolve((res?.data?.value ?? null) as T | null),
        error: (err) => reject(err.error ? err.error : err),
      });
    });
  }

  /** Replaces the stored value wholesale — the server has no basis on which to merge. */
  set<T>(key: string, value: T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.httpService.put(`users/preferences/${encodeURIComponent(key)}`, { value }).subscribe({
        next: (res) => resolve((res?.data?.value ?? value) as T),
        error: (err) => reject(err.error ? err.error : err),
      });
    });
  }

  /**
   * Reset to default. Deletes the row rather than storing today's defaults into it,
   * so a user who resets picks up whatever the defaults become in a later release.
   */
  remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpService.delete(`users/preferences/${encodeURIComponent(key)}`).subscribe({
        next: () => resolve(),
        error: (err) => reject(err.error ? err.error : err),
      });
    });
  }
}
