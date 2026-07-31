import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kexy-select-dropdown',
  imports: [FormsModule, CommonModule],
  templateUrl: './kexy-select-dropdown.component.html',
  styleUrl: './kexy-select-dropdown.component.scss',
})
export class KexySelectDropdownComponent implements OnInit, OnDestroy {
  @Input() allOptions: any[];
  @Input() options: any[];
  @Input() onAddNewClick: any;
  @Input() label: string;
  @Input() labelBelowContent: string = '';
  @Input() selectedOption: any;
  @Input() placeholder = '';
  @Input() onSelectSingleItem: any;
  @Input() onOpenDropdown;
  @Input() onSelectAll: any;
  @Input() selectAllBtn: any;
  @Input() optionStyle = 'button'; // "checkbox, button
  @Input() dropdownStyle = 'outline'; // "outline, non-outline
  @Input() addNewBtn: any;
  @Input() rowIndex: any;
  @Input() required = false;
  @Input() backgroundColor = '#f8fcff';
  @Input() deleteIcon = false;
  @Input() deleteIconColor = 'black';
  @Input() onDeleteClick: any;
  @Input() editIcon = false;
  @Input() editIconColor = 'black';
  @Input() actionTextColor = 'black';
  @Input() onEditClick: any;
  @Input() shortNoteBesideLabel = '';
  @Input() isSearchAble = false;
  @Input() showTypeAndPress = false;
  @Input() isClearable = true;
  @Input() isHideDropdown = false;
  @Input() isLoading = false;
  @Input() isContentLoading: boolean = true;
  @Input() isUseSearchQueryAsOption = true;
  filteredOptions = [];
  queryString = '';

  public isOpen: boolean = false;
  outline = 'outline';
  nonOutline = 'non-outline';
  areSelectedAll = false;
  /** False flips the panel above the input. Decided by `__placeDropdown`. */
  dropdownPositionBottom = true;
  /** Breathing room kept between the panel and the viewport edge, in px. */
  minGapFromBottom = 2;
  /**
   * `bottom` for the flipped panel, measured rather than assumed.
   *
   * The panel is absolutely positioned against `.kexy-dropdown`, which also contains
   * the label — and the input box has no fixed height, it grows as selected tags wrap
   * onto more lines. So the distance from the wrap's bottom edge up to the input's top
   * is not a constant, and the stylesheet's `bottom: 38px` fallback overlaps the input
   * the moment either of those varies.
   */
  flipOffsetPx: number | null = null;

  @ViewChild('dropdownPanel') dropdownPanel?: ElementRef<HTMLElement>;
  @ViewChild('inputBox') inputBox?: ElementRef<HTMLElement>;

  constructor(
    private eRef: ElementRef,
    private cdRef: ChangeDetectorRef,
  ) {
  }

