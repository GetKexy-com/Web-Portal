import { Component, OnInit, Input } from "@angular/core";
import {CommonModule} from '@angular/common';

@Component({
  selector: 'state-selection-content',
  imports: [CommonModule],
  templateUrl: './state-selection-content.component.html',
  styleUrl: './state-selection-content.component.scss'
})
export class StateSelectionContentComponent {
  @Input() states;
  @Input() toggleStateValue;
  @Input() selectedStates;
  @Input() toggleAllStateSelection;
  @Input() handleStateSearchQueryChange;
  @Input() stateSearchQuery;
  @Input() closeModal;
  @Input() submitStateSelection;

  constructor() {}

  ngOnInit() {}

  handleStateClicked = (state) => {
    this.toggleStateValue(state);
  };

  handleSelectAllCheckboxClick = () => {
    this.toggleAllStateSelection();
  };

  handleInputChange = (e) => {
    this.handleStateSearchQueryChange(e.target.value);
  };

  handleCloseIconClick = () => {
    this.closeModal();
  };

  checkActiveStatus = (v) => {
    return this.selectedStates.findIndex((i) => i.val === v);
  };

  DoneBtnClick = () => {
    this.submitStateSelection();
  };
}
