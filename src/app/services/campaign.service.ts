import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { constants } from '../helpers/constants';
import { HttpService } from './http.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { LandingPage, LandingPageStep, LandingPageType } from '../models/LandingPage';

@Injectable({
  providedIn: 'root',
})
export class CampaignService {
  private campaignTypes = [
    {
      key: constants.LISTING_OF_PRODUCT,
      value: constants.LIST_PRODUCT_ON_PLATFORM,
      isSelected: false,
    },
    {
      key: constants.FEATURED_PRODUCT,
      value: constants.PRODUCT_OFFERING_NO_PRICE_LISTED,
      isSelected: false,
    },
    {
      key: constants.DEAL_WITH_PRICE,
      value: constants.DEAL_LIST_PRICE,
      isSelected: false,
    },
    {
      key: constants.ANNOUNCEMENT_KEY,
      value: constants.ANNOUNCEMENT_VALUE,
      isSelected: false,
    },
  ];

  private _selectedCampaign = new BehaviorSubject(LandingPageType.PRODUCT_LISTING);
  selectedCampaign = this._selectedCampaign.asObservable();

  private _campaignTitles = new BehaviorSubject([]);
  campaignTitles = this._campaignTitles.asObservable();

  private _campaignInnerDetails = new BehaviorSubject([]);
  campaignInnerDetails = this._campaignInnerDetails.asObservable();

  private _loading = new BehaviorSubject(false);
  loading = this._loading.asObservable();

  private _units = new BehaviorSubject([]);
  units = this._units.asObservable();

  private _campaignVideoUrls = new BehaviorSubject([]);
  campaignVideoUrls = this._campaignVideoUrls.asObservable();

  public editVideoUrlItem;
  public editCampaignTitleItem;
  public editCampaignDetailItem;
  public isDuplicateCampaign;

  private searchFilters = {};
  private selectedSearchType = '';
  private selectedCountry = '';
  private selectedSavedSearch = '';
  private searchEstablishmentPageData = {};
  private campaignDetailsPageData: LandingPage = LandingPage.empty();
  private contactInfoPageData = {};
  private previewPageData = {};
  private landingPage: LandingPage;
  private dripCampaignId: any;

  constructor(private httpService: HttpService, private route: ActivatedRoute) {
  }

  public changeLandingPageType(value) {
    this._selectedCampaign.next(value);
  }

  public getCampaignTypes = () => {
    return this.campaignTypes;
  };

  public setDuplicateCampaignPropertyValue = (value) => {
    this.isDuplicateCampaign = value;
  };

  public setSearchEstablishmentPageData = (data) => {
    this.searchEstablishmentPageData = data;
  };

  public getSearchEstablishmentPageData = () => {
    return this.searchEstablishmentPageData;
  };
  public setDripCampaignId = (data) => {
    this.dripCampaignId = data;
  };
  public getDripCampaignId = () => {
    return this.dripCampaignId;
  };
  public setSelectedSearchType = (data) => {
    this.selectedSearchType = data;
  };
  public getSelectedSearchType = () => {
    return this.selectedSearchType;
  };
  public setSelectedCountry = (data) => {
    this.selectedCountry = data;
  };
  public getSelectedCountry = () => {
    return this.selectedCountry;
  };
  public setSelectedSavedSearch = (data) => {
    this.selectedSavedSearch = data;
  };
  public getSelectedSavedSearch = () => {
    return this.selectedSavedSearch;
  };
  public setSearchFilters = (data, additionalSearchData = {}) => {
    if (Object.keys(additionalSearchData).length) {
      data['selectedCountry'] = additionalSearchData['selectedCountry'];
      data['selectedRestaurantSearchType'] = additionalSearchData['selectedRestaurantSearchType'];
      data['selectedTargettedPeople'] = additionalSearchData['selectedTargettedPeople'];
      data['companies'] = additionalSearchData['companies'];
      data['excludedCompanies'] = additionalSearchData['excludedCompanies'];
      data['pastCompanies'] = additionalSearchData['pastCompanies'];
    }
    this.searchFilters = data;
    localStorage.setItem(constants.SALES_LEAD_SEARCH_PAYLOAD, JSON.stringify(data));
  };

  public getSearchFilters = () => {
    const supplierId = localStorage.getItem('supplierId');
    if (this.searchFilters) {
      this.searchFilters['supplier_id'] = supplierId;
      return this.searchFilters;
    } else {
      const payload = localStorage.getItem(constants.SALES_LEAD_SEARCH_PAYLOAD);
      payload['supplier_id'] = supplierId;
      return payload;
    }
  };

  public getLandingPageData = (): LandingPage => {
    return this.campaignDetailsPageData;
  };

  public setCampaignDetailsPageData = (data) => {
    this.campaignDetailsPageData = data;
  };

