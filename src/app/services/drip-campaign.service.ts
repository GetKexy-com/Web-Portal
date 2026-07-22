import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpService } from './http.service';
import { CampaignService } from './campaign.service';
import { SseService } from './sse.service';
import { DripCampaign, IRawDripCampaign } from '../models/DripCampaign';
import { EnrollmentTriggers, IRawEnrollmentTrigger } from '../models/EnrollmentTriggers';

@Injectable({
  providedIn: 'root',
})
export class DripCampaignService {
  private _loading = new BehaviorSubject(false);
  loading = this._loading.asObservable();

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
  public insightApiPostData;
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

  getCampaign = async (postData) => {
    this._loading.next(true);
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
            this._loading.next(false);
            resolve(campaign);
          } else {
            this._loading.next(false);
            reject(false);
          }
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

  getListOfDripCampaigns = async (limit = 10, page = 1, status: string) => {
    console.log({ status });
    let tempDealList = [];
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns?limit=${limit}&page=${page}&status=${status}`;
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

          resolve({ dripCampaigns: res.data.dripCampaigns, totalPageCounts, totalRecordsCount });
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

  activateDripCampaign = async (postData) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/activate`;
      delete postData.drip_campaign_id;
      this.httpService.post(url, postData).subscribe({
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
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
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
}
