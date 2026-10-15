import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const APP_TITLE = 'KEXY Webportal';

/**
 * The browser tab title, set centrally on every navigation: "<Page> - KEXY Webportal".
 *
 * The page name is the route's `data.title` — the same value `brand-layout` shows in the
 * header — so the tab and the header can't disagree, and a new page gets both by declaring
 * it once in `app.routes.ts`. Pages outside the brand layout (login, register, …) that have
 * no header use the route's own `title` instead; it wins when both are set.
 *
 * Pages used to set `document.title` themselves, so any page that forgot kept the previous
 * page's title (the dashboard showed "Brand List" right after login) and the suffix varied
 * ("KEXY Brand Portal", "KEXY Webportal", "KEXY Brand Webportal"). Don't set
 * `document.title` in a component; add the name to the route.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot) ?? this.deepestDataTitle(snapshot.root);
    this.title.setTitle(page ? `${page} - ${APP_TITLE}` : APP_TITLE);
  }

  /** The innermost route's `data.title`, which is the page actually on screen. */
  private deepestDataTitle(route: ActivatedRouteSnapshot | null): string | undefined {
    let found: string | undefined;
    while (route) {
      const t = route.data?.['title'];
      if (typeof t === 'string' && t.trim()) found = t;
      route = route.firstChild;
    }
    return found;
  }
}