  public getContactInfoPageData = () => {
    return this.contactInfoPageData;
  };

  public setContactInfoPageData = (editContactPayload, questionPayload) => {
    this.contactInfoPageData = {
      contactData: editContactPayload,
      questionData: questionPayload,
    };
  };

  public setLandingPage = (landingPage: LandingPage) => {
    this.landingPage = landingPage;
  };

  public getLandingPage = (): LandingPage => {
    return this.landingPage;
  };

  public makeDataStructureAndSetSearchEstablishmentpageData = (campaign) => {
    const establishmentSearchValue = JSON.parse(campaign.establishment_search_value);
    const data = {
      selectedRestaurantSearchType: campaign.establishment_search_type,
      zipcodeOrCityOrStateList: establishmentSearchValue.person_locations,
      numberOfEstablishment: establishmentSearchValue.number_of_establishment,
      selectedJobList: establishmentSearchValue.job_titles,
      organizationIndustryTagIds: establishmentSearchValue.organizationIndustryTagIds,
      personSeniorities: establishmentSearchValue.personSeniorities,
      selectedTargettedPeople: establishmentSearchValue.selectedTargettedPeople,
      selectedCountry: establishmentSearchValue.selectedCountry,
      creditNumber: establishmentSearchValue.creditNumber,
    };
    this.setSearchEstablishmentPageData(data);
  };

  public setLandingPageData = (landingPage: LandingPage) => {
    this.setCampaignDetailsPageData(landingPage);
  };

  public makeDataStructureAndSetContactInfopageData = (campaign) => {
    const contactInfoData = campaign.contactInfo;
    const questionData = campaign?.campaign_questions;

    const editContactPayload = {
      transactionHandleBy: contactInfoData.transactionHandleBy,
      transactionHandleUrl: contactInfoData.transactionHandleUrl,
      questionReferredData: contactInfoData.questionReferredData,
      distributorRep: contactInfoData.distributorRep,
      questionForBuyer: contactInfoData.questionForBuyer,
    };

    const questionPayload = {
      question_list: contactInfoData.questionForBuyer ? questionData : [],
    };

    this.setContactInfoPageData(editContactPayload, questionPayload);
  };

  public campaignCreateApi = async (payload) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      // Image save
      if (payload.image.startsWith('data:image')) {
        let imgApiResponse = await this.httpService
          .patch('landing-pages/save-image', { imageData: payload.image })
          .toPromise();
        if (!imgApiResponse.success) {
          this._loading.next(false);
          reject(imgApiResponse.error);
        }
        payload.image = imgApiResponse.data.name;
      }

      //TODO - Sales sheet save
      if (payload.salesSheet) {
        if (payload.salesSheet.startsWith('data:application/pdf') || payload.salesSheet.startsWith('data:image')) {
          let saleSheetResponse = await this.httpService
            .post('landing-pages/save-sell-sheet', {
              data: payload.salesSheet,
            })
            .toPromise();
          if (!saleSheetResponse.success) {
            this._loading.next(false);
            reject(saleSheetResponse.error);
          }
          payload.salesSheet = saleSheetResponse.data;
        }
      }

