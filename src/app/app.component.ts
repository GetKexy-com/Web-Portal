import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import Gleap from 'gleap';
import { environment } from "../environments/environment";

// Please make sure to call this method only once!
Gleap.initialize(environment.GLEAP_KEY);

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'kexy-webportal';
}
