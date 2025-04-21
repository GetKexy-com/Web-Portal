import { Injectable } from '@angular/core';
import { HttpService } from "./http.service";
import { environment } from "../../environments/environment";
import { constants } from "../helpers/constants";
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

  public async setPageAccessDataForUser(user_id, from) {
    if (from === routeConstants.BRAND.CREATE_DRIP_CAMPAIGN) {
      // this.dripCampaignPage.next(true);
      this.businessOperationPage.next(true);
    }
    if (from === routeConstants.BRAND.PROMOTIONS) {
      this.promotionPage.next(true);
    }
    const postData = {
      user_id,
      reports: this.reportsPage.getValue(),
      menu_performance: this.menuPerformancePage.getValue(),
      purchase_orders: this.purchaseOrderPage.getValue(),
      business_operations: this.businessOperationPage.getValue(),
      drip_campaign: this.dripCampaignPage.getValue(),
      promotions: this.promotionPage.getValue(),
    };

    return new Promise( (resolve, reject) => {
      this.httpService.post("user/setNewFeaturePageAccessData", postData).subscribe((response) => {
        let data = response.data;
        this.reportsPage.next(data.reports);
        this.menuPerformancePage.next(data.menu_performance);
        this.businessOperationPage.next(data.business_operations);
        this.purchaseOrderPage.next(data.purchase_orders);
        this.dripCampaignPage.next(data.drip_campaign);
        this.promotionPage.next(data.promotions);
        this.apiCalled = true;
        resolve(true);
      });
    });
  }

  public async getPageAccessDataForUser(user_id) {
    if (!this.apiCalled) {
      return new Promise( (resolve, reject) => {
        let payload = { user_id };
        this.httpService.post("user/getNewFeaturePageAccessData", payload).subscribe(async (response) => {
          let data = response.data;
          if (!data) {
            await this.setPageAccessDataForUser(user_id, null);
            resolve(true);
            return;
          }

          this.reportsPage.next(data.reports);
          this.menuPerformancePage.next(data.menu_performance);
          this.businessOperationPage.next(data.business_operations);
          this.purchaseOrderPage.next(data.purchase_orders);
          this.dripCampaignPage.next(data.drip_campaign);
          this.promotionPage.next(data.promotions);

          this.apiCalled = true;

          resolve(true);
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

  public setBusinessOperationPageData = (value) => {
    this.businessOperationPage.next(value);
  }
}
