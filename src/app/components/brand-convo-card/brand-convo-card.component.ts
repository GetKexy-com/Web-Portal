import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ProspectingService } from '../../services/prospecting.service';
import { ProspectContact } from '../../models/ProspectContact';
import { HttpService } from '../../services/http.service';
import { lastValueFrom } from 'rxjs';
import { constants } from '../../helpers/constants';
import { BrandConvoAvatarComponent } from '../brand-convo-avatar/brand-convo-avatar.component';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'brand-convo-card',
  imports: [
    BrandConvoAvatarComponent,
    DatePipe,
    CommonModule,
  ],
  templateUrl: './brand-convo-card.component.html',
  styleUrl: './brand-convo-card.component.scss',
})
export class BrandConvoCardComponent implements OnInit {
  @Input() conversation;
  @Input() selected: boolean = false;
  shortMessage;
  prospect;

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
          companyInfo: '',
        },
      };
    } else {
      this.prospect = this.conversation;
    }
    console.log(this.prospect);
    this.shortMessage = this.conversation.emailSubject.replaceAll('\n', '').slice(0, 36);
  }

  getNameInitials = (obj) => {
    return this.prospectingService.getSalesLeadNameInitials(obj);
  };

  getLatestMessageDate = () => {
    this.prospect['messages'] =
      this.prospect['messages'].sort((a, b) => {
        return new Date(b['messageSentAt']).getTime() - new Date(a['messageSentAt']).getTime();
      });
    return this.prospect['messages'][0].messageSentAt;
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
      pin: this.conversation.isPinned ? constants.NO : constants.YES,
      conversationId: this.conversation.id,
    };
    console.log(postData);

    const response = this.httpService.patch('messages/conversation/pin', postData);
    lastValueFrom(response).then(res => {
      if (res.success) {
        if (this.conversation.isPinned) {
          this.conversation.isPinned = false;
          return;
        }
        this.conversation.isPinned = true;
      }
    });
  };
}
