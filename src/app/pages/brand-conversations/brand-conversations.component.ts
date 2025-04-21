import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { AuthService } from "src/app/services/auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { routeConstants } from "src/app/helpers/routeConstants";
import { PageUiService } from "src/app/services/page-ui.service";
import { ProspectingService } from "src/app/services/prospecting.service";
import { lastValueFrom, Subscription } from "rxjs";
import { ProspectContact } from "src/app/models/ProspectContact";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import Swal from "sweetalert2";
import { HttpService } from "src/app/services/http.service";
import { PhoneNumberFormatter } from "src/app/helpers/phoneNumberValidator";
import {BrandLayoutComponent} from '../../layouts/brand-layout/brand-layout.component';
import {FormsModule} from '@angular/forms';
import {KexyButtonComponent} from '../../components/kexy-button/kexy-button.component';
import {BrandConvoAvatarComponent} from '../../components/brand-convo-avatar/brand-convo-avatar.component';
import {KexyRichEditorComponent} from '../../components/kexy-rich-editor/kexy-rich-editor.component';
import {BrandConvoCardComponent} from '../../components/brand-convo-card/brand-convo-card.component';
import {BrandConvoEmailComponent} from '../../components/brand-convo-email/brand-convo-email.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-brand-conversations',
  imports: [
    BrandLayoutComponent,
    FormsModule,
    KexyButtonComponent,
    BrandConvoAvatarComponent,
    KexyRichEditorComponent,
    BrandConvoCardComponent,
    BrandConvoEmailComponent,
    CommonModule
  ],
  templateUrl: './brand-conversations.component.html',
  styleUrl: './brand-conversations.component.scss'
})
export class BrandConversationsComponent {
  conversations: ProspectContact[];
  filteredConversations: ProspectContact[] = [];
  selectedConversation: ProspectContact;
  userData;
  isLoading: boolean = false;
  isPaginationLoading: boolean = false;
  searchLoading: boolean = false;
  page: number = 1;
  paginationLimit: number = 20;
  totalConversationCount;
  unsubscribed = false;
  paginationUrl = routeConstants.BASE_URL + routeConstants.BRAND.PROSPECTING_CONV_ALL;
  selectedContacts: object[] = [];
  conversationsSubscription: Subscription;

  constructor(
    private _authService: AuthService,
    private httpService: HttpService,
    private router: Router,
    private route: ActivatedRoute,
    private modal: NgbModal,
    private pageUiService: PageUiService,
    private prospectingService: ProspectingService,
  ) {
  }

