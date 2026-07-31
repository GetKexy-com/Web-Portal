import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';

/**
 * Loads every lazy route's chunk in the background so clicking a nav item is instant.
 *
 * ── Why this exists ───────────────────────────────────────────────────────────
 * Every route in `app.routes.ts` is a `loadComponent`, and `provideRouter` was given no
 * preloading strategy — so the chunk for a page was only fetched when someone clicked
 * its nav item. Until that request came back the router had not swapped anything, so the
 * PREVIOUS page stayed on screen and the click looked ignored for the length of a round
 * trip. That is the "sometimes it takes a second" — first visit to a page pays, every
 * visit after it is instant because the module registry has the chunk. Deploying new
 * hashed bundles resets it for everyone, which is why it comes and goes.
 *
 * Angular 19's `RouterPreloader` does handle `loadComponent` routes (it checks
 * `route.loadComponent && !route._loadedComponent`) and `canActivate` guards do not
 * block preloading — only `canLoad` does, and this app uses neither on the lazy import.
 * So the whole fix is to give it a strategy.
 *
 * ── Why not `PreloadAllModules` ───────────────────────────────────────────────
 * Two reasons, and both are about not making the page you are ON worse in order to
 * speed up the one you might go to next:
 *
 * 1. It starts every chunk at once, the instant the first navigation ends — competing
 *    for bandwidth with the API calls of the page that just opened. This waits for the
 *    browser to be idle and runs ONE chunk at a time.
 * 2. It has no opt-out, and `public-landing-page` is the single biggest chunk in the
 *    build while being unreachable from the portal. `data: { preload: false }` on a
 *    route skips it here.
 */
@Injectable({ providedIn: 'root' })
export class IdleRoutePreloadStrategy implements PreloadingStrategy {
  /**
   * Chunks are loaded one after another rather than all at once. Sequential is slower
   * to finish the whole set and that is fine — nobody is waiting on it, and the point
   * is to stay out of the way of requests somebody IS waiting on.
   */
  private chain: Promise<unknown> = Promise.resolve();

  /**
   * Routes already queued. `RouterPreloader` re-walks the config on every
   * `NavigationEnd` and calls `preload()` again for anything still unloaded, so without
   * this a route sitting in the queue gets enqueued again on each navigation.
   */
  private readonly queued = new WeakSet<Route>();

  /** Whether the one-off `HEAD_START_MS` pause has already been put on the chain. */
  private __headStartTaken = false;

  /**
   * Held off before the FIRST chunk, on top of the idle wait.
   *
   * `requestIdleCallback` means "the main thread has spare time", which says nothing
   * about the network — the page that just opened has its API calls in flight at that
   * exact moment and the thread is idle precisely BECAUSE it is waiting on them. Idle
   * alone would therefore start 30-odd chunk downloads alongside the request the user
   * is actually watching. Two seconds is long enough for a typical list fetch to land.
   */
  private static readonly HEAD_START_MS = 2000;

  /** Cap on the idle wait between chunks — a permanently busy tab still preloads. */
  private static readonly IDLE_TIMEOUT_MS = 2000;

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] === false) return EMPTY;
    if (this.queued.has(route)) return EMPTY;
    if (this.__isMeteredConnection()) return EMPTY;

    if (!this.__headStartTaken) {
      this.__headStartTaken = true;
      this.chain = this.chain.then(
        () => new Promise((resolve) => setTimeout(resolve, IdleRoutePreloadStrategy.HEAD_START_MS)),
      );
    }
    this.queued.add(route);

    this.chain = this.chain
      .then(() => this.__whenIdle())
      .then(
        () =>
          new Promise<void>((resolve) => {
            // Subscribe until it completes and hold the subscription: the router's
            // component loader is a `refCount`ed ConnectableObservable, so
            // unsubscribing early CANCELS the load rather than leaving it running.
            load().subscribe({
              complete: () => resolve(),
              // A failed preload must not break anything — and an error reaching the
              // preloader's own subscriber would tear down preloading for the rest of
              // the session. The chunk is fetched again for real if the user navigates
              // there, which is where a load error belongs.
              error: () => resolve(),
            });
          }),
      );

    // The preloader is handed an already-finished observable rather than the work
    // itself: its subscription only tells it when a pass is over, and `setUpPreloading`
    // `concatMap`s the passes, so returning the queue would make each navigation wait
    // for every remaining chunk before the config is re-walked. The queue is ours to
    // manage, and `queued` is what stops the double enqueue that would otherwise cause.
    return EMPTY;
  }

  /**
   * Resolves when the browser has spare time, or after `timeout` regardless — an
   * always-busy tab must still preload eventually. Safari has no `requestIdleCallback`,
   * hence the `setTimeout` fallback.
   */
  private __whenIdle(): Promise<void> {
    const idle = (window as any).requestIdleCallback;
    if (typeof idle !== 'function') {
      return new Promise((resolve) => setTimeout(resolve, IdleRoutePreloadStrategy.IDLE_TIMEOUT_MS));
    }
    return new Promise((resolve) =>
      idle(() => resolve(), { timeout: IdleRoutePreloadStrategy.IDLE_TIMEOUT_MS }),
    );
  }

  /**
   * Don't spend someone's phone data on pages they have not asked for. `saveData` is
   * the explicit signal; the slow effective types are the implicit one — on those, a
   * background download would delay the request the user is actually waiting for.
   */
  private __isMeteredConnection(): boolean {
    const conn = (navigator as any).connection;
    if (!conn) return false;
    return !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType ?? '');
  }
}
