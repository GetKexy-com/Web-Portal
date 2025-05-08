import {Injectable} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {HttpService} from "./http.service";
import {CampaignService} from "./campaign.service";
import {SseService} from "./sse.service";
import {DripCampaign, IRawDripCampaign} from '../models/DripCampaign';
import {EnrollmentTriggers, IRawEnrollmentTrigger} from '../models/EnrollmentTriggers';

@Injectable({
  providedIn: 'root'
})
export class DripCampaignService {
  private _loading = new BehaviorSubject(false);
  loading = this._loading.asObservable();

  private _dripCampaignStatus = new BehaviorSubject("");
  dripCampaignStatus = this._dripCampaignStatus.asObservable();

  private _dripCampaignProspects = new BehaviorSubject([]);
  dripCampaignProspects = this._dripCampaignProspects.asObservable();

  private _dripCampaignTitles = new BehaviorSubject([]);
  dripCampaignTitles = this._dripCampaignTitles.asObservable();

  private _conversation = new BehaviorSubject([]);
  allConversation = this._conversation.asObservable();

  private _dripCampaignSuppressionList = new BehaviorSubject([]);
  dripCampaignSuppressionList = this._dripCampaignSuppressionList.asObservable();

  private emailLength = "";

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
      // if (dripCampaign.establishment_search_type && dripCampaign.establishment_search_value) {
      //   this.campaignService.makeDataStructureAndSetSearchEstablishmentpageData(dripCampaign);
      // }
    }
  };

  getCampaign = async (postData) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}`;
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          if (res.data) {
            let campaign = res.data;
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
        }
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
    if (!postData.dripCampaignId) {
      return this.createDripCampaign(postData);
    } else {
      return this.updateDripCampaign(postData);
    }
  };

  createDripCampaign = (postData) => {
    delete postData.dripCampaignId;
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          this._loading.next(false);
          resolve(res.data);
        }
      });
    });
  }

  updateDripCampaign = (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.dripCampaignId}`;
      delete postData.dripCampaignId;
      this.httpService.patch(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          this._loading.next(false);
          resolve(res.data);
        }
      });
    });
  }

  updateDripCampaignEmail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/email/${postData.drip_campaign_email_id}`;
      delete postData.drip_campaign_email_id;
      this.httpService.patch(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // this.dripCampaign = postData;
          resolve(res.data.id);
        }
      });
    });
  };

  deleteDripCampaignEmail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/emailDelete", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          resolve(true);
        }
      });
    });
  };

  testDripCampaignEmail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/send-test-email`;
      delete postData.drip_campaign_id;
      this.httpService.post(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          resolve(true);
        }
      });
    });
  };

  publishDripCampaign = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/publish", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          resolve(res.data.id);
        }
      });
    });
  };


  addDripCampaignTitle = async (postData) => {
    let campaignTitles = [...this._dripCampaignTitles.getValue()];
    return new Promise(async (resolve, reject) => {
      this.httpService.post("titles", postData).subscribe((res) => {
        console.log("res", res);
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let item = {...res.data};
          campaignTitles.push(item);
          resolve(true);
          this._dripCampaignTitles.next(campaignTitles);
        }
      });
    });
  };

  editDripCampaignTitle = async (postData) => {
    let campaignTitles = [...this._dripCampaignTitles.getValue()];
    let title_id = postData.title_id;
    delete postData.title_id;
    return new Promise(async (resolve, reject) => {
      this.httpService.patch(`titles/${title_id}`, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let editedItemIndex = campaignTitles.findIndex(i => i.id === title_id);
          campaignTitles[editedItemIndex].title = postData.title;
          resolve(true);
          this._dripCampaignTitles.next(campaignTitles);
        }
      });
    });
  };

  deleteDripCampaignTitle = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.delete(`/titles/${postData.title_id}`).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // remove deleted item from service
          let titleId = postData.title_id;
          let campaignTitles = [...this._dripCampaignTitles.getValue()];
          let index = campaignTitles.findIndex(i => i.id === titleId);
          campaignTitles.splice(index, 1);

          resolve(true);
          this._dripCampaignTitles.next(campaignTitles);
        }
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
      this.httpService.get("titles").subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let campaignTitles = res.data;
          resolve(campaignTitles);
          this._dripCampaignTitles.next(campaignTitles);
        }
      });
    });
  };

  setEditDripCampaignTitleItem = (data) => {
    this.editDripCampaignTitleItem = data;
  };

  getEditDripCampaignTitleItem = () => {
    return this.editDripCampaignTitleItem;
  };

  getListOfDripCampaigns = async (limit = 10, page = 1) => {
    let tempDealList = [];
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns?limit=${limit}&page=${page}`;
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          console.log('res', res);
          let totalPageCounts = Math.ceil(res.data.total / limit);
          let totalRecordsCount = res.data.total;

          res.data.dripCampaigns.sort(function (a, b) {
            const a1 = a.id,
              b1 = b.id;
            if (a1 == b1) return 0;
            return a1 < b1 ? 1 : -1;
          });

          resolve({dripCampaigns: res.data, totalPageCounts, totalRecordsCount});
        }
      });
    });
  };

  deleteOrPauseDripCampaign = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/delete", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          resolve(true);
        }
      });
    });
  };

  getListOfDripCampaignsWithoutPagination = async (overwrite = false): Promise<DripCampaign[]> => {
    return new Promise(async (resolve, reject) => {
      if (this.allDripCampaigns?.length > 0 && !overwrite) {
        resolve(this.allDripCampaigns);
        return;
      }
      this.httpService.get("drip-campaigns").subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          res.data.dripCampaigns.sort(function(a, b) {
            const a1 = a.id,
              b1 = b.id;
            if (a1 == b1) return 0;
            return a1 < b1 ? 1 : -1;
          });

          res.data.dripCampaigns.forEach((rawData: IRawDripCampaign) => {
            this.allDripCampaigns.push(new DripCampaign(rawData))
          })

          resolve(this.allDripCampaigns);
        }
      });
    });
  };

  assignProspectApi = async (postData) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/assignProspects", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }

        } else {
          this._loading.next(false);
          resolve(true);
        }
      });
    });
  };

  saveSearch = async (postData) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/saveSearch", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }

        } else {
          this._loading.next(false);
          resolve(true);
        }
      });
    });
  };

  deleteSaveSearch = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/deleteSearch", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          resolve(true);
        }
      });
    });
  };

  getSavedSearchList = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/getAllSavedSearch", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          resolve(res.data);
        }
      });
    });
  };


  addDripCampaignSuppressionUsers = async (postData) => {
    // let suppressionList = [...this._dripCampaignSuppressionList.getValue()];
    return new Promise(async (resolve, reject) => {
      this.httpService.post("supplier/addSuppressionUser", postData).subscribe((res) => {
        console.log("res", res);
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // let item = res.data;
          // if (Array.isArray(item)) {
          //   item.map(i => suppressionList.push(i));
          // }
          resolve(true);
          // this._dripCampaignSuppressionList.next(suppressionList);
        }
      });
    });
  };

  getSuppressionList = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("supplier/getSuppressionUsers", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let suppressionList = res.data;
          resolve(suppressionList);
          this._dripCampaignSuppressionList.next(suppressionList);
        }
      });
    });
  };

  deleteSuppressionUser = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("supplier/deleteSuppressionUser", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          resolve(true);
        }
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
      this.httpService.post("drip-campaigns/assignContactsAndLabelsInCampaign", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(true);
        }
      });
    });
  };

  activateDripCampaign = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/activate`;
      delete postData.drip_campaign_id;
      this.httpService.post(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(true);
        }
      });
    });
  };

  getProspects = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/prospects`;
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          this._dripCampaignProspects.next(res.data);
          resolve(true);
        }
      });
    });
  };

  unEnrollProspects = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/unEnrollProspects", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };

  insights = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/insights?emailId=${postData.drip_campaign_email_id}`;
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };

  getApolloOrganizations = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/getOrganizations", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };

  getSupportedTechnologies = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/getSupportedTechnologies", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };

  testSmtpConnection = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/testSmtpConnection", postData).subscribe((res) => {
        resolve(res);
      });
    });
  };

  getSmtpDetails = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/getSmtpDetails", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };

  deleteSmtp = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/deleteSmtp", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };

  deleteDripCampaigns = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/delete", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };

  getDripCampaignTitle = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/getTitle", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };

  getSettings = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/getSettings", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };

  updateDripCampaignWithLatestSettings = (res) => {
    let campaign = res.data;
    const dripCampaign = new DripCampaign(res.data);
    this.setDripCampaign(dripCampaign);
    this._dripCampaignStatus.next(campaign.status);
    this.sseService.addToDripBulkEmails(dripCampaign.emails);
  }

  updateSettings = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/settings`;
      delete postData.drip_campaign_id;
      this.httpService.patch(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          this.updateDripCampaignWithLatestSettings(res);
          resolve(true);
        }
      });
    });
  };

  enrollmentTriggers = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/${postData.drip_campaign_id}/enrollment-triggers`;
      delete postData.drip_campaign_id;
      this.httpService.post(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          this.updateDripCampaignWithLatestSettings(res);
          resolve(true);
        }
      });
    });
  };

  removeListFromCampaign = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `drip-campaigns/list/${postData.list_id}`;
      delete postData.list_id;
      this.httpService.delete(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          this.updateDripCampaignWithLatestSettings(res);
          resolve(true);
        }
      });
    });
  };

  forwardToCampaignUser = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/forwardToCampaignUser", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          resolve(res.data);
        }
      });
    });
  };
}
