import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { HttpService } from "./http.service";
import { CampaignService } from "./campaign.service";
import { SseService } from "./sse.service";

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
  public allDripCampaigns = [];
  public selectedDripCampaignType;
  public selectedLaunchDripCampaignType;
  private dripCampaignContentPageData = {};
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
    return this.dripCampaignContentPageData;
  };

  removeDripCampaign = () => {
    this.dripCampaignContentPageData = {};
    this.campaignService.setSearchEstablishmentPageData({});
  };

  setPagesData = (dripCampaign) => {
    const dripCampaignContent = dripCampaign.drip_campaign_detail;
    if (Object.keys(dripCampaignContent).length > 0) {
      this.dripCampaignContentPageData = dripCampaign;
      if (dripCampaign.establishment_search_type && dripCampaign.establishment_search_value) {
        this.campaignService.makeDataStructureAndSetSearchEstablishmentpageData(dripCampaign);
      }
    }
  };

  getCampaign = async (postData) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      this.httpService.get(`drip-campaigns/get/${postData.drip_campaign_id}`).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          if (res.data) {
            // Set page data
            let campaign = res.data;
            this.setPagesData(campaign);
            this._dripCampaignStatus.next(campaign.status);
            const emails = campaign.drip_campaign_emails;
            emails.forEach(email => {
              email.delay_between_previous_email = JSON.parse(email.delay_between_previous_email);
            });
            this.sseService.addToDripBulkEmails(emails);
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
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/createOrUpdate", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          this._loading.next(false);
          // this.dripCampaignContentPageData = postData;
          resolve(res.data);
        }
      });
    });
  };
  updateDripCampaignEmail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/updateEmail", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // this.dripCampaignContentPageData = postData;
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
      this.httpService.post("drip-campaigns/sendTestEmail", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // this.dripCampaignContentPageData = postData;
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
          let item = { ...res.data };
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

  getListOfDripCampaigns = async (limit = 10, page = 1, supplier_id) => {
    let tempDealList = [];
    let postData = {
      page: page,
      supplier_id: supplier_id,
      limit: limit,
      get_total_count: true,
    };
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/getAll", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {

          let totalPageCounts = Math.ceil(res.data.total / limit);
          let totalRecordsCount = res.data.total;

          res.data.drip_campaigns.sort(function(a, b) {
            const a1 = a.id,
              b1 = b.id;
            if (a1 == b1) return 0;
            return a1 < b1 ? 1 : -1;
          });

          resolve({ dripCampaigns: res.data.drip_campaigns, totalPageCounts, totalRecordsCount });
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

  getListOfDripCampaignsWithoutPagination = async (postData, overwrite = false) => {
    if (this.allDripCampaigns.length > 0 && !overwrite) {
      return this.allDripCampaigns;
    }
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/getAll", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }

        } else {
          res.data.drip_campaigns.sort(function(a, b) {
            const a1 = a.id,
              b1 = b.id;
            if (a1 == b1) return 0;
            return a1 < b1 ? 1 : -1;
          });
          this.allDripCampaigns = res.data.drip_campaigns;

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
      this.httpService.post("drip-campaigns/activateDripCampaign", postData).subscribe((res) => {
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
      this.httpService.post("drip-campaigns/getProspects", postData).subscribe((res) => {
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
      this.httpService.post("drip-campaigns/insights", postData).subscribe((res) => {
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

  updateSettings = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/updateSettings", postData).subscribe((res) => {
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

  enrollmentTriggers = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/enrollmentTriggers", postData).subscribe((res) => {
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

  removeListFromCampaign = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("drip-campaigns/removeListFromCampaign", postData).subscribe((res) => {
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