  ngOnInit(): void {
    // Capture phase, because these dropdowns mostly live inside scrolling containers
    // (the drawers' `.canvas-body`, the page content area) and a scroll inside one of
    // those does NOT bubble to window. A `window:scroll` HostListener would miss the
    // very case that makes a bottom-of-screen dropdown go off-screen.
    document.addEventListener('scroll', this.__reposition, { capture: true, passive: true });
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.__reposition, { capture: true });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.__reposition();
  }

  getSelectedAll() {
    this.areSelectedAll = this.options.every((o) => o.isSelected);
    return this.areSelectedAll;
  }

  onEditIconClick = (option, $event) => {
    this.onEditClick(option, $event);
  };

  onDeleteIconClick = (option, event) => {
    event.stopPropagation();
    this.onDeleteClick(option, event);
  };

  showPlaceholder = () => {
    if (this.optionStyle == 'checkbox') {
      return this.options.some((item) => item.isSelected);
    } else if (this.optionStyle == 'button') {
      return this.selectedOption;
    }
  };

  @HostListener('document:click', ['$event'])
  clickOutside(event) {
    const externalAllowedSection = [
      'swal2-backdrop-hide',
      'offcanvas-backdrop fade',
      'swal2-styled',
      'non-hide-from-toggle',
      'swal2-container',
      'swal-modal',
    ];
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
    // console.log("allowed?", allowedSectionClicked);
    if (allowedSectionClicked) return;

    if (Array.isArray(event.target.className)) {
      const innerItemClicked = event.target.className.includes('non-hide-from-toggle');
      if (innerItemClicked) return;
    }

    this.queryString = '';

    let labelClicked = false;
    if (Array.isArray(event.target.className)) {
      labelClicked = event.target.className.includes('kexy-drop-label-wrap');
    }
    if (this.eRef.nativeElement.contains(event.target) && !labelClicked) {
      // Only place on the closed -> open transition. This handler runs on EVERY
      // document click, and re-measuring on each in-panel click would re-render the
      // panel under the pointer mid-interaction.
      const wasOpen = this.isOpen;
      this.isOpen = true;
      this.getSelectedAll();
      if (!wasOpen) this.__placeDropdown();
    } else {
      if (this.isOpen) {
        this.isOpen = false;
      }
    }
    if (this.onOpenDropdown) this.onOpenDropdown(this.isOpen);
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.__placeDropdown();
  }

  /**
   * Decide whether the panel opens downward or flips above the input — what a native
   * `<select>` does, and what this component previously only had the CSS for:
   * `dropdownPositionBottom` and `.kexy-dropdown-items.top` both existed, but nothing
   * ever set the flag, so the panel always opened downward and ran off the bottom of
   * the screen for any dropdown near it.
   *
   * ── Measured after render, but before paint ───────────────────────────────
   * The panel is behind `*ngIf`, so its height cannot be known until it exists. This
   * therefore renders it downward, measures, and flips if needed — all inside ONE
   * synchronous task via `detectChanges()`. The browser paints at the end of the task,
   * so it never shows the intermediate position and there is no flicker. Deferring any
   * of it to a `setTimeout` or `requestAnimationFrame` WOULD flicker.
   */
  private __placeDropdown(): void {
    // Reset first: a stale flip from the last open would be measured as the truth.
    this.dropdownPositionBottom = true;
    this.flipOffsetPx = null;
    this.cdRef.detectChanges();

    const panel = this.dropdownPanel?.nativeElement;
    const input = this.inputBox?.nativeElement;
    if (!panel || !input) return;

    const inputRect = input.getBoundingClientRect();
    const panelHeight = panel.offsetHeight;
    const spaceBelow = window.innerHeight - inputRect.bottom - this.minGapFromBottom;
    const spaceAbove = inputRect.top - this.minGapFromBottom;

    // Flip only when it genuinely helps: if there is no room either way, opening
    // downward is the better failure — the panel scrolls its own list and the page can
    // scroll to it, whereas upward it would run off the top under the fixed header.
    if (spaceBelow >= panelHeight || spaceAbove <= spaceBelow) return;

    this.dropdownPositionBottom = false;
    // Distance from the wrap's bottom edge up to the input's top, so the panel sits
    // directly on top of the input however tall the input has grown.
    const wrapRect = this.eRef.nativeElement.getBoundingClientRect();
    this.flipOffsetPx = Math.max(0, Math.round(wrapRect.bottom - inputRect.top));
    this.cdRef.detectChanges();
  }

  /**
   * Re-evaluate while open. An arrow function so it can be added and removed as a
   * document listener without binding gymnastics.
   */
  private __reposition = (): void => {
    if (!this.isOpen) return;
    this.__placeDropdown();
  };

  onSelectItem(option: any, index, ev) {
    ev.preventDefault();
    this.onSelectSingleItem(option, index, this.rowIndex);
    if (this.optionStyle !== 'checkbox') {
      this.isOpen = false;
      this.cdRef.detectChanges();
    }
    this.areSelectedAll = this.options.every((o) => o.isSelected);
    // Remove query string as user select an option
    this.queryString = '';
  }

  onFormSubmit = (ev) => {
    ev.preventDefault();
    this.selectQueryStringWhenNoOptions();
  };

  selectQueryStringWhenNoOptions = () => {
    const option = {
      key: this.queryString,
      value: this.queryString,
      isSelected: false,
      searchQuery: true,
    };
    this.onSelectSingleItem(option, 0, this.rowIndex);
    // Remove query string as user select an option
    this.queryString = '';
  };

  addNewBtnClick = (distributorOrRep, event) => {
    event.preventDefault();
    this.onAddNewClick(distributorOrRep, this.rowIndex);
  };

  selectAllClicked = (event) => {
    event.preventDefault();
    let shouldSelectAll = false;
    this.options.map((o) => {
      if (!o.isSelected) {
        shouldSelectAll = true;
      }
    });
    this.options.forEach((o) => (o.isSelected = shouldSelectAll));
    this.areSelectedAll = shouldSelectAll;
    if (this.onSelectAll) this.onSelectAll(this.options);

    // Remove query string as user select an option
    this.queryString = '';
  };

  handleChangeSearchInput = (e) => {
    if (!this.isSearchAble || !this.allOptions?.length) return;

    this.queryString = e.target.value;
    if (this.queryString) {
      this.filteredOptions = this.allOptions.filter((i) =>
        i.value.toLowerCase().startsWith(this.queryString.toLowerCase()),
      );
    }
  };

  clearSelectedOption = () => {
    // Here We set {value: ""} because
    // In parent function onSelectSingleItem we tried to set the specific variable equal to the valueWePassed.value .
    this.onSelectSingleItem({ value: '', id: '', key: '' }, 0, this.rowIndex || 0);
  };
}
