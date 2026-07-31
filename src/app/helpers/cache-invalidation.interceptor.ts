import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CACHE_SCOPE, CacheVersionService } from '../services/cache-version.service';

/**
 * Which cache scopes a successful write invalidates, by URL.
 *
 * A write can invalidate MORE than the resource it names, because these tables are
 * derived from each other:
 *
 * - `titles` sits in the campaign scope: a campaign's title lives in its own table, so
 *   renaming one changes the Manage Campaigns list without touching a
 *   `drip-campaigns` URL.
 * - Writing contacts changes list SIZES, so it invalidates lists too.
 * - Writing lists changes which lists a contact belongs to — a column on the contacts
 *   table — so it invalidates contacts too.
 *
 * Over-invalidating costs a refetch. Under-invalidating costs wrong data on screen, so
 * every uncertain case is resolved toward the former.
 */
const SCOPE_BY_URL: { pattern: RegExp; scopes: string[] }[] = [
  { pattern: /\/(drip-campaigns|titles)\b/, scopes: [CACHE_SCOPE.DRIP_CAMPAIGNS] },
  { pattern: /\/contacts\b/, scopes: [CACHE_SCOPE.CONTACTS, CACHE_SCOPE.LISTS] },
  { pattern: /\/lists\b/, scopes: [CACHE_SCOPE.LISTS, CACHE_SCOPE.CONTACTS] },
];

/**
 * Bumps a cache scope whenever a write succeeds against a URL that belongs to it.
 *
 * ── Why here and not in the services ──────────────────────────────────────────
 * The alternative was calling `bump()` from each of the ~12 methods in
 * `DripCampaignService` that mutate a campaign. That works on the day it is written
 * and rots afterwards: the thirteenth mutation gets added without the bump, and the
 * failure is silent — a list that quietly shows stale rows rather than anything that
 * throws. One rule at the transport layer cannot be forgotten, and it covers endpoints
 * that do not exist yet.
 *
 * It over-invalidates slightly: `POST drip-campaigns/:id/send-test-email` changes
 * nothing a list displays but still bumps the scope. That costs one refetch. The
 * opposite error costs wrong data on screen, so the trade is the right way round.
 */
@Injectable()
export class CacheInvalidationInterceptor implements HttpInterceptor {
  private versions = inject(CacheVersionService);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Reads never invalidate. Checked before the pipe so GETs pay nothing at all.
    if (request.method === 'GET') return next.handle(request);

    return next.handle(request).pipe(
      tap((event) => {
        // Only a completed response counts — a request that errored changed nothing.
        if (!(event instanceof HttpResponse)) return;
        for (const { pattern, scopes } of SCOPE_BY_URL) {
          if (pattern.test(request.url)) scopes.forEach((scope) => this.versions.bump(scope));
        }
      }),
    );
  }
}