      if (payload.landingPageId) {
        const url = `landing-pages/${payload.landingPageId}`;
        delete payload.landingPageId;
        this.httpService.patch(url, payload).subscribe((res) => {
          if (!res.success) {
            if (res.error) {
              this._loading.next(false);
              reject(res.error);
            }
          } else {
            // Set campaignDetails page data
            this.campaignDetailsPageData = payload;
            this._loading.next(false);
            resolve(res.data.id);
          }
        });
      } else {
        this.httpService.post('landing-pages', payload).subscribe((res) => {
          if (!res.success) {
            if (res.error) {
              this._loading.next(false);
              reject(res.error);
            }
          } else {
            // Set campaignDetails page data
            this.campaignDetailsPageData = payload;
            this._loading.next(false);
            resolve(res.data.id);
          }
        });
      }


    });
  };

  public editContactInfo = async (editContactPayload, questionPayload = {}) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      const url = `landing-pages/${editContactPayload.landingPageId}/contact-info`;
      delete editContactPayload.landingPageId;
      this.httpService.patch(url, editContactPayload).subscribe(async (res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          // Call question api if user select yes
          let questions = [];
          // if (editContactPayload.has_question_for_buyer) {
          //   questionPayload['campaign_id'] = editContactPayload.landingPageId;
          //
          //   let questionApiRes = await this.httpService.post('campaigns/addQuestions', questionPayload).toPromise();
          //   if (!questionApiRes.success) {
          //     if (questionApiRes.error) {
          //       this._loading.next(false);
          //       reject(questionApiRes.error);
          //     }
          //   } else {
          //     questions = questionApiRes?.data;
          //   }
          // }
          this._loading.next(false);
          resolve(true);
        }
      });
    });
  };

  public campaignActivate = async (payload) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      this.httpService.post('campaigns/activate', payload).subscribe((res) => {
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

  getCampaign = async (postData): Promise<LandingPage> => {
    this._loading.next(true);
    const url = `landing-pages/${postData.campaign_id}`;
    return new Promise(async (resolve, reject) => {
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          if (res.data) {
            // Set page data
            const landingPage = new LandingPage(res.data);
            this.setLandingPageData(landingPage);
            this._loading.next(false);
            resolve(landingPage);
          } else {
            this._loading.next(false);
            reject(false);
          }
        }
      });
    });

  };

  private __makeHttpToGetLandingPage(url: string) {
    return new Promise(async (resolve, reject) => {
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          if (res.data) {
            // Set page data
            const landingPage: LandingPage = new LandingPage(res.data);
            this.setLandingPageData(landingPage);
            this._loading.next(false);
            resolve(landingPage);
          } else {
            this._loading.next(false);
            reject(false);
          }
        }
      });
    });
  }

  getCampaignWithToken = async (postData): Promise<LandingPage> => {
    this._loading.next(true);
    const url = `landing-pages/public?id=${postData.id}`;
    return new Promise(async (resolve, reject) => {
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          if (res.data) {
            // Set page data
            const landingPage = new LandingPage(res.data);
            this.setLandingPageData(landingPage);
            this._loading.next(false);
            resolve(landingPage);
          } else {
            this._loading.next(false);
            reject(false);
          }
        }
      });
    });
  };

  addCampaignTitle = async (postData) => {
    let campaignTitles = [...this._campaignTitles.getValue()];
    return new Promise(async (resolve, reject) => {
      this.httpService.post('titles', postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let item = { ...res.data };
          campaignTitles.push(item);
          resolve(true);
          this._campaignTitles.next(campaignTitles);
        }
      });
    });
  };

  editCampaignTitle = async (postData) => {
    let campaignTitles = [...this._campaignTitles.getValue()];
    return new Promise(async (resolve, reject) => {
      const titleId = postData.id;
      const url = `titles/${titleId}`;
      delete postData.id;
      this.httpService.patch(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let editedItemIndex = campaignTitles.findIndex(i => i.id === titleId);
          campaignTitles[editedItemIndex].title = postData.title;
          resolve(true);
          this._campaignTitles.next(campaignTitles);
        }
      });
    });
  };

  deleteCampaignTitle = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `titles/${postData.id}`;
      this.httpService.delete(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // remove deleted item from service
          let titleId = postData.id;
          let campaignTitles = [...this._campaignTitles.getValue()];
          let index = campaignTitles.findIndex(i => i.id === titleId);
          campaignTitles.splice(index, 1);

          resolve(true);
          this._campaignTitles.next(campaignTitles);
        }
      });
    });
  };

  getAllCampaignTitle = async () => {
    return new Promise(async (resolve, reject) => {
      this.httpService.get('titles').subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let campaignTitles = res.data.filter(t => {
            return t.status === constants.ACTIVE && t.titleType === 'landing';
          });
          resolve(campaignTitles);
          this._campaignTitles.next(campaignTitles);
        }
      });
    });
  };

  setEditCampaignTitleItem = (data) => {
    this.editCampaignTitleItem = data;
  };

  getEditCampaignTitleItem = () => {
    return this.editCampaignTitleItem;
  };

  addCampaignInnerDetails = async (postData) => {
    let campaignInnerDetails = [...this._campaignInnerDetails.getValue()];
    return new Promise(async (resolve, reject) => {
      const url = `inner-details`;
      this.httpService.post(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let item = { ...res.data };
          campaignInnerDetails.push(item);
          resolve(true);
          this._campaignInnerDetails.next(campaignInnerDetails);
        }
      });
    });
  };

  editCampaignInnerDetails = async (postData) => {
    let campaignInnerDetails = [...this._campaignInnerDetails.getValue()];
    return new Promise(async (resolve, reject) => {
      const id = postData.id;
      const url = `inner-details/${id}`;
      delete postData.id;
      this.httpService.patch(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let editedItemIndex = campaignInnerDetails.findIndex(i => i.id === id);
          campaignInnerDetails[editedItemIndex].innerDetail = postData.innerDetail;
          resolve(true);
          this._campaignInnerDetails.next(campaignInnerDetails);
        }
      });
    });
  };

  deleteCampaignInnerDetail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `inner-details/${postData.id}`;
      this.httpService.delete(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // remove deleted item from service
          let innerDetailId = postData.id;
          let campaignInnerDetails = [...this._campaignInnerDetails.getValue()];
          let index = campaignInnerDetails.findIndex(i => i.id === innerDetailId);
          campaignInnerDetails.splice(index, 1);

          resolve(true);
          this._campaignInnerDetails.next(campaignInnerDetails);
        }
      });
    });
  };

  getAllCampaignInnerDetail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.get('inner-details').subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let campaignInnerDetails = res.data;
          resolve(campaignInnerDetails);
          this._campaignInnerDetails.next(campaignInnerDetails);
        }
      });
    });
  };

  setEditCampaignDetailItem = (data) => {
    this.editCampaignDetailItem = data;
  };

  getEditCampaignDetailItem = () => {
    return this.editCampaignDetailItem;
  };

  addUnit = async (postData) => {
    let unitList = [...this._units.getValue()];
    return new Promise(async (resolve, reject) => {
      this.httpService.post('campaigns/addUnit', postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let item = { ...res.data };
          unitList.push(item);
          resolve(true);
          this._units.next(unitList);
        }
      });
    });
  };

  addCampaignVideoUrl = async (postData) => {
    let campaignVideoUrls = [...this._campaignVideoUrls.getValue()];
    return new Promise(async (resolve, reject) => {
      this.httpService.post('video-urls', postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let item = { ...res.data };
          campaignVideoUrls.push(item);
          resolve(true);
          this._campaignVideoUrls.next(campaignVideoUrls);
        }
      });
    });
  };

  editCampaignVideoUrl = async (postData) => {
    let campaignVideoUrls = [...this._campaignVideoUrls.getValue()];
    return new Promise(async (resolve, reject) => {
      const videoId = postData.id;
      delete postData.id;
      const url = `video-urls/${videoId}`;
      this.httpService.patch(url, postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let editedItemIndex = campaignVideoUrls.findIndex(i => i.id === videoId);
          campaignVideoUrls[editedItemIndex].videoUrl = postData.videoUrl;
          resolve(true);
          this._campaignVideoUrls.next(campaignVideoUrls);
        }
      });
    });
  };

  deleteCampaignVideoUrl = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `video-urls/${postData.id}`;
      this.httpService.delete(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // remove deleted item from service
          let videoUrlId = postData.id;
          let campaignVideoUrls = [...this._campaignVideoUrls.getValue()];
          let index = campaignVideoUrls.findIndex(i => i.id === videoUrlId);
          campaignVideoUrls.splice(index, 1);

          resolve(true);
          this._campaignVideoUrls.next(campaignVideoUrls);
        }
      });
    });
  };

  getAllCampaignVideoUrl = async () => {
    return new Promise(async (resolve, reject) => {
      const url = `video-urls`;
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let campaignVideoUrls = res.data;
          resolve(campaignVideoUrls);
          this._campaignVideoUrls.next(campaignVideoUrls);
        }
      });
    });
  };

  setEditVideoUrlItem = (data) => {
    this.editVideoUrlItem = data;
  };

  getEditVideoUrlItem = () => {
    return this.editVideoUrlItem;
  };

  resetCampaignDataToDefault = () => {
    this.searchEstablishmentPageData = {};
    this.campaignDetailsPageData = LandingPage.empty();
    this.contactInfoPageData = {};
  };

  getListOfCampaigns = async (postData) => {
    let tempDealList = [];

    return new Promise(async (resolve, reject) => {
      const url = `landing-pages?page=${postData.page}&limit=${postData.limit}`;
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {

          let totalPageCounts = Math.ceil(res.data.total / postData.limit);

          res.data.landingPages.forEach((campaign) => {
            const details = campaign.detail;
            let dealSingletem = {
              id: campaign.id,
              campaign_title_text: details.title.title,
              campaign_details_text: details.innerDetail?.innerDetail,
              product_name: details.prospectingProduct.name,
              deal_image: environment.imageUrl + details.image,
              deal_price: details.price,
              type_of_campaign: details.landingPageType,
              status: campaign.status,
              analytics: {
                impressions: '0',
                clicks: '0',
                ctr: '0%',
              },
              token: campaign.token,
              action: '',
              campaign,
            };

            tempDealList.push(dealSingletem);
          });

          tempDealList.sort(function(a, b) {
            const a1 = a.id,
              b1 = b.id;
            if (a1 == b1) return 0;
            return a1 < b1 ? 1 : -1;
          });

          resolve({ promotions: tempDealList, totalPageCounts, totalRecords: res.data.total });
        }
      });
    });
  };

  getCampaignTitleById = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('campaigns/getTitleById', postData).subscribe((res) => {
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

  getCampaignInnerDetailById = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('campaigns/getInnerDetailById', postData).subscribe((res) => {
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

  getCampaigns = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post('campaigns/getAll', postData).subscribe((res) => {
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

  deleteCampaigns = async (postData) => {
    return new Promise(async (resolve, reject) => {
      console.log(postData);
      this.httpService.delete('landing-pages', postData).subscribe((res) => {
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
