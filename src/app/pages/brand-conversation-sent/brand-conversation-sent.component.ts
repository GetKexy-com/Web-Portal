import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ProspectContact } from 'src/app/models/ProspectContact';
import { routeConstants } from 'src/app/helpers/routeConstants';
import { lastValueFrom, Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbDropdown, NgbDropdownMenu, NgbDropdownToggle, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PageUiService } from 'src/app/services/page-ui.service';
import { ProspectingService } from 'src/app/services/prospecting.service';
import Swal from 'sweetalert2';
import { DripCampaignService } from 'src/app/services/drip-campaign.service';
import { BrandLayoutComponent } from '../../layouts/brand-layout/brand-layout.component';
import { FormsModule } from '@angular/forms';
import { KexyButtonComponent } from '../../components/kexy-button/kexy-button.component';
import { BrandConvoCardComponent } from '../../components/brand-convo-card/brand-convo-card.component';
import { BrandConvoAvatarComponent } from '../../components/brand-convo-avatar/brand-convo-avatar.component';
import { BrandConvoEmailComponent } from '../../components/brand-convo-email/brand-convo-email.component';
import { KexyRichEditorComponent } from '../../components/kexy-rich-editor/kexy-rich-editor.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-brand-conversation-sent',
  imports: [
    BrandLayoutComponent,
    FormsModule,
    KexyButtonComponent,
    BrandConvoCardComponent,
    BrandConvoAvatarComponent,
    BrandConvoEmailComponent,
    KexyRichEditorComponent,
    CommonModule,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
  ],
  templateUrl: './brand-conversation-sent.component.html',
  styleUrl: './brand-conversation-sent.component.scss',
})
export class BrandConversationSentComponent {
  conversations = [];
  filteredConversations = [];
  selectedConversation;
  userData;
  isLoading: boolean = false;
  isPaginationLoading: boolean = false;
  searchLoading: boolean = false;
  page: number = 1;
  paginationLimit: number = 20;
  totalConversationCount;
  unsubscribed = false;
  selectedContacts: object[] = [];
  paginationUrl = routeConstants.BASE_URL + routeConstants.BRAND.PROSPECTING_CONV_ALL;
  conversationsSubscription: Subscription;

  // @ViewChild("conversationView") private conversationView: ElementRef;

  constructor(
    private _authService: AuthService,
    private httpService: HttpService,
    private router: Router,
    private route: ActivatedRoute,
    private modal: NgbModal,
    private pageUiService: PageUiService,
    private prospectingService: ProspectingService,
    private dripCampaignService: DripCampaignService,
  ) {
  }

  async ngOnInit() {
    document.title = 'Sent Messages - KEXY Brand Portal';
    this.userData = this._authService.userTokenValue;

    this.route.queryParams.subscribe((params) => {
      if (params['page']) {
        this.page = parseInt(params['page']);
      }
      if (this.prospectingService.totalConversationCount) this.totalConversationCount = this.prospectingService.totalConversationCount;
    });

    this.isLoading = true;
    await this.getAllConversation(true);
    this.isLoading = false;
    this.conversationsSubscription = this.prospectingService.allConversation.subscribe(
      (conversations: ProspectContact[]) => {
        console.log({ conversations });
        if (conversations.length) {
          this.setConversation(conversations);
        }
      },
    );
  }

  ngOnDestroy(): void {
    if (this.conversationsSubscription) this.conversationsSubscription.unsubscribe();
  }

  scrolledToBottom = false;

  // ngAfterViewChecked() {
  //   this.scrollToBottom();
  // }

  // scrollToBottom(): void {
  //   try {
  //     if (!this.scrolledToBottom) {
  //       this.conversationView.nativeElement.scrollTop = this.conversationView.nativeElement.scrollHeight;
  //     }
  //   } catch (err) {
  //   }
  // }

  // onScroll() {
  //   this.scrolledToBottom = true;
  // }

  setConversation = async (conversations) => {
    conversations.forEach((conversation) => {
      if(!conversation.receiverDetails.details) {
        conversation.receiverDetails.details = conversation.receiverDetails;
      }

      if(typeof conversation.receiverDetails.details === 'string') {
        conversation.receiverDetails.details = JSON.parse(conversation.receiverDetails.details);
      }

    })
    this.filteredConversations = this.conversations = conversations;
    await this.conversationTapped(conversations[0]);
    this.pageUiService.setSelectedProspectingConv(this.selectedConversation);
  };

  getNameInitials = (obj) => {
    return this.prospectingService.getSalesLeadNameInitials(obj);
  };

  previousBtnClick = async () => {
    if (this.page === 1) return;
    this.page--;
    this.isPaginationLoading = true;
    await this.getAllConversation();
    this.isPaginationLoading = false;
  };

  nextBtnClick = async () => {
    if (this.page === this.totalPage) return;
    this.page++;
    this.isPaginationLoading = true;
    await this.getAllConversation();
    this.isPaginationLoading = false;
  };

