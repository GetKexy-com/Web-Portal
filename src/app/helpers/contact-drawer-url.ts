import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { NgbOffcanvasRef } from '@ng-bootstrap/ng-bootstrap';
import { trackDrawerInUrl } from './drawer-url';

/**
 * The open Edit / Create Contact drawer lives in the address — `?contact=<id>` or
 * `?contact=new` — so a reload (or a copied link) opens it again. Used by Manage Contacts
 * and a list's Contacts page. How the address is written: `drawer-url.ts`.
 */
export const CONTACT_DRAWER_PARAM = 'contact';
export const NEW_CONTACT_DRAWER = 'new';

/** Puts `value` in the address while `ref` is open and removes it when the drawer closes. */
export function trackContactDrawer(
  location: Location,
  router: Router,
  ref: NgbOffcanvasRef,
  value: string | number | null,
): void {
  // Several selected contacts edited together have no single address.
  if (value === null || value === undefined) return;
  trackDrawerInUrl(location, router, ref, { [CONTACT_DRAWER_PARAM]: value });
}
