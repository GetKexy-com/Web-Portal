import { Component, OnDestroy, OnInit } from "@angular/core";
import { routeConstants } from "src/app/helpers/routeConstants";
import { AuthService } from "src/app/services/auth.service";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {ProgressCountComponent} from '../../components/progress-count/progress-count.component';
import {SearchApolloContactsComponent} from '../../components/search-apollo-contacts/search-apollo-contacts.component';
import {
  ProspectingSelectContactComponent
} from '../../components/prospecting-select-contact/prospecting-select-contact.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'brand-find-leads',
  imports: [
    BrandLayoutComponent,
    ProgressCountComponent,
    SearchApolloContactsComponent,
    ProspectingSelectContactComponent,
    CommonModule
  ],
  templateUrl: './brand-find-leads.component.html',
  styleUrl: './brand-find-leads.component.scss'
})
export class BrandFindLeadsComponent implements OnInit {
  public currentStep = 1;
  public steps = [
    {
      no: 1,
      title: "Search",
    },
    {
      no: 2,
      title: "Select Contact",
    },
  ];
  userData
  public isWaitingFlag: boolean = false;

  constructor(private _authService: AuthService) {}

  ngOnInit() {
    document.title = "Find Leads - KEXY Brand Portal";
    this.userData = this._authService.userTokenValue;
  }

  nextBtnClick = async (campaignId = "", overwrite = false) => {
    this.currentStep = ++this.currentStep;
  };

  backBtnClick = () => {
    if (this.currentStep === 1) return;
    this.currentStep = --this.currentStep;
  };

  setWaitingFlagToTrue = () => {
    this.isWaitingFlag = true;
  };

  setWaitingFlagToFalse = () => {
    this.isWaitingFlag = false;
  };

  protected readonly routeConstants = routeConstants;
}
