import { Injectable } from '@angular/core';
import { HttpService } from "./http.service";
import { BehaviorSubject } from "rxjs";
import { routeConstants } from "../helpers/routeConstants";

@Injectable({
  providedIn: 'root'
})
export class NewFeaturePageAccessService {
  public reportsPage = new BehaviorSubject(false);
  public reportsPageObj = this.reportsPage.asObservable();

  public menuPerformancePage = new BehaviorSubject(false);
  public menuPerformancePageObj = this.menuPerformancePage.asObservable();

  public businessOperationPage = new BehaviorSubject(false);
  public businessOperationPageObj = this.businessOperationPage.asObservable();

  public purchaseOrderPage = new BehaviorSubject(false);
  public purchaseOrderPageObj = this.purchaseOrderPage.asObservable();

  public dripCampaignPage = new BehaviorSubject(false);
  public dripCampaignPageObj = this.dripCampaignPage.asObservable();

  public promotionPage = new BehaviorSubject(false);
  public promotionPageObj = this.promotionPage.asObservable();

  public apiCalled;

  constructor(private httpService: HttpService) {}

  public async setPageAccessDataForUser(from) {
    if (from === routeConstants.BRAND.CREATE_DRIP_CAMPAIGN) {
      this.dripCampaignPage.next(true);
    }
    if (from === routeConstants.BRAND.LANDING_PAGES) {
      this.promotionPage.next(true);
    }
    const postData = {
      reports: this.reportsPage.getValue(),
      menuPerformance: this.menuPerformancePage.getValue(),
      purchaseOrders: this.purchaseOrderPage.getValue(),
      businessOperations: this.businessOperationPage.getValue() ? 1 : 0,
      dripCampaign: this.dripCampaignPage.getValue(),
      promotions: this.promotionPage.getValue(),
    };

    return new Promise((resolve, reject) => {
      this.httpService.post("users/setNewFeaturePageAccessData", postData).subscribe({
        next: (response) => {
          let data = response.data;
          this.reportsPage.next(data.reports);
          this.menuPerformancePage.next(data.menuPerformance);
          this.businessOperationPage.next(data.businessOperations);
          this.purchaseOrderPage.next(data.purchaseOrders);
          this.dripCampaignPage.next(data.dripCampaign);
          this.promotionPage.next(data.promotions);
          this.apiCalled = true;
          resolve(true);
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }

  public async getPageAccessDataForUser(user_id) {
    if (!this.apiCalled) {
      return new Promise((resolve, reject) => {
        this.httpService.get("users/getNewFeaturePageAccessData").subscribe({
          next: async (response) => {
            let data = response.data;
            if (!data) {
              await this.setPageAccessDataForUser(null);
              resolve(true);
              return;
            }
            this.reportsPage.next(data.reports);
            this.menuPerformancePage.next(data.menuPerformance);
            this.businessOperationPage.next(data.businessOperations);
            this.purchaseOrderPage.next(data.purchaseOrders);
            this.dripCampaignPage.next(data.dripCampaign);
            this.promotionPage.next(data.promotions);

            this.apiCalled = true;

            resolve(true);
          },
          error: (err) => {
            reject(err);
          }
        });
      });
    }
    return null;
  }

  public setPromotionPageData = (value) => {
    this.promotionPage.next(value);
  }

  public setDripCampaignPageData = (value) => {
    this.dripCampaignPage.next(value);
  }

  // public setBusinessOperationPageData = (value) => {
  //   this.businessOperationPage.next(value);
  // }
}