  totalPage;
  getAllConversation = async (overWrite = false) => {
    const data = {
      companyId: this.userData.supplier_id,
      page: this.page,
      limit: this.paginationLimit,
      pin: this.pinedConversation,
      sent: true,
    };

    try {
      await this.prospectingService.getAllConversation(data, overWrite);
      this.totalConversationCount = this.prospectingService.totalConversationCount;
      this.totalPage = Math.ceil(this.totalConversationCount / this.paginationLimit);
    } catch (e) {
      // Handle error here
      console.log(e);
    } finally {
    }
  };

  pinedConversation = false;
  // unreadConversation = false;
  // needFollowUpConversation = false;
  getPinndedOrUnreadConversations = async () => {
    this.isLoading = true;
    this.prospectingService.conversationCache = [];
    this.page = 1;
    await this.getAllConversation();
    this.isLoading = false;
  };

  calculateDisplayedConvRangeNumber = () => {
    if (!this.isLoading && this.page && this.filteredConversations.length) {
      if (this.filteredConversations.length === this.paginationLimit) {
        return `${(this.paginationLimit * this.page) - (this.paginationLimit - 1)}-${this.paginationLimit * this.page}`;
      }
      return `${(this.paginationLimit * this.page) - (this.paginationLimit - 1)}-${this.totalConversationCount}`;
    }
  };

  sendNextEmailTapped = async (modalContent) => {
    this.modal.open(modalContent, { size: 'lg' });
  };

  emailContent = '';
  sendBtnClicked = false;

  updatedEmailContent = '';
  onEmailContentChange = (editor) => {
    this.updatedEmailContent = editor.getData();
  };


  addMessageToConversation = async () => {
    this.sendBtnClicked = true;
    if (!this.updatedEmailContent) return;
    const data = {
      prospectingConversationId: this.selectedConversation.id,
      senderEmail: this.userData.email,
      receiverEmail: this.selectedConversation.receiverEmail,
      emailSubject: this.selectedConversation.emailSubject,
      receiverDetails: this.selectedConversation.receiverDetails,
      messageContent: this.updatedEmailContent,
    };
    try {
      this.isLoading = true;
      await this.prospectingService.addMessageToConversation(data);
      await this.getAllConversation(true);
      this.emailContent = '';
      this.modal.dismissAll();
      // this.scrollToBottom();
    } catch (e) {
      // Handle error here
      const message = e.message;
      await Swal.fire('Error', message);
    } finally {
      this.isLoading = false;
      this.sendBtnClicked = false;
    }
  };

  forwardToCampaignUserApiLoadig = false;
  forwardToCampaignUser = async (conv) => {
    const forwardEmail = localStorage.getItem('forwardEmail');
    if (!forwardEmail) {
      await Swal.fire('Error', 'Email address is missing!');
      return;
    }
    const data = {
      conversationId: this.selectedConversation.id,
      conversationMessageId: conv.id,
      receiverEmail: forwardEmail,
      messageContent: this.extractUserReply(conv.messageContent),
    };
    try {
      this.forwardToCampaignUserApiLoadig = true;
      await this.dripCampaignService.forwardToCampaignUser(data);
      await this.getAllConversation(true);
    } catch (e) {
      // Handle error here
      const message = e.message;
      await Swal.fire('Error', message);
    } finally {
      this.forwardToCampaignUserApiLoadig = false;
    }
  };

  extractUserReply(emailHtml: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(emailHtml, 'text/html');

    // Remove quoted reply sections (e.g., previous emails)
    const quotes = doc.querySelectorAll('.gmail_quote, blockquote');
    quotes.forEach(q => q.remove());

    // Remove Gmail signature
    const signatures = doc.querySelectorAll('.gmail_signature');
    signatures.forEach(s => s.remove());

    // Remove invisible tracking images (e.g., width/height 0)
    const invisibleImgs = doc.querySelectorAll('img[width="0"][height="0"]');
    invisibleImgs.forEach(img => img.remove());

    // Remove all HTML tables
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => table.remove());

