// import { Component, Input, OnInit } from "@angular/core";
// import { routeConstants } from "../../helpers/routeConstants";
// import {Router, RouterLink} from "@angular/router";
// import { PreviewService } from "src/app/services/preview.service";
//
// @Component({
//   selector: 'app-nav-item',
//   imports: [
//     RouterLink
//   ],
//   templateUrl: './nav-item.component.html',
//   styleUrl: './nav-item.component.scss'
// })
// export class NavItemComponent {
//   @Input() label;
//   @Input() navigateTo = null;
//   @Input() onClick = null;
//   @Input() icon;
//   @Input() isDropDown = false;
//
//   base_url = routeConstants.BASE_URL;
//   currentUrl = "";
//   cssClass = "";
//
//   constructor(private router: Router, private previewService: PreviewService) {}
//
//   ngOnInit() {
//     this.currentUrl = this.router.url;
//     if (this.navigateTo) {
//       this.navigateTo = this.base_url + this.navigateTo;
//     }
//     if (this.isDropDown) {
//       this.cssClass = "nav-dropdown";
//     }
//     if (this.currentUrl == this.navigateTo) {
//       this.cssClass += " active";
//     }
//     this.previewService.changePreviewShowStatus(false);
//   }
//
//   onNavItemClick() {
//     this.onClick();
//   }
// }


import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { routeConstants } from '../../helpers/routeConstants';
import { IsActiveMatchOptions, NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PreviewService } from '../../services/preview.service';
import { CommonModule } from '@angular/common';

/**
 * Exactly what `routerLinkActive` applies with its default `{ exact: false }`.
 *
 * Spelled out because this component computes the active state ITSELF rather than
 * using the directive (see `alsoActiveFor`), and the highlighting of every sidebar
 * item depends on that computation staying identical to what the directive did.
 */
const NAV_ACTIVE_MATCH: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'subset',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

@Component({
  selector: 'nav-item',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './nav-item.component.html',
  styleUrl: './nav-item.component.scss'
})
export class NavItemComponent implements OnInit, OnDestroy {
  // Regular @Input properties (not signals) for compatibility
  @Input() label: string = '';
  @Input() navigateTo: string | null = null;
  @Input() onClick: (() => void) | null = null;
  @Input() icon: string = '';
  @Input() isDropDown: boolean = false;
  /**
   * Extra routes that should also light this item up, for DETAIL pages that live at a
   * sibling path rather than under the section they belong to.
   *
   * `Manage Lists` needs `list-contacts` and `Manage Campaigns` needs the campaign
   * editor: both are siblings of their section's path, so `routerLinkActive`'s subset
   * matching can never reach them, and the user ends up on a detail page with nothing
   * — or the wrong thing — highlighted. The section that OWNS the record should stay
   * lit while you are inside one of its records; the breadcrumb trail in the header
   * says the same thing.
   *
   * This is what the directive can't express, and the reason the active state is
   * computed here instead.
   */
  @Input() alsoActiveFor: string[] = [];

  // Internal signal for the resolved routerLink target
  private _navigateTo = signal<string | null>(null);
  /** Drives the `active` class. A signal so the template needn't re-run a method. */
  readonly active = signal(false);

  // Services
  private previewService = inject(PreviewService);
  private router = inject(Router);
  private routerSub?: Subscription;

  ngOnInit() {
    this._navigateTo.set(this.navigateTo ? routeConstants.BASE_URL + this.navigateTo : null);
    this.previewService.changePreviewShowStatus(false);

    // `brand-layout` is currently rebuilt on every navigation, so the initial pass
    // would be enough today — the subscription is here so highlighting doesn't
    // silently break if that ever stops being true.
    this.__refreshActive();
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.__refreshActive());
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  onNavItemClick() {
    if (this.onClick) {
      this.onClick();
    }
  }

  get resolvedNavigateTo() {
    return this._navigateTo();
  }

  private __refreshActive(): void {
    const targets = [this.navigateTo, ...this.alsoActiveFor].filter(Boolean);
    this.active.set(
      targets.some((path) =>
        this.router.isActive(routeConstants.BASE_URL + path, NAV_ACTIVE_MATCH),
      ),
    );
  }
}
