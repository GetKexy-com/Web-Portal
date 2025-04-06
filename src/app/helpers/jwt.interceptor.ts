import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    constructor(private authService: AuthService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if available
        let userToken = this.authService.userTokenValue;
        let registerToken = this.authService.registrationTokenValue;
        if (userToken && userToken.token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${userToken.token}`
                }
            });
        } else if(registerToken) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${registerToken}`
                }
            });
        }

        return next.handle(request);
    }
}
