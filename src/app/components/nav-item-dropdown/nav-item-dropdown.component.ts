import { Component, Input, signal } from "@angular/core";
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

  // isOpen: boolean = false;
  isOpen = signal(false);

  constructor(private pageUiService: PageUiService) {}

  ngOnInit() {
    if(this.expand) {
      this.isOpen.set(true);
    }
  }

  toggleNavDropdown = () => {
    this.isOpen.update(current => !current);
  };
}
