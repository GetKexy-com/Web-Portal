import { Component, OnInit } from "@angular/core";
import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { constants } from "../../helpers/constants";
import {InsightsStatisticsCardComponent} from '../insights-statistics-card/insights-statistics-card.component';
import {InsightsContactsOrLinksComponent} from '../insights-contacts-or-links/insights-contacts-or-links.component';

@Component({
  selector: 'app-email-insights-content',
  imports: [
    InsightsStatisticsCardComponent,
    InsightsContactsOrLinksComponent
  ],
  templateUrl: './email-insights-content.component.html',
  styleUrl: './email-insights-content.component.scss'
})
export class EmailInsightsContentComponent implements OnInit{
  sentEmailCount = 0;
  insightsData;
  insights: object[] = [];
  openRate = 0;
  clickRate = 0;
  replyRate = 0;
  clickedInsights: object[] = [];
  openedInsights: object[] = [];
  repliedInsights: object[] = [];
  topClickedContacts: object[] = [];
  topOpenedContacts: object[] = [];
  topClickedLinks: object = {};
  isLoading: boolean = false;

  constructor(public activeCanvas: NgbActiveOffcanvas, private dripCampaignService: DripCampaignService) {
  }

  async ngOnInit() {
    this.isLoading = true;

    const postData = this.dripCampaignService.insightApiPostData;
    this.insightsData = await this.dripCampaignService.insights(postData);
    console.log('insightData', this.insightsData);
    this.sentEmailCount = this.insightsData?.total;
    this.insights = this.insightsData?.insights;

    this.setDifferentTypesOfInsights();
    this.setTopClickedLinks();

    this.isLoading = false;
  }

  setDifferentTypesOfInsights = () => {
    if (this.insights && this.insights.length) {
      this.insights.forEach((insight, index) => {
        if (insight["insightType"] === constants.CLICK) {
          this.clickedInsights.push(insight);
        }

        if (insight["insightType"] === constants.OPEN) {
          this.openedInsights.push(insight);
        }

        if (insight["insightType"] === constants.REPLY) {
          this.repliedInsights.push(insight);
        }

        if(insight["clickedLink"]) {
          if (this.topClickedLinks[insight["clickedLink"]]) {
            this.topClickedLinks[insight["clickedLink"]].push(insight);
          } else {
            this.topClickedLinks[insight["clickedLink"]] = [insight];
          }
        }
      });

      this.topClickedContacts = this.setTopEngagedContacts(this.clickedInsights);
      this.topOpenedContacts = this.setTopEngagedContacts(this.openedInsights);
      this.setInsightRates();
    }
  }

  setTopEngagedContacts = (data: object[]) => {
    let topContacts: object = {};
    data.forEach(insight => {
      const contact = insight["contact"];
      const contactId = contact?.id.toString();
      if (topContacts[contactId]) {
        topContacts[contactId]["count"] += 1;
      } else {
        delete insight["contact"];
        topContacts[contactId] = {...contact, insight, count: 1};
      }
    })
    return Object.values(topContacts).sort((a, b) => b.count - a.count);
  }

  setTopClickedLinks = () => {
    this.topClickedLinks = Object.entries(this.topClickedLinks)
      .map(([key, value]) => ({ key, data: value, count: value["length"] }))
      .sort((a, b) => b.count - a.count);
  }

  setInsightRates = () => {
    this.clickRate = (this.topClickedContacts.length / this.sentEmailCount) * 100;
    this.clickRate = parseFloat(this.clickRate.toFixed(2));

    this.openRate = (this.topOpenedContacts.length / this.sentEmailCount) * 100;
    this.openRate = parseFloat(this.openRate.toFixed(2));

    this.replyRate = (this.repliedInsights.length / this.sentEmailCount) * 100;
    this.replyRate = parseFloat(this.replyRate.toFixed(2));
  }
}
