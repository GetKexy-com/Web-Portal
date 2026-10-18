/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { installKxSwalTheme } from './app/helpers/kx-swal-theme';

// Every SweetAlert popup in the portal's design (see the helper).
installKxSwalTheme();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
