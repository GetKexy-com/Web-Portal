import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { NgbOffcanvasRef } from '@ng-bootstrap/ng-bootstrap';

/**
 * Keeps an open drawer in the address (e.g. `?contact=482`, `?email=91&panel=insights`) so a
 * reload or a copied link opens it again, like Jira's `?selectedIssue=`.
 *
 * Written with `Location.replaceState`, never `router.navigate`: the app sets
 * `shouldReuseRoute = false` on the shared router, so a navigation would rebuild the page
 * under the open drawer. `replaceState` only changes the address bar. Side effect: Back does
 * not close the drawer.
 */
export type DrawerUrlParams = Record<string, string | number | null>;

/** Sets each param (null removes it); other params in the address are kept. */
export function setUrlParams(location: Location, router: Router, params: DrawerUrlParams): void {
  const tree = router.parseUrl(location.path());
  const queryParams = { ...tree.queryParams };
  let changed = false;
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      if (key in queryParams) {
        delete queryParams[key];
        changed = true;
      }
    } else if (queryParams[key] !== String(value)) {
      queryParams[key] = String(value);
      changed = true;
    }
  }
  if (!changed) return;
  tree.queryParams = queryParams;
  location.replaceState(router.serializeUrl(tree), '', location.getState());
}

/** Puts `params` in the address while `ref` is open and removes them when the drawer closes. */
export function trackDrawerInUrl(location: Location, router: Router, ref: NgbOffcanvasRef, params: DrawerUrlParams): void {
  setUrlParams(location, router, params);
  const cleared: DrawerUrlParams = {};
  Object.keys(params).forEach((key) => (cleared[key] = null));
  ref.hidden.subscribe(() => setUrlParams(location, router, cleared));
}
