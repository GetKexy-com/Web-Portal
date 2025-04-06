import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user';
import { environment } from '../../../environments/environment';
import { constants } from '../../helpers/constants';
import { BehaviorSubject, Observable } from 'rxjs';

@Component({
  selector: 'login-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-layout.component.html',
  styleUrls: ['./login-layout.component.scss'],
})
export class LoginLayoutComponent implements OnInit {
  @Input() isContentCentered = true;
  @Input() bgColor = 'white';
  @Input() layoutPaddingNone: any;

  userData!: User;
  currentUrl = '';
  externalAssets = '';

  // private userTokenSubject = new BehaviorSubject<User>(
  //   JSON.parse(localStorage.getItem('userToken') as string)
  // );
  // public userToken: Observable<User> = this.userTokenSubject.asObservable();

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.currentUrl = this.router.url;
    this.userData = this.authService.userTokenValue;

    if (!this.userData) return;

    this.externalAssets =
      environment.externalAssetUrl + constants.SAMPLE_INVENTORY_SHEET;

    this.authService.userToken.subscribe((msg) => {
      console.log('LoginLayout:UserTokenSubscription', msg);
    });
  }
}
