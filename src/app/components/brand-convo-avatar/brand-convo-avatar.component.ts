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

  /** Resolved `av-0`..`av-5` gradient class, or '' when no seed was given. */
  avatarClass = '';

  /**
   * Optional: derive a stable per-person colour instead of passing an explicit
   * `color`. Same 6-gradient scheme and char-code hash as the Manage Contacts
   * table (`contact-list-card.getAvatarClass`), so ONE person is the same colour
   * everywhere in the app. Pass the person's name (falling back to their email).
   *
   * Computed in the setter, not a getter, so it doesn't re-run on every change
   * detection pass for every row in a long list.
   */
  @Input() set seed(value: string) {
    this.avatarClass = BrandConvoAvatarComponent.classFor(value);
  }

  static classFor(value: string): string {
    const s = (value ?? '').toString();
    if (!s) return '';
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % 6;
    return 'av-' + h;
  }
}
