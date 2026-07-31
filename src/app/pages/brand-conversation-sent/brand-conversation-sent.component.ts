import { Component, inject, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CACHE_SCOPE, CacheVersionService } from '../../services/cache-version.service';
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
import { KexyCustomRichEditorComponent } from '../../components/kexy-custom-rich-editor/kexy-custom-rich-editor.component';
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
    KexyCustomRichEditorComponent,
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

    // Skeleton only with nothing to show. `getAllConversation()` (no overwrite) lets
    // the service decide replay vs fetch, so pagination inherits the same rule.
    const cached = this.prospectingService.peekConversations({
      companyId: this.userData.supplier_id,
      page: this.page,
      limit: this.paginationLimit,
      pin: this.pinedConversation,
      inbox: false,
    });
    this.isLoading = !cached;
    this.isRefreshing = !!cached;
    await this.getAllConversation();
    this.isRefreshing = false;
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
      // FIX: previously this assigned `conversation.receiverDetails.details =
      // conversation.receiverDetails`, which made `details` point back at its
      // own parent object (a circular reference). That circular object later
      // gets passed straight into an HTTP POST body in
      // addMessageToConversation(), and JSON.stringify() (used internally by
      // Angular's HttpClient to serialize the request body) throws
      // synchronously on circular structures -- before any request is ever
      // sent. Same root cause as the inbox component; fixed the same way:
      // shallow-copy the existing fields into `details` instead of aliasing
      // the same object.
      if(!conversation.receiverDetails.details) {
        conversation.receiverDetails.details = { ...conversation.receiverDetails };
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
  /** Revalidating with rows already on screen — dims the refresh button only. */
  private cacheVersions = inject(CacheVersionService);

  isRefreshing = false;
  /** When the rows on screen were fetched; rendered beside the refresh control. */
  lastUpdatedAt: number | null = null;

  /** Refetch on demand; rows stay on screen and the button's spinner is the feedback. */
  refresh = async () => {
    if (this.isRefreshing || this.isLoading) return;
    this.isRefreshing = true;
    try {
      await this.getAllConversation(true);
    } finally {
      this.isRefreshing = false;
    }
  };

  getAllConversation = async (overWrite = false) => {
    const data = {
      companyId: this.userData.supplier_id,
      page: this.page,
      limit: this.paginationLimit,
      pin: this.pinedConversation,
      sent: true,
    };

    try {
      await this.prospectingService.getAllConversation(
        data,
        overWrite,
        this.cacheVersions.version(CACHE_SCOPE.CONVERSATIONS),
      );
      // Read the age back off the cache — the service may have replayed a snapshot, in
      // which case the stamp must not move.
      this.lastUpdatedAt = this.prospectingService.peekConversations(data)?.at ?? Date.now();
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
    // `windowClass` is how the compose window gets its width + rounded shell:
    // NgbModal builds .modal-dialog/.modal-content itself and appends them to
    // <body>, so those wrappers carry no _ngcontent attribute and component styles
    // cannot reach them. The class is styled globally in styles.scss; the template's
    // own content is still component-scoped as usual.
    this.modal.open(modalContent, { size: 'lg', windowClass: 'kx-compose-modal' });
  };

  emailContent = '';
  sendBtnClicked = false;

  updatedEmailContent = '';

  /** True when the export HTML has no visible text and no media (empty compose). */
  private isEmailHtmlEmpty(html: string): boolean {
    if (!html) return true;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const hasMedia = !!tmp.querySelector('img, video');
    // \s covers U+00A0 (&nbsp;) in JS, so the shell's non-breaking spaces strip out too.
    const text = (tmp.textContent || '').replace(/\s+/g, '');
    return text.length === 0 && !hasMedia;
  }


  addMessageToConversation = async (editor: KexyCustomRichEditorComponent) => {
    this.sendBtnClicked = true;
    // Read the content the user typed straight from the editor. Use getBodyHtml()
    // (the inlined body fragment) rather than getHtml() — the conversation renders
    // messageContent via [innerHTML], and a full getHtml() document would leak its
    // <title> (the editor's default subject) as stray text above the message.
    const html = editor?.getBodyHtml() ?? '';
    this.updatedEmailContent = this.isEmailHtmlEmpty(html) ? '' : html;
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
      await this.prospectingService.addMessageToConversationSrv(data);
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


  // ── Thread reveal coordination ──────────────────────────────────────────────
  // Each message renders in an iframe that sizes itself on load; revealing them
  // as they settle makes the thread jump. So hide the thread behind one loader
  // and reveal only once every frame has reported ready (with a safety timeout).
  messagesLoading = false;
  showSpinner = false;
  private pendingFrames = 0;
  private capTimer: any;
  private revealTimer: any;
  private loadStartedAt = 0;
  private lastMessagesRef: any = null;
  /** Spinner shows for at least this long so it always paints (no flash on fast
   *  switches) and looks consistent on every click. */
  private static readonly MIN_SPINNER_MS = 450;
  /** Reveal no later than this even if a frame never reports ready (reused
   *  components / blocked resource) — so the thread never gets stuck hidden. */
  private static readonly MAX_WAIT_MS = 1500;

  private beginMessagesLoad(): void {
    this.clearLoadTimers();
    const msgs = this.selectedConversation?.['messages'];
    const count = msgs?.length || 0;
    // Re-clicking the already-open conversation reuses the same message frames,
    // so nothing reloads and no frameReady fires. Detect it (same array ref) and
    // leave the thread shown — no hide, no spinner.
    if (!count || msgs === this.lastMessagesRef) {
      this.lastMessagesRef = msgs ?? null;
      this.messagesLoading = false;
      this.showSpinner = false;
      return;
    }
    this.lastMessagesRef = msgs;
    this.pendingFrames = count;
    this.messagesLoading = true;
    this.showSpinner = true;
    this.loadStartedAt = Date.now();
    this.capTimer = setTimeout(() => this.reveal(), BrandConversationSentComponent.MAX_WAIT_MS);
  }

  onFrameReady = (): void => {
    if (this.pendingFrames > 0) this.pendingFrames--;
    if (this.pendingFrames <= 0) this.reveal();
  };

  /** Reveal the thread once frames are ready (or the cap fires), but keep the
   *  spinner up for at least MIN_SPINNER_MS so it's always visible. */
  private reveal(): void {
    clearTimeout(this.capTimer);
    if (this.revealTimer) return;
    const wait = Math.max(0, BrandConversationSentComponent.MIN_SPINNER_MS - (Date.now() - this.loadStartedAt));
    this.revealTimer = setTimeout(() => {
      this.messagesLoading = false;
      this.showSpinner = false;
      this.revealTimer = null;
    }, wait);
  }

  private clearLoadTimers(): void {
    clearTimeout(this.capTimer);
    clearTimeout(this.revealTimer);
    this.revealTimer = null;
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

    // Hide the thread behind a loader until all message frames are sized.
    this.beginMessagesLoad();

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

  getFullName = (obj) => {
    return this.prospectingService.getSalesLeadName(obj);
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
