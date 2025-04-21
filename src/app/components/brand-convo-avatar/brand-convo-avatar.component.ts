import { Component, Input } from "@angular/core";
import {NgClass} from '@angular/common';

@Component({
  selector: 'brand-convo-avatar',
  imports: [
    NgClass
  ],
  templateUrl: './brand-convo-avatar.component.html',
  styleUrl: './brand-convo-avatar.component.scss'
})
export class BrandConvoAvatarComponent {
  @Input() text: string;
  @Input() color: string;
  @Input() size: string = "";
}
