import { Component, Input, OnInit } from "@angular/core";
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-kexy-toastify',
  imports: [CommonModule],
  templateUrl: './kexy-toastify.component.html',
  styleUrl: './kexy-toastify.component.scss'
})
export class KexyToastifyComponent {

  @Input() duration = 4000;
  @Input() message = '';
  @Input() onHide;
  isBounce = false;
  isAnimateBack = false;
  progressAnimate = false;

  ngOnInit(): void {
    this.isBounce = true;
    this.isAnimateBack = false;
    setTimeout(() => {
      this.progressAnimate = true;
    }, 100);

    setTimeout(() => {
      this.isAnimateBack = true;
    }, this.duration + 300);
    setTimeout(() => {
      this.progressAnimate = false;
      this.onHide();
    }, this.duration + 800);
  }

  progressBarCss = () => {
    const durMin = this.duration / 1000;
    return {
      '-webkit-transition' : `width ${durMin}s ease-in-out`,
      '-moz-transition' : `width ${durMin}s ease-in-out`,
      '-o-transition' : `width ${durMin}s ease-in-out`,
      transition: `width ${durMin}s ease-in-out`,
    };
  }
}
