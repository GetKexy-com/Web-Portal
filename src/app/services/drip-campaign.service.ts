import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Swal from 'sweetalert2';
import { constants } from '../helpers/constants';
import { HttpService } from './http.service';
import { CampaignService } from './campaign.service';
import { SseService } from './sse.service';
import { DripCampaign, IRawDripCampaign } from '../models/DripCampaign';
import { EnrollmentTriggers, IRawEnrollmentTrigger } from '../models/EnrollmentTriggers';
import {
  EmailSendFilter,
  IEmailSendDetail,
  IEmailSendProgress,
} from '../models/EmailSendProgress';

/** A snapshot of the campaign list, with everything needed to judge its freshness. */
export interface IDripCampaignListCacheEntry {
  data: any;
  /** When the snapshot was taken — drives both the freshness window and the UI stamp. */
  at: number;
  /** `CacheVersionService` value at fetch time; a mismatch means a write since. */
  version: number;
}

@Injectable({
  providedIn: 'root',
})
export class DripCampaignService {
  private _loading = new BehaviorSubject(false);
  loading = this._loading.asObservable();

  /**
   * Drives the Activate button's OWN "please wait" spinner
   * (`campaign-layout-bottm-btns`), independent of `loading` — which drives the
   * full-page skeleton in `brand-drip-campaign`. Activating a campaign is an
   * in-page action the user just confirmed via a modal, not a fresh navigation, so
   * it should give feedback on the button that was clicked, not blank the whole
   * page. Set/cleared by the caller (`generate-drip-campaign.handleClickNextButton`)
   * around the WHOLE activate-then-refresh sequence, not inside a single service
   * call, since both `activateDripCampaign` and the follow-up `getCampaign` are
   * called `silent` there and would otherwise give no feedback at all.
   */
  private _activating = new BehaviorSubject(false);
  activating = this._activating.asObservable();
  setActivating = (value: boolean): void => this._activating.next(value);

  private _dripCampaignStatus = new BehaviorSubject('');
  dripCampaignStatus = this._dripCampaignStatus.asObservable();

  private _dripCampaignProspects = new BehaviorSubject([]);
  dripCampaignProspects = this._dripCampaignProspects.asObservable();

  private _dripCampaignTitles = new BehaviorSubject([]);
  dripCampaignTitles = this._dripCampaignTitles.asObservable();

  private _conversation = new BehaviorSubject([]);
  allConversation = this._conversation.asObservable();

  private _dripCampaignSuppressionList = new BehaviorSubject([]);
  dripCampaignSuppressionList = this._dripCampaignSuppressionList.asObservable();

  private emailLength = '';
  public generateDripCampaignListContact;
  public editDripCampaignTitleItem;
  public emailEditItem;
  public hasPromotion;
  public allDripCampaigns: DripCampaign[] = [];
  public selectedDripCampaignType;
  public selectedLaunchDripCampaignType;
  private dripCampaign: DripCampaign = DripCampaign.empty();
  public emailProspects = [];
  public suppressionListApiPostData;

  constructor(
    private httpService: HttpService,
    private campaignService: CampaignService,
    private sseService: SseService,
  ) {
  }

  getDripCampaignContentPageData = () => {
    return this.dripCampaign;
  };

  removeDripCampaign = () => {
    this.dripCampaign = DripCampaign.empty();
    this.campaignService.setSearchEstablishmentPageData({});
  };

  setDripCampaign = (dripCampaign: DripCampaign) => {
    const dripCampaignContent = dripCampaign.details;
    if (Object.keys(dripCampaignContent).length > 0) {
      this.dripCampaign = dripCampaign;
    }
  };

