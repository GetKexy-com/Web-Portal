import { Injectable } from '@angular/core';

/** Cache scopes. One per group of data that invalidates together. */
export const CACHE_SCOPE = {
  DRIP_CAMPAIGNS: 'drip-campaigns',
  LISTS: 'lists',
  CONTACTS: 'contacts',
} as const;

/**
 * A monotonic counter per cache scope, bumped whenever something is written that could
 * change what a cached read returns.
 *
 * ── Why a counter and not a boolean "dirty" flag ──────────────────────────────
 * A boolean has an ownership problem: whoever reads it has to clear it, so the second
 * consumer of the same scope never sees the mutation. With a counter, each cache entry
 * records the version it was fetched at and staleness is just `entry.version !==
 * current`. Nobody clears anything, and any number of consumers can compare
 * independently.
 *
 * Deliberately in-memory and per-tab. A mutation in another tab will not be seen here;
 * that staleness is bounded by the freshness window the consumer applies on top (see
 * `brand-list-of-drip-campaigns`), which is the same bound that covers changes made by
 * other users and by the backend.
 */
@Injectable({ providedIn: 'root' })
export class CacheVersionService {
  private readonly versions = new Map<string, number>();

  version = (scope: string): number => this.versions.get(scope) ?? 0;

  bump = (scope: string): void => {
    this.versions.set(scope, this.version(scope) + 1);
  };
}
