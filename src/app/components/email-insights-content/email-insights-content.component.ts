import { Component, OnInit } from "@angular/core";
import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { constants } from "../../helpers/constants";
import {InsightsStatisticsCardComponent} from '../insights-statistics-card/insights-statistics-card.component';
import {InsightsContactsOrLinksComponent} from '../insights-contacts-or-links/insights-contacts-or-links.component';
import {ExportToCsv} from '../../helpers/CSVHelper';
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';

@Component({
  selector: 'app-email-insights-content',
  imports: [
    InsightsStatisticsCardComponent,
    InsightsContactsOrLinksComponent,
    KexyButtonComponent
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
  exportBtnLoading: boolean = false;
  email;
  mergedOpenedAndClickedContacts: object = {};

  constructor(public activeCanvas: NgbActiveOffcanvas, private dripCampaignService: DripCampaignService) {
  }

  async ngOnInit() {
    this.isLoading = true;

    const postData = this.dripCampaignService.insightApiPostData;
    this.email = postData.email;
    console.log("email", this.email);
    delete postData.email;
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
      this.setMergedContact();
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

  setMergedContact = () => {
    this.mergedOpenedAndClickedContacts = {};

    this.topOpenedContacts.forEach((contact) => {
      this.mergedOpenedAndClickedContacts[contact["id"]] = { ...contact, openCount: contact["count"], clickCount: 0 };
    });

    this.topClickedContacts.forEach((contact) => {
      if (this.mergedOpenedAndClickedContacts[contact["id"]]) {
        this.mergedOpenedAndClickedContacts[contact["id"]] = {
          ...this.mergedOpenedAndClickedContacts[contact["id"]],
          clickCount: contact["count"],
        };
      } else {
        this.mergedOpenedAndClickedContacts[contact["id"]] = { ...contact, clickCount: contact["count"], openCount: 0 };
      }
    });
    console.log("mergedContact", this.mergedOpenedAndClickedContacts);
  };

  exportCSV = async () => {
    const headers = `First Name,Last Name,Email Number in Campaign,Email Subject Line,Number of Opens,Number of Clicks,Email,Job Title,Company Name,Phone Number,Linkedin Url,City,State,Country,Date/Time Clicked`;
    let rows = "";
    Object.keys(this.mergedOpenedAndClickedContacts).forEach(key => {
      const contact = this.mergedOpenedAndClickedContacts[key];
      const contactDetails = JSON.parse(contact["details"]);

      rows += `${contactDetails.first_name?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.last_name?.replace(/,/g, " ")}, `;
      rows += `${this.email.emailSequence.toString()?.replace(/,/g, " ")}, `;
      rows += `${this.email.emailSubject?.replace(/,/g, " ")}, `;
      rows += `${contact.openCount?.toString()?.replace(/,/g, " ")}, `;
      rows += `${contact.clickCount?.toString()?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.email?.replace(/,/g, " ")}, `;
      rows += `${contact.jobTitle?.replace(/,/g, " ")}, `;
      rows += `${contact.companyName?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.organization?.phone?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.linkedin_url?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.city?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.state?.replace(/,/g, " ")}, `;
      rows += `${contactDetails.country?.replace(/,/g, " ")}, `;
      rows += `${contact.insight?.createdAt?.replace(/,/g, " ")}\n`;
    });
    await ExportToCsv.download("Contacts.csv", headers + "\n" + rows);
  };
}
