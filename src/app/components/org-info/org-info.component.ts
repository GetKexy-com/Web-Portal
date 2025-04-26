import { Component, OnInit } from "@angular/core";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../services/auth.service";
import { User } from "../../models/user";
import { constants } from "../../helpers/constants";

@Component({
  selector: 'app-org-info',
  imports: [],
  templateUrl: './org-info.component.html',
  styleUrl: './org-info.component.scss'
})
export class OrgInfoComponent {
  userData: User;

  constructor(private _authService: AuthService) {}

  ngOnInit() {
    this.userData = this._authService.userTokenValue;
  }

  get username(): string {
    return this.userData ? this.userData.firstName + " " + this.userData.lastName : "";
  }

  get orgName(): string {
    const type = this.userData.type;
    if (type === constants.RESTAURANT) {
      return this.userData ? this.userData.restaurant_name : "";
    } else if (type === constants.DISTRIBUTOR) {
      return this.userData ? this.userData.distributor_name : "";
    } else if (type === constants.BRAND) {
      return this.userData ? this.userData.supplier_name : "";
    } else {
      return "";
    }
  }

  get orgLogo(): string {
    const type = this.userData.type;
    let logo = "";
    if (type === constants.RESTAURANT) {
      logo = this.userData.restaurant_logo ? this.userData.restaurant_logo : "";
    } else if (type === constants.DISTRIBUTOR) {
      logo = this.userData.distributor_logo ? this.userData.distributor_logo : "";
    } else if (type === constants.BRAND) {
      logo = this.userData.supplier_logo ? this.userData.supplier_logo : "";
    }

    if (logo) {
      return environment.imageUrl + logo;
    } else {
      return "/assets/images/company_default_logo.png";
    }
  }
}
