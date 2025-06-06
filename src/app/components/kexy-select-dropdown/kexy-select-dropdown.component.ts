import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from "@angular/core";
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'kexy-select-dropdown',
  imports: [
    FormsModule,
    CommonModule,
  ],
  templateUrl: './kexy-select-dropdown.component.html',
  styleUrl: './kexy-select-dropdown.component.scss'
})
export class KexySelectDropdownComponent {
  @Input() allOptions: any[];
  @Input() options: any[];
  @Input() onAddNewClick: any;
  @Input() label: string;
  @Input() selectedOption: any;
  @Input() placeholder = "";
  @Input() onSelectSingleItem: any;
  @Input() onOpenDropdown;
  @Input() onSelectAll: any;
  @Input() selectAllBtn: any;
  @Input() optionStyle = "button"; // "checkbox, button
  @Input() dropdownStyle = "outline"; // "outline, non-outline
  @Input() addNewBtn: any;
  @Input() rowIndex: any;
  @Input() required = false;
  @Input() backgroundColor = "#f8fcff";
  @Input() deleteIcon = false;
  @Input() deleteIconColor = "black";
  @Input() onDeleteClick: any;
  @Input() editIcon = false;
  @Input() editIconColor = "black";
  @Input() actionTextColor = "black";
  @Input() onEditClick: any;
  @Input() shortNoteBesideLabel = "";
  @Input() isSearchAble = false;
  @Input() showTypeAndPress = false;
  @Input() isClearable = true;
  @Input() isHideDropdown = false;
  @Input() isLoading = false;
  @Input() isUseSearchQueryAsOption = true;
  filteredOptions = [];
  queryString = "";

  public isOpen: boolean = false;
  outline = "outline";
  nonOutline = "non-outline";
  areSelectedAll = false;
  dropdownPositionBottom = true;
  minGapFromBottom = 2;

  constructor(private eRef: ElementRef) {
  }

  ngOnInit(): void {
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
    if (this.optionStyle == "checkbox") {
      return this.options.some((item) => item.isSelected);
    } else if (this.optionStyle == "button") {
      return this.selectedOption;
    }
  };

  @HostListener("document:click", ["$event"])
  clickOutside(event) {
    const externalAllowedSection = ["swal2-backdrop-hide", "offcanvas-backdrop fade", "swal2-styled", "non-hide-from-toggle", "swal2-container", "swal-modal"];
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

    if(Array.isArray(event.target.className)) {
      const innerItemClicked = event.target.className.includes("non-hide-from-toggle");
      if (innerItemClicked) return;
    }

    this.queryString = "";

    let labelClicked = false;
    if (Array.isArray(event.target.className)) {
      labelClicked = event.target.className.includes("kexy-drop-label-wrap");
    }
    if (this.eRef.nativeElement.contains(event.target) && !labelClicked) {
      this.isOpen = true;
      this.getSelectedAll();
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

  onSelectItem(option: any, index, ev) {
    ev.preventDefault();
    this.onSelectSingleItem(option, index, this.rowIndex);
    if (this.optionStyle !== "checkbox") {
      this.isOpen = false;
    }
    this.areSelectedAll = this.options.every((o) => o.isSelected);
    // Remove query string as user select an option
    this.queryString = "";
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
    this.queryString = "";
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
    this.queryString = "";
  };

  handleChangeSearchInput = (e) => {
    if (!this.isSearchAble || !this.allOptions?.length) return;

    this.queryString = e.target.value;
    if (this.queryString) {
      this.filteredOptions = this.allOptions.filter(i => i.value.toLowerCase().startsWith(this.queryString.toLowerCase()));
    }
  };

  clearSelectedOption = () => {
    // Here We set {value: ""} because
    // In parent function onSelectSingleItem we tried to set the specific variable equal to the valueWePassed.value .
    this.onSelectSingleItem({ value: "", id: "", key: "" }, 0, this.rowIndex || 0);
  };
}
