import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { constants } from '../helpers/constants';
import { HttpService } from './http.service';
import { CACHE_SCOPE, SNAPSHOT_MAX_AGE_MS, maxAgeForScope } from './cache-version.service';
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

  private _descriptions = new BehaviorSubject([]);
  allDescription = this._descriptions.asObservable();

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

  public conversationCache: Record<string, any> = {};
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
  public selectedCompanyDescription;
  public selectedAllContacts;
  private companyInfoApiUrl =
    'https://l777t7f5reetofkbbji7uq7jsy0oydzw.lambda-url.us-east-1.on.aws/';

  constructor(
    private httpService: HttpService,
    private campaignService: CampaignService,
  ) {
  }

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

  getDescriptions = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `company/${postData.companyId}/descriptions`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          let descriptions = res.data;
          descriptions.forEach((item) => {
            item.isEditClicked = false;
          });
          resolve(descriptions);
          this._descriptions.next(descriptions);
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

  createDescription = async (postData) => {
    let products = [...this._descriptions.getValue()];
    return new Promise(async (resolve, reject) => {
      const url = `company/${postData.companyId}/descriptions`;
      delete postData.companyId;
      // delete postData.name;
      this.httpService.post(url, postData).subscribe({
        next: (res) => {
          let item = { ...res.data };
          item.isOpened = false;
          item.isEditClicked = false;
          products.push(item);
          resolve(true);
          this._descriptions.next(products);
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

  updateDescription = async (postData) => {
    let products = [...this._descriptions.getValue()];
    return new Promise(async (resolve, reject) => {
      const id = postData.id;
      delete postData.id;
      const url = `company/descriptions/${id}`;
      this.httpService.patch(url, postData).subscribe({
        next: (res) => {
          products.forEach((p, index) => {
            if (p.id === id) {
              products[index] = res.data;
            }
          });
          resolve(true);
          this._descriptions.next(products);
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

  deleteDescription = async (postData) => {
    let products = [...this._descriptions.getValue()];
    return new Promise(async (resolve, reject) => {
      const url = `company/descriptions/${postData.id}`;
      this.httpService.delete(url).subscribe({
        next: (res) => {
          products = products.filter((p) => p.id !== postData.id);
          resolve(true);
          this._descriptions.next(products);
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

  /**
   * FIX: previously wrapped a `new Promise(async (resolve, reject) => {...})`
   * (the "async executor" antipattern). There's no `await` in this body, so
   * it's safe and cleaner as a plain synchronous executor. Debug logs kept
   * in place from the current investigation -- remove once you've confirmed
   * the upstream circular-reference fix (in setConversation) resolves this.
   */
  addMessageToConversationSrv = (postData) => {
    const url = `messages/conversations/${postData.prospectingConversationId}`;
    delete postData.prospectingConversationId;
    return new Promise((resolve, reject) => {
      console.log(postData);
      this.httpService.post(url, postData).subscribe({
        next: (res) => {
          console.log(res);
          resolve(true);
        },
        error: (err) => {
          console.log('FULL ERROR:', err);
          console.log('status:', err?.status, 'url:', err?.url, 'message:', err?.message);

          if (err?.error) {
            reject(err?.error);
          }
        },
      });
    });
  };

  /** The cached conversations page for this exact request, or null. */
  peekConversations = (postData: any) =>
    this.conversationCache[this.__contactsCacheKey(postData)] ?? null;

  getAllConversation = async (postData, overWrite = false, version = 0) => {
    // Computed BEFORE the `delete postData.companyId` below, which mutates the object
    // the key is derived from — take it after and the store and the peek disagree.
    const cacheKey = this.__contactsCacheKey(postData);

    return new Promise(async (resolve, reject) => {
      const hit = this.conversationCache[cacheKey];

      if (!overWrite) {
        // Fresh enough to stand alone: replay it, make no request.
        if (this.isSnapshotUsable(hit, version, CACHE_SCOPE.CONVERSATIONS)) {
          this._conversation.next(hit.data);
          return resolve(true);
        }
        // Stale but present: show it while the request runs rather than blanking the
        // list for a round trip.
        if (hit) this._conversation.next(hit.data);
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
          // Keyed, not PUSHED. It used to append `{page, data}` to an array and read
          // it back with `findIndex`, so a refetch left the ORIGINAL entry first in the
          // array and winning every subsequent lookup — the cache could never be
          // updated, only grown.
          this.conversationCache[cacheKey] = {
            data: this.prospectContactConversations,
            at: Date.now(),
            version,
          };
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
    if (contact?.firstName) c1 = contact.firstName[0];
    if (contact?.lastName) c2 = contact.lastName[0];
    if (contact?.first_name) c1 = contact.first_name[0];
    if (contact?.last_name) c2 = contact.last_name[0];
    return c1 + c2;
  };
  getSalesLeadName = (contact) => {
    let c1 = '',
      c2 = '';
    if (contact?.firstName) c1 = contact.firstName;
    if (contact?.lastName) c2 = contact.lastName;
    if (contact?.first_name) c1 = contact.first_name;
    if (contact?.last_name) c2 = contact.last_name;
    return c1 + ' ' + c2;
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

  // POST contacts now kicks off an ASYNC import: it responds immediately (202)
  // with { importId, status, total } (under res.data). Poll getImportStatus() to
  // learn when it finished and to read the final importedCount/skippedCount/skipped.
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

  // GET contacts/import/:id — status/progress of an async CSV import.
  // Body (under the standard { success, data } wrapper): { importId, status
  // (in_queue → inprogress → complete | failed), progress (0–100, capped at 99
  // until committed), total, importedCount, skippedCount, skipped[], error }.
  // Resolves the raw response; callers read res.data ?? res.
  getImportStatus = async (importId) => {
    return new Promise((resolve, reject) => {
      this.httpService.get(`contacts/import/${importId}`).subscribe({
        next: (res: any) => resolve(res),
        error: (err) => reject(err.error || err),
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

  assignList = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.patch('contacts/assign-list', postData).subscribe({
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

  /**
   * Cache key for a contacts page.
   *
   * Built from the WHOLE request, not `page` + `limit` as it was. Those two alone
   * collide across filter sets: a search for "acme" on page 1 and the unfiltered page 1
   * shared a key, so clearing the search could replay the filtered rows. Callers were
   * papering over it by passing `overwrite = true` on every filter change.
   */
  private __contactsCacheKey = (postData: any): string =>
    JSON.stringify(
      Object.keys(postData ?? {})
        .sort()
        .map((k) => [k, postData[k]]),
    );

  /** The cached page for this exact request, or null. Synchronous by design. */
  peekContacts = (postData: any) => this.cachedContactPages[this.__contactsCacheKey(postData)] ?? null;

  /**
   * A cached entry may stand in for a fetch only if it predates no write and no more
   * than the snapshot window. Both matter: the version alone ignores the clock (so
   * another user's change never lands), the clock alone ignores this user's own edits.
   */
  isSnapshotUsable = (entry: any, version: number, scope?: string): boolean =>
    !!entry &&
    entry.version === version &&
    Date.now() - entry.at < (scope ? maxAgeForScope(scope) : SNAPSHOT_MAX_AGE_MS);

  getContacts = async (postData, overwrite = false, version = 0) => {
    const cacheKey = this.__contactsCacheKey(postData);
    const hit = this.cachedContactPages[cacheKey];

    if (!overwrite) {
      // Fresh enough to stand alone: replay it and make no request at all.
      if (this.isSnapshotUsable(hit, version)) {
        setTimeout(() => {
          this._contactRes.next(hit.data);
        }, 0);
        return null;
      }

      // Present but STALE (or invalidated by a write). Show it anyway while the
      // request runs, so the table keeps the rows it had instead of blanking to a
      // skeleton for a round trip. The fetch below replaces them when it lands.
      if (hit) {
        setTimeout(() => {
          this._contactRes.next(hit.data);
        }, 0);
      }
    }

    // `overwrite` means "ignore what is cached FOR THIS REQUEST" — it drops this one
    // key, not the whole map. Clearing everything was the main reason Manage Contacts
    // showed a skeleton at random: every contacts screen shares this map, so a refresh
    // on List Contacts, a save in the contact drawer, an import or a delete evicted the
    // page-1 snapshot Manage Contacts reuses on entry, and each of those callers then
    // stored a DIFFERENT key. Other keys do not need evicting: a write bumps the
    // CONTACTS scope, so their recorded version no longer matches and they refetch —
    // while still rendering their stale rows instead of blanking.
    if (overwrite) {
      delete this.cachedContactPages[cacheKey];
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
          const payload = { contacts, total: res.data.totalContacts };
          // Stored on EVERY fetch, not just non-overwrite ones: `overwrite` means
          // "ignore what is cached", not "do not cache the result" — and the snapshot
          // the page reuses on its next visit has to come from somewhere.
          this.cachedContactPages[cacheKey] = {
            data: payload,
            at: Date.now(),
            version,
          };
          this._contactRes.next(payload);
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

  validateList = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('lists/validate', postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  // GET lists/:id/validation-status — current email-verification status/progress
  // for a list. Resolves the response body.
  getValidationStatus = async (listId) => {
    return new Promise((resolve, reject) => {
      this.httpService.get(`lists/${listId}/validation-status`).subscribe({
        next: (res: any) => resolve(res),
        error: (err) => reject(err.error || err),
      });
    });
  };

  // GET lists/contacts/validation-status?contactIds=1,2,3 — verification
  // status/progress for a specific subset of contacts (used when the user
  // verified only the checked contacts). Same response shape as getValidationStatus.
  getContactsValidationStatus = async (contactIds: number[]) => {
    return new Promise((resolve, reject) => {
      this.httpService
        .get(`lists/contacts/validation-status?contactIds=${contactIds.join(',')}`)
        .subscribe({
          next: (res: any) => resolve(res),
          error: (err) => reject(err.error || err),
        });
    });
  };

  private __listsCacheKey = (page: any, limit: any): string =>
    `${page ?? this.manageListCurrentPage}|${limit ?? this.manageListLimit}`;

  /** The cached page of lists for these inputs, or null. Synchronous by design. */
  peekLists = (page: any, limit: any) => this.cachedLabels[this.__listsCacheKey(page, limit)] ?? null;

  getLists = async (postData, overwrite = true, version = 0) => {
    const { page, limit } = postData;
    if (page) this.manageListCurrentPage = page;
    if (limit) this.manageListLimit = limit;

    if (!overwrite) {
      const hit = this.cachedLabels[this.__listsCacheKey(page, limit)];
      // Fresh: replay and make no request.
      if (this.isSnapshotUsable(hit, version)) {
        this._labels.next(hit.data);
        return null;
      }
      // Stale but present: show it while the request runs, rather than blanking the
      // table to a skeleton for a round trip.
      if (hit) this._labels.next(hit.data);
    }

    return new Promise(async (resolve, reject) => {
      const url = `lists/contacts?page=${this.manageListCurrentPage}&limit=${this.manageListLimit}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          let labels = res.data.lists;
          this.cachedLabels[this.__listsCacheKey(page, limit)] = {
            data: labels,
            at: Date.now(),
            version,
          };
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
      const url = `contacts?${queryString}`;
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

  setLabelsInContactsList = (contactList: Contact[]) => {
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
