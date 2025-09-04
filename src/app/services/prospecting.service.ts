import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { constants } from '../helpers/constants';
import { HttpService } from './http.service';
import { ProspectContact } from '../models/ProspectContact';
import { offPremiseQOrganizationKeywordTags } from '../helpers/campaign-premise-constants';
import { routeConstants } from '../helpers/routeConstants';
import { CampaignService } from './campaign.service';
import { List } from '../models/List';
import { Contact, IRawContact } from '../models/Contact';
import { IRawLandingPage, LandingPage } from '../models/LandingPage';

@Injectable({
  providedIn: 'root',
})
export class ProspectingService {
  private _products = new BehaviorSubject([]);
  allProduct = this._products.asObservable();

  private _conversation = new BehaviorSubject([]);
  allConversation = this._conversation.asObservable();

  private _calendlyLinks = new BehaviorSubject([]);
  calendlyLinks = this._calendlyLinks.asObservable();

  private _websites = new BehaviorSubject([]);
  websites = this._websites.asObservable();

  private __contacts: Contact[] = [];

  private _contactRes = new BehaviorSubject({ contacts: this.__contacts, total: 0 });
  contactRes = this._contactRes.asObservable();

  private _labels = new BehaviorSubject([]);
  lists = this._labels.asObservable();

  private _labelsOnly = new BehaviorSubject([]);
  labelsOnly = this._labelsOnly.asObservable();

  private _loading_all_contacts = new BehaviorSubject(false);
  loadingAllContacts = this._loading_all_contacts.asObservable();

  public conversationCache = [];
  private jobTitles = [];
  private selectedProduct;
  private selectedDescriptionData;
  private salesLeadSearchContacts = [];
  public prospectContactConversations = [];
  public totalConversationCount;
  public cachedSaledLeadSearchContacts = [];
  public totalSearchedContactCount;
  public selectedContacts = [];
  public selectedContactForSendEmail;
  public selectedContactsInContactsPage = [];
  public clickedContactInContactPage = [];
  public selectedContactLabels = [];
  public isAddNewButtonClickedInContactPage = false;
  public selectedLabelForEdit;
  public brandContactCurrentPage = 1;
  public brandContactContactLimit = 100;
  public manageListCurrentPage: number = 1;
  public manageListLimit: number = 100;
  public allContacts;
  public cachedContactPages = {};
  public cachedLabels = {};
  public cachedLabelsOnly = {};
  public listDripCampaigns = [];
  public totalListCount;
  public selectedLabelIdInListContactPage;
  public selectedContactForShowDetails;
  public listIdWhenEditContactFromListContactPage;
  public searchContactFilterData;
  public searchContactActiveFilterCount;
  public selectedAllContacts;
  private companyInfoApiUrl =
    'https://l777t7f5reetofkbbji7uq7jsy0oydzw.lambda-url.us-east-1.on.aws/';

  constructor(
    private httpService: HttpService,
    private campaignService: CampaignService,
  ) {}

