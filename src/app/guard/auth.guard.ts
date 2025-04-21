import { Injectable } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";

import { AuthService } from "../services/auth.service";
import { routeConstants } from "../helpers/routeConstants";

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    console.log(route);
    const userToken = this.authService.userTokenValue || this.authService.registrationTokenValue;
    if (userToken) {
      // logged in so return true
      let overwrite = false;
      this.authService.getSubscriptionData(overwrite).then(subscription => {
        if (!subscription) {
          this.router.navigate([routeConstants.BRAND.SUBSCRIPTION_SELECTION]).then();
        }
      });
      return true;
    }

    // not logged in so redirect to login page with the return url
    this.router.navigate(["/" + routeConstants.LOGIN], { queryParams: { returnUrl: encodeURIComponent(state.url) } });
    return false;
  }
}
