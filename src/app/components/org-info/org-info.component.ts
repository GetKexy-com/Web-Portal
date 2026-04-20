import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user';
import { constants } from '../../helpers/constants';

@Component({
  selector: 'app-org-info',
  imports: [],
  templateUrl: './org-info.component.html',
  styleUrl: './org-info.component.scss',
})
export class OrgInfoComponent implements OnInit {
  userData: User;

  constructor(private _authService: AuthService) {
  }

  ngOnInit() {
    this.userData = this._authService.userTokenValue;
  }

  get username(): string {
    return this.userData ? this.userData.firstName + ' ' + this.userData.lastName : '';
  }

  get orgName(): string {
    return this.userData.supplier_name;
  }

  get orgLogo(): string {
    if (this.userData.supplier_logo) {
      return environment.imageUrl + this.userData.supplier_logo;
    } else {
      return '/assets/images/company_default_logo.png';
    }
  }
}
