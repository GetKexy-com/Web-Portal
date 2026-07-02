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


import { Component, Input, inject, signal } from '@angular/core';
import { routeConstants } from '../../helpers/routeConstants';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PreviewService } from '../../services/preview.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nav-item',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './nav-item.component.html',
  styleUrl: './nav-item.component.scss'
})
export class NavItemComponent {
  // Regular @Input properties (not signals) for compatibility
  @Input() label: string = '';
  @Input() navigateTo: string | null = null;
  @Input() onClick: (() => void) | null = null;
  @Input() icon: string = '';
  @Input() isDropDown: boolean = false;

  // Internal signal for the resolved routerLink target
  private _navigateTo = signal<string | null>(null);

  // Services
  private previewService = inject(PreviewService);

  ngOnInit() {
    this._navigateTo.set(this.navigateTo ? routeConstants.BASE_URL + this.navigateTo : null);
    this.previewService.changePreviewShowStatus(false);
  }

  onNavItemClick() {
    if (this.onClick) {
      this.onClick();
    }
  }

  get resolvedNavigateTo() {
    return this._navigateTo();
  }
}
