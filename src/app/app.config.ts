import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { IdleRoutePreloadStrategy } from './helpers/route-preload.strategy';
import {HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import { JwtInterceptor } from "src/app/helpers/jwt.interceptor";
import { CacheInvalidationInterceptor } from './helpers/cache-invalidation.interceptor';
import { ErrorInterceptor } from './helpers/error.interceptor';

import { routes } from './app.routes';


export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: CacheInvalidationInterceptor, multi: true },
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Every route is a `loadComponent`, so without a preloading strategy the first
    // click on a nav item waited on a chunk download before anything moved on screen.
    provideRouter(routes, withPreloading(IdleRoutePreloadStrategy))],
};