  getProducts = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `prospecting-products?page=${postData.page}&limit=${postData.limit}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          let products = res.data;
          products.forEach((item) => {
            item.isOpened = false;
            item.isEditClicked = false;
          });
          resolve(products);
          this._products.next(products);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  createProduct = async (postData) => {
    let products = [...this._products.getValue()];
    return new Promise(async (resolve, reject) => {
      this.httpService.post('prospecting-products', postData).subscribe({
        next: (res) => {
          let item = { ...res.data };
          item.isOpened = false;
          item.isEditClicked = false;
          products.push(item);
          resolve(true);
          this._products.next(products);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  updateProduct = async (postData) => {
    let products = [...this._products.getValue()];
    return new Promise(async (resolve, reject) => {
      const productId = postData.id;
      delete postData.id;
      const url = `prospecting-products/${productId}`;
      this.httpService.patch(url, postData).subscribe({
        next: (res) => {
          products.forEach((p, index) => {
            if (p.id === productId) {
              products[index] = res.data;
            }
          });
          resolve(true);
          this._products.next(products);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteProduct = async (postData) => {
    let products = [...this._products.getValue()];
    return new Promise(async (resolve, reject) => {
      const url = `prospecting-products/${postData.id}`;
      this.httpService.delete(url).subscribe({
        next: (res) => {
          products = products.filter((p) => p.id !== postData.id);
          resolve(true);
          this._products.next(products);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  createConversation = async (postData) => {
    let conversation = [...this._conversation.getValue()];
    return new Promise(async (resolve, reject) => {
      this.httpService.post('prospect/createConversation', postData).subscribe({
        next: (res) => {
          let item = { ...res.data };
          conversation.push(item);
          resolve(true);
          this._conversation.next(conversation);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  addMessageToConversation = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `messages/conversations/${postData.prospectingConversationId}`;
      delete postData.prospectingConversationId;

      this.httpService.post(url, postData).subscribe({
        next: () => {
          resolve(true);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getAllConversation = async (postData, overWrite = false) => {
    return new Promise(async (resolve, reject) => {
      if (this.conversationCache.length && !overWrite) {
        const index = this.conversationCache.findIndex((i) => i.page === postData.page);
        if (index > -1) {
          this._conversation.next(this.conversationCache[index].data);
          return resolve(true);
        }
      }

      const companyId = postData.companyId;
      delete postData.companyId;

      const queryString = Object.entries(postData)
        .filter(([_, value]) => value !== '')
        .map(
          ([key, value]: [string, string]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join('&');
      const url = `messages/company/${companyId}?${queryString}`;

      this.httpService.get(url).subscribe({
        next: (res) => {
          this.prospectContactConversations = res.data.conversations;
          this.totalConversationCount = res.data.total;
          const cacheObj = {
            page: postData.page,
            data: this.prospectContactConversations,
          };
          this.conversationCache.push(cacheObj);
          this._conversation.next(this.prospectContactConversations);
          resolve(true);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getAllJobTitles = async () => {
    if (this.jobTitles.length > 0) {
      return this.jobTitles;
    }
    return new Promise(async (resolve, reject) => {
      this.httpService.get('supplier/getProspectingJobTitles').subscribe({
        next: (res) => {
          this.jobTitles = res.data;
          resolve(this.jobTitles);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  setJobTitleToEmpty = () => {
    this.jobTitles = [];
  };

  getContactCompanyInfo = async (companyName) => {
    const data = {
      company_name: companyName,
    };

    return new Promise(async (resolve, reject) => {
      fetch(this.companyInfoApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream,application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
        .then((response) => {
          resolve(response);
        })
        .catch((err) => reject(err));
    });
  };

  setSelectedProduct = (product) => {
    this.selectedProduct = product;
  };

  getSelectedProduct = () => {
    return this.selectedProduct;
  };

  setSelectedDescription = (description) => {
    this.selectedDescriptionData = description;
  };

  getSelectedDescription = () => {
    return this.selectedDescriptionData;
  };

  setSalesLeadSearchContacts = (contacts, resetPreviousData = false) => {
    return new Promise(async (resolve, reject) => {
      const prospects: ProspectContact[] = [];
      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        const prospect = {
          id: '',
          created_at: '',
          supplier_id: '',
          email_subject: '',
          prospecting_conversations_messages: [],
          receiver_email: c.email,
          sender_email: '',
          receiver_details: {
            id: c.id,
            first_name: c.first_name ? c.first_name : '',
            last_name: c.last_name ? c.last_name : '',
            jobTitle: c.title,
            companyName: c.organization?.name,
            companyWebsite: c.organization?.website_url,
            companyPhone: c.organization?.phone,
            companyInfo: '',
            city: c.city,
            state: c.state,
            country: c.country,
            email_status: c.email_status,
            ...c,
          },
        };
        prospects.push(prospect);
      }
      if (resetPreviousData) {
        this.salesLeadSearchContacts = [];
      }
      this.salesLeadSearchContacts.push(...prospects);
      resolve(true);
    });
  };

  getSalesLeadContacts = async (page = 1, resetOldData = true) => {
    const payload = this.campaignService.getSearchFilters();

    payload['page'] = page;
    payload['searchFrom'] = constants.CAMPAIGN;

    if (this.cachedSaledLeadSearchContacts.length) {
      const index = this.cachedSaledLeadSearchContacts.findIndex((i) => i.page === payload['page']);
      if (index > -1) {
        return this.cachedSaledLeadSearchContacts[index].data;
      }
    }

    const response = await this.httpService.post('contacts/apollo-searches', payload).toPromise();
    if (response.success) {
      if (response.data.contacts.length) {
        await this.setSalesLeadSearchContacts(response.data.contacts, resetOldData);
        const obj = {
          ...payload,
          data: this.salesLeadSearchContacts,
        };
        this.cachedSaledLeadSearchContacts.push(obj);
        this.totalSearchedContactCount = response.data.totalContacts;
        return this.getSalesLeadSearchContacts();
      }
    }
    return [];
  };

  getSalesLeadSearchContacts = () => {
    return this.salesLeadSearchContacts;
  };

  resetSalesLeadSearchContacts = () => {
    return (this.salesLeadSearchContacts = []);
  };

  getCalendlyLinks = () => {
    let calendlyLinksData: any = localStorage.getItem(constants.PROSPECTING_CALENDLY_LINKS);
    if (!calendlyLinksData) {
      this._calendlyLinks.next([]);
      return;
    }
    calendlyLinksData = JSON.parse(calendlyLinksData);
    this._calendlyLinks.next(calendlyLinksData);
  };

  updateCalendlyLinks = (data) => {
    localStorage.setItem(constants.PROSPECTING_CALENDLY_LINKS, JSON.stringify(data));
    this._calendlyLinks.next(data);
  };

  getWebsites = () => {
    let WebsitesData: any = localStorage.getItem(constants.PROSPECTING_WEBSITE);
    if (!WebsitesData) {
      this._websites.next([]);
      return;
    }
    WebsitesData = JSON.parse(WebsitesData);
    this._websites.next(WebsitesData);
  };

  updateWebsites = (data) => {
    localStorage.setItem(constants.PROSPECTING_WEBSITE, JSON.stringify(data));
    this._websites.next(data);
  };

  getSalesLeadNameInitials = (contact) => {
    let c1 = '',
      c2 = '';
    if (contact?.first_name) c1 = contact.first_name[0];
    if (contact?.last_name) c2 = contact.last_name[0];
    return c1 + c2;
  };

  deleteSpecificCalendlyLink = async (link, supplierId) => {
    let calendlyLinks = this._calendlyLinks.getValue();
    let index = calendlyLinks.indexOf(link);
    if (index == -1) return;

    calendlyLinks.splice(index, 1);
    const payload = {
      calendlyLinks: JSON.stringify(calendlyLinks),
    };

    let res = await this.httpService.patch(`company/${supplierId}`, payload).toPromise();
    if (res.success) {
      this.updateCalendlyLinks(calendlyLinks);
    }
  };

  deleteSpecificWebsite = async (website, supplierId) => {
    let websites = this._websites.getValue();
    let index = websites.indexOf(website);
    if (index == -1) return;

    websites.splice(index, 1);
    const payload = {
      websites: JSON.stringify(websites),
    };

    let res = await this.httpService.patch(`company/${supplierId}`, payload).toPromise();
    if (res.success) {
      this.updateWebsites(websites);
    }
  };

  getProductById = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('prospect/getProduct', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  addContacts = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('contacts', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  editContacts = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.patch('contacts', postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  removeContactsFromList = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `contacts/removeContactsFromList/${postData.listId}`;
      delete postData.listId;
      this.httpService.delete(url, postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getContacts = async (postData, overwrite = false) => {
    const { page, limit } = postData;
    if (!overwrite) {
      if (Object.keys(this.cachedContactPages).length) {
        const key = `${page}${limit}`;
        if (this.cachedContactPages[key]) {
          setTimeout(() => {
            this._contactRes.next(this.cachedContactPages[key]);
          }, 0);
          return null;
        }
      }
    }
    if (overwrite) {
      this.cachedContactPages = {};
    }

    const contacts: Contact[] = [];
    return new Promise(async (resolve, reject) => {
      const queryString = Object.entries(postData)
        .filter(([_, value]) => value !== '')
        .map(
          ([key, value]: [string, string]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join('&');
      const url = `contacts?${queryString}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          res.data.contacts.forEach((contact: IRawContact) => {
            contacts.push(new Contact(contact));
          });
          if (!overwrite) {
            const key = `${page}${limit}`;
            this.cachedContactPages[key] = { contacts, total: res.data.totalContacts };
          }
          this._contactRes.next({ contacts, total: res.data.totalContacts });
          resolve(true);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getContact = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `contacts/${postData.contactId}?companyId=${postData.companyId}`;
      this.httpService.get(url).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  createNewList = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('lists', postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteLabel = async (postData) => {
    let labels = [...this._labels.getValue()];
    return new Promise(async (resolve, reject) => {
      const labelId = postData.label_ids;
      this.httpService.delete(`lists/${labelId}`).subscribe({
        next: () => {
          // labels = labels.filter((p) => {
          //   const index = postData.label_ids.findIndex((l) => l === p.id);
          //   return index === -1;
          // });
          resolve(true);
          // this._labels.next(labels);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  updateLabel = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const labelId = postData.labelId;
      delete postData.labelId;
      this.httpService.patch(`lists/${labelId}`, postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  duplicateLabel = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('contacts/labels/duplicateWithContacts', postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getLists = async (postData, overwrite = true) => {
    const { page, limit } = postData;
    if (page) this.manageListCurrentPage = page;
    if (limit) this.manageListLimit = limit;

    if (!overwrite) {
      if (Object.keys(this.cachedLabels).length) {
        const key = `${page}${limit}`;
        if (this.cachedLabels[key]) {
          this._labels.next(this.cachedLabels[key]['data']);
          return null;
        }
      }
    }

    return new Promise(async (resolve, reject) => {
      const url = `lists/contacts?page=${this.manageListCurrentPage}&limit=${this.manageListLimit}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          let labels = res.data.lists;
          const key = `${page ? page : this.manageListCurrentPage}${limit ? limit : this.manageListLimit}`;
          this.cachedLabels[key] = { data: labels };
          this.totalListCount = res.total;
          this._labels.next(labels);
          resolve(true);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getLabelsOnly = async (postData, overwrite = true) => {
    const { page, limit } = postData;
    this.manageListCurrentPage = page;
    this.manageListLimit = limit;

    if (!overwrite) {
      if (Object.keys(this.cachedLabelsOnly).length) {
        const key = `${page}${limit}`;
        if (this.cachedLabelsOnly[key]) {
          this._labelsOnly.next(this.cachedLabelsOnly[key]['data']);
          return null;
        }
      }
    }

    return new Promise(async (resolve, reject) => {
      const url = `lists?page=${postData.page}&limit=${postData.limit}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          const key = `${page ? page : this.manageListCurrentPage}${limit ? limit : this.manageListLimit}`;
          this.cachedLabelsOnly[key] = { data: res.data.lists };
          this.totalListCount = res.data.total;
          this._labelsOnly.next(res.data.lists);
          resolve(true);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteContacts = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.delete('contacts', postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getAllContacts = async (postData, overwrite = false) => {
    if (this.allContacts?.length && !overwrite) {
      return this.allContacts;
    }
    return new Promise(async (resolve, reject) => {
      this._loading_all_contacts.next(true);

      const queryString = Object.entries(postData)
        .filter(([_, value]) => value !== '')
        .map(
          ([key, value]: [string, string]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join('&');
      const url = `/contacts?${queryString}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          this._loading_all_contacts.next(false);
          this.allContacts = this.setLabelsInContactsList(res.data.contacts);
          resolve(this.allContacts);
        },
        error: (err) => {
          this._loading_all_contacts.next(false);
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  saveContactsFromApollo = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('contacts/apollo-save-contacts', postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  notifyAddContactsInDrip = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('contacts/notifyAddContactsInDrip', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  setLabelsInContactsList = (contactList) => {
    const lists = this._labels.getValue();
    contactList.forEach((contact: Contact) => {
      let contactLists = [];
      if (contact.listIds) {
        contact.listIds.forEach((label) => {
          const index = lists.findIndex((l) => l.id?.toString() === label);
          if (index > -1) {
            contactLists.push(lists[index]);
          }
        });
      }
      contact.lists = contactLists;
    });
    return contactList;
  };

  getContactDripCampaigns = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('contacts/getDripCampaigns', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  removeDripCampaignFromContact = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('contacts/removeDripCampaignFromContact', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteConversations = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.delete('messages', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };
}