    // Extract the cleaned inner text or HTML
    const body = doc.body;
    return body?.innerHTML.trim() || '';
  }


  conversationTapped = async (conv) => {
    // Set unsubscribed value to false
    this.unsubscribed = false;

    if (conv?.drip_campaign_id) {
      this.selectedConversation = {
        ...conv,
        receiverDetails: {
          ...conv.receiver_details,
          jobTitle: conv.receiver_details.title,
          companyName: conv.receiver_details.organization?.name,
          companyWebsite: conv.receiver_details.organization?.website_url,
          companyPhone: conv.receiver_details.organization?.phone,
          companyInfo: '',
        },
      };
    } else {
      this.selectedConversation = {
        ...conv,
        receiverDetails: {
          ...conv.receiverDetails,
          jobTitle: conv.receiverDetails.jobTitle,
          companyName: conv.receiverDetails.companyName,
          companyWebsite: conv.receiverDetails.details.organization?.websiteUrl,
          companyPhone: conv.receiverDetails.details.organization?.phone,
          companyInfo: '',
        }
      };
    }
    console.log(this.selectedConversation);

    // Reversing conversations
    // this.selectedConversation["prospecting_conversations_messages"] =
    //   this.selectedConversation["prospecting_conversations_messages"].sort((a, b) => {
    //     return new Date(b["message_sent_at"]).getTime() - new Date(a["message_sent_at"]).getTime();
    //   });
    // this.getProspectInfoApi({ contact_id: conv.receiverDetails.id });

    // Update "unread" messages to read.
    await this.httpService.patch(`messages/${this.selectedConversation.id}`, {
      conversation_id: this.selectedConversation.id,
    }).toPromise();

    this.pageUiService.setSelectedProspectingConv(conv);
    // Set this to user can see the last conversation without scrolling to the bottom
    this.scrolledToBottom = false;
  };

  // formatPhoneNUmber = (number) => {
  //   return PhoneNumberFormatter(number);
  // };

  getProspectInfoApi = (postData) => {
    const getProspectResponse = this.httpService.post('drip-campaigns/getProspectInfo', postData);
    lastValueFrom(getProspectResponse).then(value => {
      if (value.data?.unsubscribe) this.unsubscribed = true;
    });
  };

  // filterConversation = ($event: Event) => {
  //   const val = ($event.target as HTMLInputElement).value;
  //   this.filteredConversations = this.conversations.filter((c) => {
  //     c["name"] = c.receiver_details.first_name + " " + c.receiver_details.last_name;
  //     return c["name"].toLowerCase().includes(val.toLowerCase());
  //   });
  // };

  convSearchText = '';
  filterConversation = () => {
    this.searchLoading = true;
    const companyId = this.userData.supplier_id;
    const url = `messages/conversations/${companyId}?searchString=${this.convSearchText}`;
    const response = this.httpService.get(url);
    lastValueFrom(response).then(res => {
      if (res.success) {
        this.filteredConversations = res.data.conversations;
      }
      this.searchLoading = false;
    });
  };

  handleConvSearchInputChange = (ev) => {
    if (ev.target.value === '') this.filteredConversations = this.conversations;
  };

  // startAConversationBtnClick = () => {
  //   this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN]);
  // };

  unsubscribeBtnClick = async () => {
    let isConfirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes',
    });

    if (isConfirm.dismiss) {
      return;
    }

    const postData = {
      contact_id: this.selectedConversation.receiver_details.id,
      email: this.selectedConversation.receiver_email,
    };

    const unsubscripbeApiResponse = this.httpService.post('email/unsubscribeFromDripCampaignViaBrandUser', postData);
    lastValueFrom(unsubscripbeApiResponse).then(value => {
      console.log(value);
      if (value.success) {
        this.getProspectInfoApi({ contact_id: this.selectedConversation.receiver_details.id });
      }
    });
  };

  isContactSelected = (contact) => {
    return this.selectedContacts.indexOf(contact) > -1;
  };

  isAllContactSelected = () => {
    // for (const conv of this.conversations) {
    //   if (this.selectedContacts.indexOf(conv) === -1) {
    //     return false;
    //   }
    // }
    // return true;

    return this.conversations.every(conv => {
      return this.selectedContacts.indexOf(conv) > -1;
    });
  };

  handleSelectAllClick = () => {
    if (this.isAllContactSelected()) {
      this.conversations.forEach(conversation => {
        const index = this.selectedContacts.indexOf(conversation);
        if (index > -1) this.selectedContacts.splice(index, 1);
      });
    } else {
      this.conversations.forEach(conversation => {
        const index = this.selectedContacts.indexOf(conversation);
        if (index === -1) this.selectedContacts.push(conversation);
      });
    }
  };

  onSelectContact = (contact) => {
    const index = this.selectedContacts.indexOf(contact);
    if (index > -1) {
      this.selectedContacts.splice(index, 1);
    } else {
      this.selectedContacts.push(contact);
    }
  };

  deleteConversations = async () => {
    let isConfirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: 'Yes, delete it!',
      showLoaderOnConfirm: true,
    });

    if (isConfirm.dismiss) {
      return;
    }

    const swal = this.pageUiService.showSweetAlertLoading();
    swal.showLoading();

    const contactIds = [];
    this.selectedContacts.map(i => contactIds.push(i['id']));
    const postData = {
      conversationIds: contactIds,
    };

    try {
      await this.prospectingService.deleteConversations(postData);
      await this.getAllConversation(true);
      this.selectedContacts = [];

      swal.close();
    } catch (e) {
      swal.close();
      await Swal.fire('Error', e.message);
    }
  };
}
