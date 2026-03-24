import { Component, OnDestroy, OnInit } from '@angular/core';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProspectingService } from '../../services/prospecting.service';
import { Router } from '@angular/router';
import { constants } from '../../helpers/constants';

@Component({
  selector: 'app-lead-magnets',
  imports: [
    BrandLayoutComponent,
    KexyButtonComponent,
    NgIf,
  ],
  templateUrl: './lead-magnets.component.html',
  styleUrl: './lead-magnets.component.scss'
})
export class LeadMagnetsComponent implements OnInit, OnDestroy {
  userData;
  supplierId;
  contactList = [];
  totalContactsCount = 0;
  isWaitingFlag: boolean = true;
  isLoading: boolean = false;
  selectedContacts = [];
  page = 1;
  limit = 100;
  totalPage;
  lmListSubscription: Subscription;

  constructor(
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private router: Router,
  ) {
    // override the route reuse strategy
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
  }

  async ngOnInit() {
    document.title = 'Contacts - KEXY Brand Portal';
    this.userData = this._authService.userTokenValue;
    this.supplierId = this.userData.supplier_id;


    // Set pagination limit from localstorage if found
    const limit = localStorage.getItem(constants.CONTACTS_TABLE_PAGINATION_LIMIT);
    if (limit) {
      this.limit = parseInt(limit);
    }

    // set pagination data in service
    this.prospectingService.lmCurrentPage = this.page;
    this.prospectingService.lmLimit = this.limit;
    this.isWaitingFlag = false;
  }

  ngOnDestroy() {
    if (this.lmListSubscription) this.lmListSubscription.unsubscribe();
  }

  editLeadMagnetClick = () => {

  }

  addLeadMagnetClick = () => {

  }

  deleteLeadMagnets = () => {

  }


}