  async ngOnInit() {
    document.title = "Inbox Messages - KEXY Brand Portal";
    this.userData = this._authService.userTokenValue;

    this.route.queryParams.subscribe((params) => {
      if (params["page"]) {
        this.page = parseInt(params["page"]);
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

  setConversation = async (conversations) => {
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
      supplier_id: this.userData.supplier_id,
      page: this.page,
      limit: this.paginationLimit,
      get_total_count: "false",
      pin: this.pinedConversation ? "true" : "false",
      inbox: "true",
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
  unreadConversation = false;
  needFollowUpConversation = false;
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
    this.modal.open(modalContent, { size: "lg" });
  };

  emailContent = "";
  sendBtnClicked = false;

  updatedEmailContent = "";
  onEmailContentChange = (editor) => {
    this.updatedEmailContent = editor.getData();
  };


  addMessageToConversation = async () => {
    this.sendBtnClicked = true;
    if (!this.updatedEmailContent) return;
    const data = {
      prospecting_conversation_id: this.selectedConversation.id,
      sender_email: this.userData.email,
      receiver_email: this.selectedConversation.receiver_email,
      email_subject: this.selectedConversation.email_subject,
      receiver_details: this.selectedConversation.receiver_details,
      message_content: this.updatedEmailContent,
    };
    try {
      this.isLoading = true;
      await this.prospectingService.addMessageToConversation(data);
      await this.getAllConversation(true);
      this.emailContent = "";
      this.modal.dismissAll();
      // this.scrollToBottom();
    } catch (e) {
      // Handle error here
      const message = e.message;
      await Swal.fire("Error", message);
    } finally {
      this.isLoading = false;
      this.sendBtnClicked = false;
    }
  };


  conversationTapped = async (conv) => {
    // Set unsubscribed value to false
    this.unsubscribed = false;

    if (conv?.drip_campaign_id) {
      this.selectedConversation = {
        ...conv,
        receiver_details: {
          ...conv.receiver_details,
          jobTitle: conv.receiver_details.title,
          companyName: conv.receiver_details.organization?.name,
          companyWebsite: conv.receiver_details.organization?.website_url,
          companyPhone: conv.receiver_details.organization?.phone,
          companyInfo: "",
        },
      };
    } else {
      this.selectedConversation = conv;
    }

    // Reversing conversations
    this.selectedConversation["prospecting_conversations_messages"] =
      this.selectedConversation["prospecting_conversations_messages"].sort((a, b) => {
        return new Date(b["message_sent_at"]).getTime() - new Date(a["message_sent_at"]).getTime();
      });

    console.log(conv);
    this.getProspectInfoApi({ contact_id: conv.receiver_details.id });

    // Update "unread" messages to read.
    await this.httpService.post("prospect/updateConversation", {
      conversation_id: this.selectedConversation.id,
    }).toPromise();

    this.pageUiService.setSelectedProspectingConv(conv);
    // Set this to user can see the last conversation without scrolling to the bottom
    this.scrolledToBottom = false;
  };

  formatPhoneNUmber = (number) => {
    return PhoneNumberFormatter(number);
  };

  getProspectInfoApi = (postData) => {
    const getProspectResponse = this.httpService.post("drip-campaigns/getProspectInfo", postData);
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

  convSearchText = "";
  filterConversation = () => {
    const postData = {
      search_string: this.convSearchText,
      supplier_id: this.userData.supplier_id,
    };
    this.searchLoading = true;
    const response = this.httpService.post("prospect/searchConversations", postData);
    lastValueFrom(response).then(res => {
      if (res.success) {
        this.filteredConversations = res.data;
      }
      this.searchLoading = false;
    });
  };

  handleConvSearchInputChange = (ev) => {
    if (ev.target.value === "") this.filteredConversations = this.conversations;
  };

  startAConversationBtnClick = () => {
    this.router.navigate([routeConstants.BRAND.CREATE_DRIP_CAMPAIGN]);
  };

  unsubscribeBtnClick = async () => {
    let isConfirm = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes",
    });

    if (isConfirm.dismiss) {
      return;
    }

    const postData = {
      contact_id: this.selectedConversation.receiver_details.id,
      email: this.selectedConversation.receiver_email,
    };

    const unsubscripbeApiResponse = this.httpService.post("email/unsubscribeFromDripCampaignViaBrandUser", postData);
    lastValueFrom(unsubscripbeApiResponse).then(value => {
      console.log(value);
      if (value.success) {
        this.getProspectInfoApi({ contact_id: this.selectedConversation.receiver_details.id });
      }
    });
  };

  onSelectContact = (contact) => {
    const index = this.selectedContacts.indexOf(contact);
    if (index > -1) {
      this.selectedContacts.splice(index, 1);
    } else {
      this.selectedContacts.push(contact);
    }
  };

  isContactSelected = (contact) => {
    return this.selectedContacts.indexOf(contact) > -1;
  };

  isAllContactSelected = () => {
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

  deleteConversations = async () => {
    let isConfirm = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: "Yes, delete it!",
      showLoaderOnConfirm: true,
    });

    if (isConfirm.dismiss) {
      return;
    }


    Swal.fire({
      title: "",
      text: "Please wait...",
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    Swal.showLoading();

    const contactIds = [];
    this.selectedContacts.map(i => contactIds.push(i["id"]));
    const postData = {
      supplier_id: this.userData.supplier_id,
      conversation_ids: contactIds,
    };

    try {
      await this.prospectingService.deleteConversations(postData);
      await this.getAllConversation(true);
      this.selectedContacts = [];

      Swal.close();
    } catch (e) {
      Swal.close();
      await Swal.fire("Error", e.message);
    }
  };
}
