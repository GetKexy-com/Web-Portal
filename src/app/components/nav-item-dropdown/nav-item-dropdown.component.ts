import { Component, Input } from "@angular/core";

@Component({
  selector: 'nav-item-dropdown',
  imports: [],
  templateUrl: './nav-item-dropdown.component.html',
  styleUrl: './nav-item-dropdown.component.scss'
})
export class NavItemDropdownComponent {
  @Input() label;
  /** Kept for binding compatibility; the section header no longer shows an icon. */
  @Input() icon;
  /** Kept for binding compatibility; sections are always expanded now. */
  @Input() expand = false;
  /** When the sidebar is a collapsed icon rail. */
  @Input() collapsed = false;
}
