import { Component, OnInit } from "@angular/core";
import { AuthService } from "src/app/services/auth.service";
import { constants } from "src/app/helpers/constants";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {
  ProspectingCommonCardComponent
} from '../../components/prospecting-common-card/prospecting-common-card.component';
import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';

@Component({
  selector: 'app-slack-integration',
  imports: [
    BrandLayoutComponent,
    ProspectingCommonCardComponent,
    KexyButtonComponent
  ],
  templateUrl: './slack-integration.component.html',
  styleUrl: './slack-integration.component.scss'
})
export class SlackIntegrationComponent {
  userData;

  constructor(
    private _authService: AuthService,
  ) {
  }

  ngOnInit(): void {
  }

  openSlackUrl = () => {
    this.userData = this._authService.userTokenValue;
    console.log(this.userData);
    const url = constants.SLACK_INTEGRATION_URL + this.userData.id
    console.log({ url });
    window.open(url);
  };
}
