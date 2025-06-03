import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class PreviewService {
  private _showPreview = new BehaviorSubject(false);
  // showPreview = this._showPreview.asObservable();

  constructor() {}

  changePreviewShowStatus(value) {
    this._showPreview.next(value);
  }
}
