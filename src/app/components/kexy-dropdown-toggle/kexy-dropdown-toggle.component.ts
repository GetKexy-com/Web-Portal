import { Component, ElementRef, HostListener, Input } from "@angular/core";
import {CommonModule} from '@angular/common';

@Component({
  selector: 'kexy-dropdown-toggle',
  imports: [CommonModule],
  templateUrl: './kexy-dropdown-toggle.component.html',
  styleUrl: './kexy-dropdown-toggle.component.scss'
})
export class KexyDropdownToggleComponent {
  @Input() label: string;
  @Input() placeholder = "";
  @Input() onOpenDropdown;
  @Input() required = false;
  @Input() shortNoteBesideLabel = "";
  @Input() backgroundColor = "#f8fcff";
  @Input() dropdownStyle = "outline"; // "outline, non-outline
  @Input() selectedData = [];
  @Input() isClearable = false;
  @Input() clearItem;

  public isOpen: boolean = false;
  outline = "outline";
  nonOutline = "non-outline";
  dropdownPositionBottom = true;

  constructor(private eRef: ElementRef) {
  }

  ngOnInit(): void {
  }

  @HostListener("document:click", ["$event"])
  clickOutside(event) {
    const externalAllowedSection = ["swal2-backdrop-hide", "offcanvas-backdrop fade", "swal2-cancel", "non-hide-from-toggle"];
    let allowedSectionClicked = false;
    externalAllowedSection.forEach((s) => {
      if (!Array.isArray(event.target.className)) {
        return;
      }
      if (event.target.className.includes(s)) {
        allowedSectionClicked = true;
        return;
      }
    });
    if (allowedSectionClicked) return;
    const innerItemClicked = event.target.className.includes("non-hide-from-toggle");
    if (innerItemClicked) return;

    let labelClicked = false;
    if (Array.isArray(event.target.className)) {
      labelClicked = event.target.className.includes("kexy-drop-label-wrap");
    }
    if (this.eRef.nativeElement.contains(event.target) && !labelClicked) {
      this.isOpen = true;
    } else {
      if (this.isOpen) {
        this.isOpen = false;
      }
    }
    if (this.onOpenDropdown) this.onOpenDropdown(this.isOpen);
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeIconClick = (item) => {
    this.clearItem(item);
  };
}
