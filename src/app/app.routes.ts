import { Routes } from '@angular/router';
import {routeConstants} from './helpers/routeConstants';

export const routes: Routes = [
  { path: "", redirectTo: "/" + routeConstants.LOGIN, pathMatch: "full" },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
  }
];