  /**
   * @param postData
   * @param silent  Skip the shared `loading` subject. `brand-drip-campaign`
   *   renders a full-page skeleton whenever `loading` is true, so a BACKGROUND
   *   refresh (the scrape-progress poll) must pass `true` — otherwise every
   *   poll blanks the whole page for the length of the request and the UI
   *   visibly flashes. Foreground navigation still wants the skeleton.
   */
  getCampaign = async (postData, silent = false) => {
    if (!silent) {
      this._loading.next(true);
    }
    const setLoading = (value: boolean) => {
      if (!silent) {
        this._loading.next(value);
      }
    };
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          if (res.data) {
            let campaign = res.data;
            console.log({ campaign });
            const dripCampaign = new DripCampaign(res.data);
            this.setDripCampaign(dripCampaign);
            this._dripCampaignStatus.next(campaign.status);
            this.sseService.addToDripBulkEmails(dripCampaign.emails);
            setLoading(false);
            resolve(campaign);
          } else {
            setLoading(false);
            reject(false);
          }
        },
        error: (err) => {
          setLoading(false);
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getLinkedinData = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/getLinkedinData/${postData.contactId}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          if (res) {
            resolve(res.data);
          } else {
            reject(false);
          }
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getLocationData = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `map-scraper/getLocationData/${postData.contactId}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          if (res) {
            console.log(res);
            resolve(res.data);
          } else {
            reject(false);
          }
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getWebsiteData = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `website-scrapper/getWebsiteData/${postData.contactId}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          if (res) {
            resolve(res.data);
          } else {
            reject(false);
          }
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  setEditEmail = (data) => {
    this.emailEditItem = data;
  };

  getEditEmail = () => {
    return this.emailEditItem;
  };

  setHasPromotion = (data) => {
    this.hasPromotion = data;
  };

  getHasPromotion = () => {
    return this.hasPromotion;
  };

  createOrUpdateDripCampaign = async (postData) => {
    this._loading.next(true);

    if (postData.dripCampaignDuplicate) {
      return this.createDripCampaign(postData);
    }

    if (!postData.dripCampaignId) {
      return this.createDripCampaign(postData);
    } else {
      return this.updateDripCampaign(postData);
    }
  };

  createDripCampaign = (postData) => {
    if (!postData.dripCampaignDuplicate) {
      delete postData.dripCampaignId;
    }
    return new Promise(async (resolve, reject) => {
      this.httpService.post('drip-campaigns', postData).subscribe({
        next: (res) => {
          this._loading.next(false);
          resolve(res.data);
        },
        error: (err) => {
          this._loading.next(false);
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  updateDripCampaign = (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.dripCampaignId}`;
      delete postData.dripCampaignId;
      this.httpService.patch(url, postData).subscribe({
        next: (res) => {
          this._loading.next(false);
          resolve(res.data);
        },
        error: (err) => {
          this._loading.next(false);
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  updateDripCampaignEmail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/email/${postData.drip_campaign_email_id}`;
      delete postData.drip_campaign_email_id;
      this.httpService.patch(url, postData).subscribe({
        next: (res) => resolve(res.data.id),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteDripCampaignEmail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/email/${postData.drip_campaign_email_id}`;
      delete postData.drip_campaign_email_id;
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

  testDripCampaignEmail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/send-test-email`;
      delete postData.drip_campaign_id;
      this.httpService.post(url, postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  publishDripCampaign = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('drip-campaigns/publish', postData).subscribe({
        next: (res) => resolve(res.data.id),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  addDripCampaignTitle = async (postData) => {
    let campaignTitles = [...this._dripCampaignTitles.getValue()];
    return new Promise(async (resolve, reject) => {
      this.httpService.post('titles', postData).subscribe({
        next: (res) => {
          let item = { ...res.data };
          campaignTitles.push(item);
          resolve(true);
          this._dripCampaignTitles.next(campaignTitles);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  editDripCampaignTitle = async (postData) => {
    let campaignTitles = [...this._dripCampaignTitles.getValue()];
    let title_id = postData.title_id;
    delete postData.title_id;
    return new Promise(async (resolve, reject) => {
      this.httpService.patch(`titles/${title_id}`, postData).subscribe({
        next: () => {
          let editedItemIndex = campaignTitles.findIndex((i) => i.id === title_id);
          campaignTitles[editedItemIndex].title = postData.title;
          resolve(true);
          this._dripCampaignTitles.next(campaignTitles);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteDripCampaignTitle = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.delete(`titles/${postData.title_id}`).subscribe({
        next: () => {
          let titleId = postData.title_id;
          let campaignTitles = [...this._dripCampaignTitles.getValue()];
          let index = campaignTitles.findIndex((i) => i.id === titleId);
          campaignTitles.splice(index, 1);
          resolve(true);
          this._dripCampaignTitles.next(campaignTitles);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getAllDripCampaignTitle = async (postData, overwrite = true) => {
    let campaignTitles = [...this._dripCampaignTitles.getValue()];
    if (!overwrite && campaignTitles.length) {
      this._dripCampaignTitles.next(campaignTitles);
      return null;
    }
    return new Promise(async (resolve, reject) => {
      this.httpService.get('titles').subscribe({
        next: (res) => {
          let campaignTitles = res.data;
          resolve(campaignTitles);
          this._dripCampaignTitles.next(campaignTitles);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  setEditDripCampaignTitleItem = (data) => {
    this.editDripCampaignTitleItem = data;
  };

  getEditDripCampaignTitleItem = () => {
    return this.editDripCampaignTitleItem;
  };

  /**
   * Last successful response per (company, page, limit, status).
   *
   * Backs a stale-while-revalidate read on the Manage Campaigns page: it paints the
   * previous rows immediately on return, then replaces them with the live response.
   * The cache is only ever a HEAD START — every visit still refetches, so nothing
   * here can serve stale data for longer than one round trip. See `peekListOfDripCampaigns`.
   *
   * Keyed by company because this service is `providedIn: 'root'` and survives the
   * business switcher; without it, switching business would show the previous
   * company's campaigns for that one round trip.
   */
  private dripCampaignListCache = new Map<string, IDripCampaignListCacheEntry>();

  private __dripListCacheKey = (scope: any, limit: number, page: number, status: string) =>
    `${scope ?? 'anon'}|${limit}|${page}|${status}`;

  /**
   * The cached entry for these exact inputs, or null. Synchronous by design.
   *
   * Returns the ENTRY, not just the payload: the caller needs `at` to decide whether
   * the snapshot is still fresh enough to skip a refetch, and to tell the user when it
   * was taken. `version` is compared against `CacheVersionService` to detect a write
   * that happened since.
   */
  peekListOfDripCampaigns = (
    scope: any,
    limit = 10,
    page = 1,
    status = '',
  ): IDripCampaignListCacheEntry | null =>
    this.dripCampaignListCache.get(this.__dripListCacheKey(scope, limit, page, status)) ?? null;

  getListOfDripCampaigns = async (
    limit = 10,
    page = 1,
    status: string,
    scope: any = null,
    version = 0,
  ) => {
    return new Promise(async (resolve, reject) => {
      // `view=summary` drops the `emails` and `settings` relations. The table reads
      // neither — `numberOfEmails` is a column on `details`, not a count of the
      // relation — and each email row carries three copies of its body
      // (`emailContent`, `rawEditorContent`, `aiRawData`), so a 25-row page was
      // downloading ~125 full emails to render a number.
      //
      // NOT applied to `getListOfDripCampaignsWithoutPagination`, which hits the same
      // endpoint but feeds `new DripCampaign(...)` for the campaign pickers.
      const url = `drip-campaigns?limit=${limit}&page=${page}&status=${status}&view=summary`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          let totalPageCounts = Math.ceil(res.data.total / limit);
          let totalRecordsCount = res.data.total;

          res.data.dripCampaigns.sort(function(a, b) {
            const a1 = a.id,
              b1 = b.id;
            if (a1 == b1) return 0;
            return a1 < b1 ? 1 : -1;
          });

          const payload = {
            dripCampaigns: res.data.dripCampaigns,
            totalPageCounts,
            totalRecordsCount,
          };
          this.dripCampaignListCache.set(this.__dripListCacheKey(scope, limit, page, status), {
            data: payload,
            at: Date.now(),
            version,
          });
          resolve(payload);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteOrPauseDripCampaign = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('drip-campaigns/delete', postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getListOfDripCampaignsWithoutPagination = async (overwrite = false): Promise<DripCampaign[]> => {
    return new Promise(async (resolve, reject) => {
      if (this.allDripCampaigns?.length > 0 && !overwrite) {
        resolve(this.allDripCampaigns);
        return;
      }

      // clear the cache
      this.allDripCampaigns = [];

      this.httpService.get('drip-campaigns').subscribe({
        next: (res) => {
          res.data.dripCampaigns.sort(function(a, b) {
            const a1 = a.id,
              b1 = b.id;
            if (a1 == b1) return 0;
            return a1 < b1 ? 1 : -1;
          });

          res.data.dripCampaigns.forEach((rawData: IRawDripCampaign) => {
            this.allDripCampaigns.push(new DripCampaign(rawData));
          });

          resolve(this.allDripCampaigns);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  // assignProspectApi = async (postData) => {
  //   this._loading.next(true);
  //   return new Promise(async (resolve, reject) => {
  //     this.httpService.post('drip-campaigns/assignProspects', postData).subscribe({
  //       next: () => {
  //         this._loading.next(false);
  //         resolve(true);
  //       },
  //       error: (err) => {
  //         this._loading.next(false);
  //         if (err.error) {
  //           reject(err.error);
  //         }
  //       }
  //     });
  //   });
  // };

  saveSearch = async (postData) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      this.httpService.post('contacts/searches', postData).subscribe({
        next: () => {
          this._loading.next(false);
          resolve(true);
        },
        error: (err) => {
          this._loading.next(false);
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteSaveSearch = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('drip-campaigns/deleteSearch', postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getSavedSearchList = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `contacts/searches?companyId=${postData.companyId}`;
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

  addDripCampaignSuppressionUsers = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('suppression-list', postData).subscribe({
        next: () => resolve(true),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getSuppressionList = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `suppression-list/company/${postData.supplier_id}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          let suppressionList = res.data;
          resolve(suppressionList);
          this._dripCampaignSuppressionList.next(suppressionList);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteSuppressionUser = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `suppression-list/${postData.companyId}`;
      delete postData.companyId;
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

  getEmailLength = () => {
    return this.emailLength;
  };

  setEmailLength = (value) => {
    this.emailLength = value;
  };

  assignContactsAndLabelsInCampaign = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService
        .post('drip-campaigns/assignContactsAndList', postData)
        .subscribe({
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
   * @param silent  Skip the shared `loading` subject (the full-page skeleton) — see
   *   `getCampaign`'s own `silent` param for the same reasoning. Existing callers
   *   keep the skeleton by default.
   */
  activateDripCampaign = async (postData, silent = false) => {
    if (!silent) this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/activate`;
      delete postData.drip_campaign_id;
      this.httpService.post(url, postData).subscribe({
        next: () => {
          if (!silent) this._loading.next(false);
          resolve(true);
        },
        error: (err) => {
          if (!silent) this._loading.next(false);
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  /**
   * The Activate button's checks, in one place, so a COMPLETED drip reactivated by adding
   * a list or prospects to it is held to exactly the same bar as a click on Activate.
   * `reason` lets a caller act on it (the Activate page opens the settings canvas for
   * `lists` / `smtp`). The backend repeats these for a reactivation
   * (`DripCampaignsService.__assertCanActivate`) with the same wording.
   */
  getActivationBlocker = (input: {
    emailCount: number;
    enrollListCount: number;
    smtpId: any;
  }): { reason: 'emails' | 'lists' | 'smtp'; message: string } | null => {
    if (!input.emailCount) {
      return { reason: 'emails', message: 'Please generate emails to activate.' };
    }
    if (!input.enrollListCount) {
      return { reason: 'lists', message: 'Please select list(s) from enrollment triggers' };
    }
    // A campaign with no send-from SMTP would activate and then fail to send.
    if (!input.smtpId) {
      return {
        reason: 'smtp',
        message: 'Please select an SMTP account from settings and save it before activating.',
      };
    }
    return null;
  };

  /**
   * The send-from SMTP id from a campaign's `smtp_account` setting, or null. Defensive
   * about the string form: the backend stores `settingsValue` as a JSON string and not
   * every path through the app hands it over already parsed.
   */
  getSelectedSmtpId = (dripCampaign: DripCampaign): any => {
    const setting = (dripCampaign?.settings || []).find(
      (s: any) => s?.settingsType === 'smtp_account',
    );
    if (!setting) return null;

    let value: any = setting.settingsValue;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (!Array.isArray(value) || !value.length) return null;

    return value[0]?.smtpId ?? value[0]?.value ?? null;
  };

  isCompleted = (dripCampaign: { status?: string } | null | undefined): boolean =>
    dripCampaign?.status === constants.COMPLETE;

  /**
   * Asked the moment someone starts adding a list or prospects to a COMPLETED drip — not
   * at save time — because doing so reactivates it and it starts sending again.
   */
  confirmReactivation = async (what: 'list' | 'prospects'): Promise<boolean> => {
    const result = await Swal.fire({
      title: 'This drip campaign is complete',
      text:
        `Adding ${what === 'list' ? 'a list' : 'prospects'} will make it ACTIVE again, and ` +
        'new prospects will receive the full email sequence from the first email. ' +
        'Prospects who already received every email will not be emailed again.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, reactivate it',
      cancelButtonText: 'Cancel',
    });
    return !result.dismiss;
  };

  getProspects = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/prospects`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          this._dripCampaignProspects.next(res.data);
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

  unEnrollProspects = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('drip-campaigns/unEnrollProspect', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  insights = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/insights?emailId=${postData.drip_campaign_email_id}`;
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

  getApolloOrganizations = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('drip-campaigns/getOrganizations', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getSupportedTechnologies = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('drip-campaigns/getSupportedTechnologies', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  testSmtpConnection = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('smtp', postData).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err),
      });
    });
  };

  getSmtpDetails = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `smtp?companyId=${postData.companyId}`;
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

  // Multi-SMTP list. GET /smtp?companyId=&page=&limit= returns res.data as
  // { smtps, total, smtpOAuth } (passwords blanked). All query params optional;
  // `getSmtpList` forwards whatever is provided. The component normalizes the
  // response (reads data.smtps; also tolerates the legacy single-object shape).
  // Create a new account: POST /smtp (testSmtpConnection). Remove: DELETE smtp/:id.
  getSmtpList = async (postData: { companyId?: any; page?: number; limit?: number }) => {
    return new Promise(async (resolve, reject) => {
      const params = new URLSearchParams();
      if (postData?.companyId != null) params.set('companyId', String(postData.companyId));
      if (postData?.page != null) params.set('page', String(postData.page));
      if (postData?.limit != null) params.set('limit', String(postData.limit));
      const query = params.toString();
      const url = query ? `smtp?${query}` : 'smtp';
      this.httpService.get(url).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => reject(err.error ? err.error : err),
      });
    });
  };

  // Edit an existing account: PATCH /smtp/:id. All body fields are optional —
  // send only what changed. Omit smtpPassword to keep the existing one. The
  // backend re-verifies by sending a test email and only persists when a
  // messageId comes back; a bad update returns 400 and leaves the row unchanged.
  // `companyId` in the body is ignored server-side (an SMTP can't be reparented).
  updateSmtp = async (id, postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `smtp/${id}`;
      this.httpService.patch(url, postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => reject(err.error ? err.error : err),
      });
    });
  };

  // Whether an SMTP is the send-from account of any non-deleted drip campaign.
  // GET /smtp/:id/drip-campaigns → res.data = { connected: boolean,
  // dripCampaigns: DripCampaign[] } (each drip = same shape as GET
  // /drip-campaigns/:id). Used to gate SMTP deletion — a connected SMTP must be
  // removed from every campaign first.
  getSmtpConnectedDripCampaigns = async (id) => {
    return new Promise(async (resolve, reject) => {
      const url = `smtp/${id}/drip-campaigns`;
      this.httpService.get(url).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => reject(err.error ? err.error : err),
      });
    });
  };

  deleteSmtp = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `smtp/${postData.id}`;
      this.httpService.delete(url).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  googleSmtp = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `smtp/google`;
      this.httpService.post(url, postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  googleSmtpTokens = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `smtp/google/tokens`;
      this.httpService.post(url, postData).subscribe({
        next: (res) => resolve(res),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  deleteDripCampaigns = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns`;
      this.httpService.delete(url, postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getDripCampaignTitle = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('drip-campaigns/getTitle', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  getSettings = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('drip-campaigns/getSettings', postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  updateDripCampaignWithLatestSettings = (res) => {
    let campaign = res.data;
    const dripCampaign = new DripCampaign(res.data);
    this.setDripCampaign(dripCampaign);
    this._dripCampaignStatus.next(campaign.status);
    this.sseService.addToDripBulkEmails(dripCampaign.emails);
  };

  updateSettings = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/settings`;
      delete postData.drip_campaign_id;
      this.httpService.patch(url, postData).subscribe({
        next: (res) => {
          this.updateDripCampaignWithLatestSettings(res);
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

  enrollmentTriggers = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/enrollment-triggers`;
      delete postData.drip_campaign_id;
      this.httpService.post(url, postData).subscribe({
        next: (res) => {
          this.updateDripCampaignWithLatestSettings(res);
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

  removeListFromCampaign = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/list/${postData.list_id}`;
      delete postData.list_id;
      this.httpService.delete(url, postData).subscribe({
        next: (res) => {
          this.updateDripCampaignWithLatestSettings(res);
          resolve(true);
        },
        // Always settle: the caller holds a loading alert open until this does.
        error: (err) => reject(err?.error ?? err),
      });
    });
  };

  forwardToCampaignUser = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/forward`;
      this.httpService.post(url, postData).subscribe({
        next: (res) => resolve(res.data),
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  /**
   * Prospect-by-prospect progress of ONE email in a campaign's sequence: who is
   * scheduled, queued, being generated, sending, sent or failed. Polled by the Insights
   * drawer while a send is running, so it is paginated and carries no email bodies — see
   * `getEmailSendDetail` for those.
   */
  getEmailSendProgress = (
    campaignId: number,
    emailId: number,
    options: { page?: number; limit?: number; status?: EmailSendFilter; search?: string } = {},
  ): Promise<IEmailSendProgress> => {
    const params = new URLSearchParams({
      page: String(options.page ?? 1),
      limit: String(options.limit ?? 25),
    });
    // 'all' is the absence of a filter — the API has no such value.
    if (options.status && options.status !== 'all') params.set('status', options.status);
    if (options.search?.trim()) params.set('search', options.search.trim());

    return this.__getData(`drip-campaigns/${campaignId}/emails/${emailId}/send-progress?${params}`);
  };

  /**
   * What the AI generated versus what was sent, for one prospect. A row from the send
   * log is identified by its `logId`; a send from before the send log existed has none
   * and is read from its conversation instead. Both answer with the same shape.
   */
  getEmailSendDetail = (
    campaignId: number,
    emailId: number,
    ref: { logId: number | null; conversationId: number | null },
  ): Promise<IEmailSendDetail> => {
    const base = `drip-campaigns/${campaignId}/emails/${emailId}`;
    if (ref.logId) return this.__getData(`${base}/send-logs/${ref.logId}`);
    return this.__getData(`${base}/conversations/${ref.conversationId}/content`);
  };

  private __getData = <T>(url: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      this.httpService.get(url).subscribe({
        next: (res) => resolve(res.data),
        // Unlike most calls in this file, never leave the promise pending: a poll that
        // silently hangs is indistinguishable from a send that has stalled.
        error: (err) => reject(err?.error ?? err),
      });
    });
}
