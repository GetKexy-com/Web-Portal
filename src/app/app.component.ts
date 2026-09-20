import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { GleapService } from './services/gleap.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'KEXY - Webportal';

  constructor(private readonly gleap: GleapService) {}

  ngOnInit(): void {
    // Gleap used to be imported and initialised at module scope here, which put the whole
    // SDK in the initial bundle and ran it before first paint. It now loads itself once
    // the browser is idle; `GleapService` guarantees `initialize` still happens only once.
    this.gleap.preload();
  }
}
