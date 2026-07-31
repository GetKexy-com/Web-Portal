import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import {
  DASHBOARD_LAYOUT_KEY,
  IDashboardLayout,
  defaultDashboardLayout,
  reconcileDashboardLayout,
} from '../models/DashboardLayout';
import { UserPreferenceService } from './user-preference.service';

/**
 * Loads and persists the brand dashboard's card layout.
 *
 * ── Two stores, one source of truth ─────────────────────────────────────────
 * The server (`users/preferences/dashboard.layout.v1`) is authoritative — it is what
 * makes the layout follow the user to another browser. localStorage is a CACHE in
 * front of it, and it exists for one reason: the dashboard must paint in its
 * customised arrangement on the FIRST frame. Waiting on a round trip would render
 * the default order and then visibly reshuffle it, which looks like a bug every
 * single page load.
 *
 * So `readCache()` is synchronous and called during `ngOnInit`, and `fetch()` follows
 * with the server's copy. Where they disagree the server wins, because the cache may
 * be a stale copy from before the user rearranged things on their laptop.
 *
 * ── Writes are cache-first and debounced ────────────────────────────────────
 * `save()` writes the cache immediately (so a reload right after a drag is correct
 * even offline) and debounces the PUT. Customising is a burst of small edits — drag,
 * drag, resize, hide — and one request per edit would be a request per mouse-up for
 * data nobody else reads.
 *
 * ── Failure is non-fatal, always ────────────────────────────────────────────
 * Every path here degrades to a working dashboard: a failed fetch keeps the cached
 * (or default) layout, and a failed save keeps the cache so the arrangement survives
 * locally and the next successful save carries it up. A card arrangement is not worth
 * an error banner, let alone a blocked page.
 */
@Injectable({ providedIn: 'root' })
export class DashboardLayoutService implements OnDestroy {
  /** Debounce for the server write. Long enough to coalesce a burst of drags. */
  private static readonly SAVE_DEBOUNCE_MS = 800;

  private readonly pendingSave$ = new Subject<IDashboardLayout>();
  private readonly saveSub: Subscription;
  /** Kept so a `flush()` on teardown can write whatever the debounce still holds. */
  private pending: IDashboardLayout | null = null;

  constructor(private preferences: UserPreferenceService) {
    this.saveSub = this.pendingSave$
      .pipe(debounceTime(DashboardLayoutService.SAVE_DEBOUNCE_MS))
      .subscribe((layout) => this.__push(layout));
  }

  ngOnDestroy(): void {
    this.flush();
    this.saveSub.unsubscribe();
  }

  /**
   * The cached layout, or null. Synchronous by design — see the class comment.
   *
   * Reconciled on the way out, so a cache written by an older build (missing a
   * widget that has since shipped, carrying one that has since been removed) is
   * repaired rather than rendered.
   */
  readCache(userId: number): IDashboardLayout | null {
    try {
      const raw = localStorage.getItem(this.__cacheKey(userId));
      if (!raw) return null;
      return reconcileDashboardLayout(JSON.parse(raw));
    } catch {
      // Unparseable cache is the same as no cache.
      return null;
    }
  }

  /**
   * The server's copy, reconciled. Falls back to the cache and then to defaults, so
   * this never rejects and the caller never needs a catch.
   */
  async fetch(userId: number): Promise<IDashboardLayout> {
    try {
      const stored = await this.preferences.get<IDashboardLayout>(DASHBOARD_LAYOUT_KEY);
      // A user who has never customised has no row; that is the default layout, not
      // an empty one — and we deliberately do NOT write the defaults back, so they
      // keep following the app rather than being frozen at first visit.
      if (stored == null) return this.readCache(userId) ?? defaultDashboardLayout();

      const layout = reconcileDashboardLayout(stored);
      this.__writeCache(userId, layout);
      return layout;
    } catch {
      return this.readCache(userId) ?? defaultDashboardLayout();
    }
  }

  /** Cache now, server shortly. */
  save(userId: number, layout: IDashboardLayout): void {
    this.__writeCache(userId, layout);
    this.pending = layout;
    this.pendingSave$.next(layout);
  }

  /** Write any debounced layout immediately — on leaving customise mode, or teardown. */
  flush(): void {
    if (!this.pending) return;
    const layout = this.pending;
    this.pending = null;
    this.__push(layout);
  }

  /** Clear both stores and hand back the defaults. */
  async reset(userId: number): Promise<IDashboardLayout> {
    this.pending = null;
    try {
      localStorage.removeItem(this.__cacheKey(userId));
    } catch {
      /* private-mode / quota — the server delete below is what matters. */
    }
    try {
      await this.preferences.remove(DASHBOARD_LAYOUT_KEY);
    } catch {
      /* Non-fatal: the user sees the default layout either way. */
    }
    return defaultDashboardLayout();
  }

  private __push(layout: IDashboardLayout): void {
    this.pending = null;
    this.preferences.set(DASHBOARD_LAYOUT_KEY, layout).catch(() => {
      // Swallowed on purpose. The cache already holds it, so the arrangement is
      // intact locally and the next save will carry it to the server.
    });
  }

  /**
   * Cache key is per user: two people using the same browser must not inherit each
   * other's arrangement. Note `AuthService.logout` calls `localStorage.clear()`, so
   * the cache is dropped at logout — harmless, since `fetch` restores it on the next
   * visit, and it is the correct behaviour on a shared machine.
   */
  private __cacheKey(userId: number): string {
    return `kx.${DASHBOARD_LAYOUT_KEY}.${userId ?? 'anon'}`;
  }

  private __writeCache(userId: number, layout: IDashboardLayout): void {
    try {
      localStorage.setItem(this.__cacheKey(userId), JSON.stringify(layout));
    } catch {
      /* Quota or private mode. The server copy still gets written. */
    }
  }
}
