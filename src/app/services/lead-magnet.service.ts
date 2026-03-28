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
export class LeadMagnetService {
  private _leadMagnets = new BehaviorSubject({leadMagnets: [], total: Number});
  leadMagnets = this._leadMagnets.asObservable();

  public lmCurrentPage = 1;
  public lmLimit = 100;

  selectedLeadMagnet;

  constructor(
    private httpService: HttpService,
  ) {}

  getAll = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `lead-magnets?page=${postData.page}&limit=${postData.limit}&companyId=${postData.companyId}`;
      this.httpService.get(url).subscribe({
        next: (res) => {
          let leadData = res.data;
          console.log(leadData);
          leadData.leadMagnets.forEach((item) => {
            item.isOpened = false;
            item.isEditClicked = false;
          });
          resolve(leadData);
          this._leadMagnets.next(leadData);
        },
        error: (err) => {
          if (err.error) {
            reject(err.error);
          }
        },
      });
    });
  };

  delete = async (postData) => {
    return new Promise(async (resolve, reject) => {
      const url = `lead-magnets`;
      this.httpService.delete(url, postData).subscribe({
        next: (res) => {
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



}
