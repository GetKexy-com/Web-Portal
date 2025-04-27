import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {PageUiService} from './page-ui.service';

@Injectable({ providedIn: "root" })
export class HttpService {
  public apiUrl = `${environment.baseUrl}`;

  constructor(private _http: HttpClient, private pageUiService: PageUiService) {
    this.pageUiService.apiBaseUrl.subscribe(baseUrl => {
      this.apiUrl = baseUrl;
    })
  }

  get(url: string, baseUrl = this.apiUrl, params?: any): Observable<any> {
    const urlStr = baseUrl + url;
    let headers = this._getHeaders();
    return this._http
      .get(urlStr, { headers, params })
      .pipe(map((response) => response));
  }

  post(url: string, body, baseUrl = this.apiUrl): Observable<any> {
    const urlStr = baseUrl + url;
    let headers = this._getHeaders();
    return this._http
      .post(urlStr, body, { headers: headers })
      .pipe(map((response) =>  {
        if(response['error'] && response['code'] && response['trace']) {
          response['success'] = false;
          response['error']['message'] = "Something went wrong. Please contact us.";
        }
        return response
      }));
  }

  put(url: string, body): Observable<any> {
    const urlStr = this.apiUrl + url;
    let headers = this._getHeaders();
    return this._http
      .put(urlStr, body, { headers: headers })
      .pipe(map((response) => response));
  }

  patch(url: string, body): Observable<any> {
    const urlStr = this.apiUrl + url;
    let headers = this._getHeaders();
    return this._http
      .patch(urlStr, body, { headers: headers })
      .pipe(map((response) => response));
  }

  delete(url: string): Observable<any> {
    const urlStr = this.apiUrl + url;
    return this._http.delete(urlStr).pipe(map((response) => response));
  }

  _getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      accept: 'application/json',
    });
  }
}
