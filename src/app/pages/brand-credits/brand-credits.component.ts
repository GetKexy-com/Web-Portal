import { Component, OnInit } from "@angular/core";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {
  BrandCreditsUsageCardComponent
} from '../../components/brand-credits-usage-card/brand-credits-usage-card.component';

@Component({
  selector: 'app-brand-credits',
  imports: [
    BrandLayoutComponent,
    BrandCreditsUsageCardComponent
  ],
  templateUrl: './brand-credits.component.html',
  styleUrl: './brand-credits.component.scss'
})
export class BrandCreditsComponent {
  ngOnInit(): void {
    document.title = "Subscription & Credits - KEXY Brand Portal";
  }
}
