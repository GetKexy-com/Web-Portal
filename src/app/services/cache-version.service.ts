import { Injectable } from '@angular/core';

/**
 * How long a cached list snapshot is reused before the server is asked again.
 *
 * ONE definition for every table, so campaigns, contacts and lists cannot drift apart.
 *
 * ── Why ten minutes and not seconds ───────────────────────────────────────────
 * This window only ever bounds changes the app CANNOT see locally: another user in the
 * company, another tab, or the backend flipping a campaign to `complete`. Everything
 * the user does themselves resets it immediately — a write bumps the scope's version
 * (see `CacheVersionService`), the next read misses, and the fresh fetch restarts the
 * clock from that moment. A browser reload starts with an empty cache and refetches
 * too.
 *
 * So the trade is: a colleague's change can take up to ten minutes to appear
 * unprompted. The refresh button beside each table is the escape hatch, and
 * `<app-time-ago>` states the snapshot's age so that staleness is disclosed rather
 * than hidden.
 */
export const SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000;

/** Cache scopes. One per group of data that invalidates together. */
export const CACHE_SCOPE = {
  DRIP_CAMPAIGNS: 'drip-campaigns',
  LISTS: 'lists',
  CONTACTS: 'contacts',
  CONVERSATIONS: 'conversations',
} as const;

/**
 * Per-scope overrides of the default window.
 *
 * Conversations get an hour because the list is expensive and a thread's PLACE in it
 * rarely changes — but note the asymmetry this creates: unlike contacts or campaigns,
 * the thing that changes an inbox is usually NOT a local write. Mail arrives from
 * outside the app entirely (`POST webhook/email/receive` on the API), so no interceptor
 * can see it and the window is the only thing bounding it. An hour is therefore an hour
 * of possibly not noticing new mail, and the refresh button is the only remedy until
 * something server-side signals arrival.
 */
const MAX_AGE_BY_SCOPE: Record<string, number> = {
  [CACHE_SCOPE.CONVERSATIONS]: 60 * 60 * 1000,
};

/** The window for a given scope, falling back to the shared default. */
export const maxAgeForScope = (scope: string): number =>
  MAX_AGE_BY_SCOPE[scope] ?? SNAPSHOT_MAX_AGE_MS;

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
