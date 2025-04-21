import { Component, Input, OnInit } from "@angular/core";
import { ProspectingService } from "../../services/prospecting.service";
import { ProspectContact } from "../../models/ProspectContact";
import { HttpService } from "../../services/http.service";
import { lastValueFrom } from "rxjs";
import { constants } from "../../helpers/constants";
import {BrandConvoAvatarComponent} from '../brand-convo-avatar/brand-convo-avatar.component';
import {CommonModule, DatePipe} from '@angular/common';

@Component({
  selector: 'brand-convo-card',
  imports: [
    BrandConvoAvatarComponent,
    DatePipe,
    CommonModule,
  ],
  templateUrl: './brand-convo-card.component.html',
  styleUrl: './brand-convo-card.component.scss'
})
export class BrandConvoCardComponent {
  @Input() conversation;
  @Input() selected: boolean = false;
  shortMessage;
  prospect: ProspectContact;

  constructor(
    private prospectingService: ProspectingService,
    private httpService: HttpService,
  ) {
  }

  ngOnInit(): void {
    if (this.conversation.drip_campaign_id) {
      this.prospect = {
        ...this.conversation,
        receiver_details: {
          ...this.conversation.receiver_details,
          jobTitle: this.conversation.receiver_details.title,
          companyName: this.conversation.receiver_details.organization?.name,
          companyWebsite: this.conversation.receiver_details.organization?.website_url,
          companyPhone: this.conversation.receiver_details.organization?.phone,
          companyInfo: "",
        },
      };
    } else {
      this.prospect = this.conversation;
    }
    this.shortMessage = this.conversation.email_subject.replaceAll("\n", "").slice(0, 36);
  }

  getNameInitials = (obj) => {
    return this.prospectingService.getSalesLeadNameInitials(obj);
  };

  getLatestMessageDate = () => {
    this.prospect["prospecting_conversations_messages"] =
      this.prospect["prospecting_conversations_messages"].sort((a, b) => {
        return new Date(b["message_sent_at"]).getTime() - new Date(a["message_sent_at"]).getTime();
      });
    return this.prospect.prospecting_conversations_messages[0].message_sent_at;
  };

  hoverActiveCard = false;
  onCardHover = () => {
    this.hoverActiveCard = true;
  };

  onCardHoverEnd = () => {
    this.hoverActiveCard = false;
  };

  handlePinbarClick = () => {
    const postData = {
      pin: this.conversation.is_pinned ? constants.NO : constants.YES,
      conversation_id: this.conversation.id,
    };
    console.log(postData);

    const response = this.httpService.post("prospect/pinConversation", postData);
    lastValueFrom(response).then(res => {
      if (res.success) {
        if (this.conversation.is_pinned) {
          this.conversation.is_pinned = false;
          return;
        }
        this.conversation.is_pinned = true;
      }
    });
  };
}
