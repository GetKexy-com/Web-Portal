import { Component, inject, OnInit } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { ProspectingService } from "../../services/prospecting.service";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { Subscription } from "rxjs";
import {CommonModule} from '@angular/common';
import { RouterLink } from '@angular/router';
import { routeConstants } from '../../helpers/routeConstants';

@Component({
  selector: 'app-list-drip-campaigns-modal-content',
  imports: [CommonModule, RouterLink],
  templateUrl: './list-drip-campaigns-modal-content.component.html',
  styleUrl: './list-drip-campaigns-modal-content.component.scss'
})
export class ListDripCampaignsModalContentComponent implements OnInit {
  activeModal = inject(NgbActiveModal);
  dripCampaigns;
  readonly editDripCampaignPath = routeConstants.BRAND.EDIT_DRIP_CAMPAIGN;
  dripCampaignTitlesSubscription: Subscription;

  constructor(private prospectingService: ProspectingService, private dripCampaignService: DripCampaignService) {
  }

  ngOnInit() {
    console.log('list drip campaigns',this.prospectingService.listDripCampaigns);
    this.dripCampaigns = this.prospectingService.listDripCampaigns;

    // this.dripCampaignTitlesSubscription = this.dripCampaignService.dripCampaignTitles.subscribe((campaignTitles) => {
    //   this.dripCampaigns.forEach(dripCampaign => {
    //     const index = campaignTitles.findIndex(c => c.id === dripCampaign.drip_campaign_title_id);
    //     if (index > -1) {
    //       dripCampaign["title"] = campaignTitles[index].title;
    //     }
    //   })
    // });
  }
}
