import { Component, ElementRef, HostListener, Input, inject, signal } from "@angular/core";
import { PageUiService } from "../../services/page-ui.service";

@Component({
  selector: 'nav-item-dropdown',
  imports: [],
  templateUrl: './nav-item-dropdown.component.html',
  styleUrl: './nav-item-dropdown.component.scss'
})
export class NavItemDropdownComponent {
  @Input() label;
  @Input() icon;
  @Input() expand = false;
  /** When the sidebar is a collapsed icon rail. */
  @Input() collapsed = false;

  // isOpen: boolean = false;
  isOpen = signal(false);
  /** Click-pinned state of the collapsed flyout (hover shows it via CSS too). */
  flyoutOpen = signal(false);
  /**
   * Gates the accordion open/close transition. The layout is re-created on every
   * navigation, so a section that starts open (`expand`) must render open
   * INSTANTLY — otherwise the grid-rows transition replays on each page change
   * (collapse-then-grow flash). Enabling this only on the user's first toggle
   * keeps the initial render un-animated deterministically (a render-timer flag
   * races the first paint and flashes intermittently).
   */
  animate = signal(false);

  private host = inject(ElementRef);

  constructor(private pageUiService: PageUiService) {}

  ngOnInit() {
    if(this.expand) {
      this.isOpen.set(true);
    }
  }

  toggleNavDropdown = () => {
    // In the collapsed rail there's no room for the accordion — clicking the
    // icon pins the flyout submenu open (hover reveals it too).
    if (this.collapsed) {
      this.flyoutOpen.update(open => !open);
      return;
    }
    // Enable the transition on the first user toggle so the accordion animates
    // when opened/closed by hand, but never on the initial (already-open) render.
    this.animate.set(true);
    this.isOpen.update(current => !current);
  };

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    if (this.collapsed && this.flyoutOpen() && !this.host.nativeElement.contains(event.target)) {
      this.flyoutOpen.set(false);
    }
  }
}
