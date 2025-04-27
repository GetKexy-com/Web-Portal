// import { Injectable } from '@angular/core';
// import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
// import { Observable } from 'rxjs';
//
// import { AuthService } from '../services/auth.service';
//
// @Injectable()
// export class JwtInterceptor implements HttpInterceptor {
//     constructor(private authService: AuthService) { }
//
//     intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//         // add authorization header with jwt token if available
//         let userToken = this.authService.userTokenValue;
//         let registerToken = this.authService.registrationTokenValue;
//         if (userToken && userToken.token) {
//             request = request.clone({
//                 setHeaders: {
//                     Authorization: `Bearer ${userToken.token}`
//                 }
//             });
//         } else if(registerToken) {
//             request = request.clone({
//                 setHeaders: {
//                     Authorization: `Bearer ${registerToken}`
//                 }
//             });
//         }
//
//         return next.handle(request);
//     }
// }


import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import {PageUiService} from '../services/page-ui.service';
import {environment} from '../../environments/environment';
import {constants} from './constants';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  public isUsedOldApi = false;
  public oldApiToken: string;

  constructor(private pageUiService: PageUiService) {
    this.pageUiService.apiBaseUrl.subscribe(baseUrl => {
      if (baseUrl === environment.baseUrl) {
        this.isUsedOldApi = false;
      }
      if (baseUrl === environment.secondaryBaseUrl) {
        this.oldApiToken = localStorage.getItem(constants.OLD_USER_TOKEN);
        this.isUsedOldApi = true;
      }
    })
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // add authorization header with jwt token if available
    const userToken = this.authService.userTokenValue;
    const registerToken = this.authService.registrationTokenValue;

    if (userToken?.token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${this.isUsedOldApi ? this.oldApiToken : userToken.token}`
        }
      });
    } else if (registerToken) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${registerToken}`
        }
      });
    }

    return next.handle(request);
  }
}
