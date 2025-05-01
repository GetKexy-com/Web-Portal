import { Injectable } from '@angular/core';
import { BehaviorSubject } from "rxjs";
import { constants } from "../helpers/constants";
import { HttpService } from "./http.service";
import { ActivatedRoute } from "@angular/router";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: 'root'
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

  private _selectedCampaign = new BehaviorSubject(constants.LISTING_OF_PRODUCT);
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
  private selectedSearchType = "";
  private selectedCountry = "";
  private selectedSavedSearch = "";
  private searchEstablishmentPageData = {};
  private campaignDetailsPageData = {};
  private contactInfoPageData = {};
  private previewPageData = {};
  private dripCampaignId: any;

  constructor(private httpService: HttpService, private route: ActivatedRoute) {
  }

  public changeCampaignType(value) {
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
      data["selectedCountry"] = additionalSearchData["selectedCountry"];
      data["selectedRestaurantSearchType"] = additionalSearchData["selectedRestaurantSearchType"];
      data["selectedTargettedPeople"] = additionalSearchData["selectedTargettedPeople"];
      data["companies"] = additionalSearchData["companies"];
      data["excludedCompanies"] = additionalSearchData["excludedCompanies"];
      data["pastCompanies"] = additionalSearchData["pastCompanies"];
    }
    this.searchFilters = data;
    localStorage.setItem(constants.SALES_LEAD_SEARCH_PAYLOAD, JSON.stringify(data));
  };

  public getSearchFilters = () => {
    const supplierId = localStorage.getItem("supplierId");
    if (this.searchFilters) {
      this.searchFilters["supplier_id"] = supplierId;
      return this.searchFilters;
    } else {
      const payload = localStorage.getItem(constants.SALES_LEAD_SEARCH_PAYLOAD);
      payload["supplier_id"] = supplierId;
      return payload;
    }
  };

  public getCampaignDetailsPageData = () => {
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

  public setPreviewPageData = (data) => {
    this.previewPageData = data;
  };

  public getPreviewPageData = () => {
    return this.previewPageData;
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

  public makeDataStructureAndSetCampaignDetailspageData = (campaign) => {
    const campaignDetailsData = campaign.detail;
    const payload = {
      campaign_type: campaignDetailsData.landingPageType,
      campaign_title: campaignDetailsData.title,
      campaign_details: campaignDetailsData.innerDetail,
      prospecting_product_id: campaignDetailsData.prospecting_product_id,
      product_knowledge: campaignDetailsData.productKnowledge,
      campaign_image: campaignDetailsData.image,
      campaign_video: campaignDetailsData.video,
      category_id: 1,
      estimated_savings: campaignDetailsData.estimatedSavings,
      price: campaignDetailsData.price,
      start_date: "",
      end_date: "",
      size: campaignDetailsData.size,
      amount: campaignDetailsData.amount,
      additional_info: campaignDetailsData.additionalInfo,
      sales_sheet: campaignDetailsData.salesSheet,
      purchase_url: campaignDetailsData.purchaseUrl,
      visit_website: campaignDetailsData.visitWebsite,
      message_call_number: campaignDetailsData.messageCallNumber,
      custom_button_url: campaignDetailsData.customButtonUrl,
      custom_button_label: campaignDetailsData.customButtonLabel,
    };
    this.setCampaignDetailsPageData(payload);
  };

  public makeDataStructureAndSetContactInfopageData = (campaign) => {
    const contactInfoData = campaign.campaign_contact_info;
    const questionData = campaign?.campaign_questions;

    const editContactPayload = {
      transaction_handle_by: contactInfoData.transaction_handle_by,
      distributor_transaction_handle_url: contactInfoData.distributor_transaction_handle_url,
      customer_question_referred_data: contactInfoData.customer_question_referred_data,
      distributor_rep: contactInfoData.distributor_rep,
      has_question_for_buyer: contactInfoData.has_question_for_buyer,
    };

    const questionPayload = {
      question_list: contactInfoData.has_question_for_buyer ? questionData : [],
    };

    this.setContactInfoPageData(editContactPayload, questionPayload);
  };

  public campaignCreateApi = async (payload) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      // Image save
      if (payload.campaign_image.startsWith("data:image")) {
        let imgApiResponse = await this.httpService
          .post("campaigns/saveImage", { image_data: payload.campaign_image })
          .toPromise();
        if (!imgApiResponse.success) {
          this._loading.next(false);
          reject(imgApiResponse.error);
        }
        payload.campaign_image = imgApiResponse.data;
      }

      // Sales sheet save
      if (payload.sales_sheet) {
        if (payload.sales_sheet.startsWith("data:application/pdf") || payload.sales_sheet.startsWith("data:image")) {
          let saleSheetResponse = await this.httpService
            .post("campaigns/saveSalesSheet", {
              data: payload.sales_sheet,
            })
            .toPromise();
          if (!saleSheetResponse.success) {
            this._loading.next(false);
            reject(saleSheetResponse.error);
          }
          payload.sales_sheet = saleSheetResponse.data;
        }
      }

      this.httpService.post("campaigns/create", payload).subscribe((res) => {
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
    });
  };

  public editContactInfo = async (editContactPayload, questionPayload = {}) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      this.httpService.post("campaigns/editContactInfo", editContactPayload).subscribe(async (res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          // Call question api if user select yes
          let questions = [];
          if (editContactPayload.has_question_for_buyer) {
            questionPayload["campaign_id"] = editContactPayload.campaign_id;

            let questionApiRes = await this.httpService.post("campaigns/addQuestions", questionPayload).toPromise();
            if (!questionApiRes.success) {
              if (questionApiRes.error) {
                this._loading.next(false);
                reject(questionApiRes.error);
              }
            } else {
              questions = questionApiRes?.data;
            }
          }
          this._loading.next(false);
          resolve(true);
        }
      });
    });
  };

  public campaignActivate = async (payload) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      this.httpService.post("campaigns/activate", payload).subscribe((res) => {
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

  getCampaign = async (postData) => {
    this._loading.next(true);
    return new Promise(async (resolve, reject) => {
      if (postData.campaign_id === this.previewPageData["id"]) {
        resolve(this.previewPageData);
        return;
      }
      const url = `landing-pages/${postData.campaign_id}`;
      this.httpService.get(url).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            this._loading.next(false);
            reject(res.error);
          }
        } else {
          if (res.data) {
            // Set page data
            let campaign = res.data;
            console.log(campaign);
            // this.makeDataStructureAndSetSearchEstablishmentpageData(campaign);
            this.makeDataStructureAndSetCampaignDetailspageData(campaign);

            if (
              campaign &&
              (campaign["current_step"] === constants.CAMPAIGN_PREVIEW ||
                campaign["current_step"] === constants.CAMPAIGN_SUBMITTED)
            ) {
              this.makeDataStructureAndSetContactInfopageData(campaign);
              this.setPreviewPageData(campaign);
            }
            this._loading.next(false);
            resolve(res.data);
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
      this.httpService.post("campaigns/addTitle", postData).subscribe((res) => {
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
      this.httpService.post("campaigns/editTitle", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let editedItemIndex = campaignTitles.findIndex(i => i.id === postData.title_id);
          campaignTitles[editedItemIndex].title = postData.title;
          resolve(true);
          this._campaignTitles.next(campaignTitles);
        }
      });
    });
  };

  deleteCampaignTitle = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("campaigns/deleteTitle", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // remove deleted item from service
          let titleId = postData.title_id;
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
      this.httpService.get("titles").subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let campaignTitles = res.data;
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
      this.httpService.post("campaigns/addInnerDetail", postData).subscribe((res) => {
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
      this.httpService.post("campaigns/editInnerDetail", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let editedItemIndex = campaignInnerDetails.findIndex(i => i.id === postData.inner_detail_id);
          campaignInnerDetails[editedItemIndex].inner_detail = postData.inner_detail;
          resolve(true);
          this._campaignInnerDetails.next(campaignInnerDetails);
        }
      });
    });
  };

  deleteCampaignInnerDetail = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("campaigns/deleteInnerDetail", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // remove deleted item from service
          let innerDetailId = postData.inner_detail_id;
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
      this.httpService.get("inner-details").subscribe((res) => {
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
      this.httpService.post("campaigns/addUnit", postData).subscribe((res) => {
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

  // getAllUnits = async (postData) => {
  //   return new Promise(async (resolve, reject) => {
  //     this.httpService.post("campaigns/getAllUnits", postData).subscribe((res) => {
  //       if (!res.success) {
  //         if (res.error) {
  //           reject(res.error);
  //         }
  //       } else {
  //         let units = res.data;
  //         resolve(units);
  //         this._units.next(units);
  //       }
  //     });
  //   });
  // };

  addCampaignVideoUrl = async (postData) => {
    let campaignVideoUrls = [...this._campaignVideoUrls.getValue()];
    return new Promise(async (resolve, reject) => {
      this.httpService.post("campaigns/addVideoUrl", postData).subscribe((res) => {
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
      this.httpService.post("campaigns/editVideoUrl", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          let editedItemIndex = campaignVideoUrls.findIndex(i => i.id === postData.video_url_id);
          campaignVideoUrls[editedItemIndex].video_url = postData.video_url;
          resolve(true);
          this._campaignVideoUrls.next(campaignVideoUrls);
        }
      });
    });
  };

  deleteCampaignVideoUrl = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("campaigns/deleteVideoUrl", postData).subscribe((res) => {
        if (!res.success) {
          if (res.error) {
            reject(res.error);
          }
        } else {
          // remove deleted item from service
          let videoUrlId = postData.video_url_id;
          let campaignVideoUrls = [...this._campaignVideoUrls.getValue()];
          let index = campaignVideoUrls.findIndex(i => i.id === videoUrlId);
          campaignVideoUrls.splice(index, 1);

          resolve(true);
          this._campaignVideoUrls.next(campaignVideoUrls);
        }
      });
    });
  };

  getAllCampaignVideoUrl = async (postData) => {
    return new Promise(async (resolve, reject) => {
      this.httpService.post("campaigns/getAllVideoUrls", postData).subscribe((res) => {
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
    this.campaignDetailsPageData = {};
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
              action: "",
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
      this.httpService.post("campaigns/getTitleById", postData).subscribe((res) => {
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
      this.httpService.post("campaigns/getInnerDetailById", postData).subscribe((res) => {
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
      this.httpService.post("campaigns/getAll", postData).subscribe((res) => {
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
      this.httpService.post("campaigns/delete", postData).subscribe((res) => {
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
