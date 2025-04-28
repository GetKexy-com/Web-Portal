import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { AuthService } from "src/app/services/auth.service";
import { Router } from "@angular/router";
import { routeConstants } from "src/app/helpers/routeConstants";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { environment } from "src/environments/environment";
import {LoginLayoutComponent} from '../../layouts/login-layout/login-layout.component';
import {DownloadModalContentComponent} from '../../components/download-modal-content/download-modal-content.component';
import {constants} from '../../helpers/constants';

@Component({
  selector: 'app-brand-welcome',
  imports: [
    LoginLayoutComponent,
    DownloadModalContentComponent
  ],
  templateUrl: './brand-welcome.component.html',
  styleUrl: './brand-welcome.component.scss'
})
export class BrandWelcomeComponent {
  constructor(private _authService: AuthService, private router: Router, private modal: NgbModal) {}

  @ViewChild("kexyAppDownloadModal", { static: true }) kexyAppDownloadModal: ElementRef;

  ngOnInit() {
    this._authService.loggedUserRedirectToProperDashboard();
    document.title = "Welcome - KEXY Brand Portal";
  }

  autoLogin(e) {
    e.preventDefault();
    let data = {
      email: localStorage.getItem("registerEmail"),
      password: localStorage.getItem("registerPassword"),
    };
    this._authService.login(data.email, data.password).subscribe((data) => this.handleResponse(data));

    this._authService.secondarylogin(data.email, data.password).subscribe({
      next: (response) => {
        console.log('old data', response);
        if (response.success) {
          localStorage.setItem(constants.OLD_USER_TOKEN, response.data.token);
        }
      }
    })
  }

  async handleResponse(data) {
    console.log(data);
    if (!data.success) {
      await this.router.navigate([routeConstants.LOGIN]);
      return;
    }

    localStorage.removeItem("registerEmail");
    localStorage.removeItem("registerToken");
    localStorage.removeItem("registerPassword");
  }

  openVideoDialog() {
    window.open(environment.brandSignupWelcomePageVideoUrl, "_blank");
  }
}
