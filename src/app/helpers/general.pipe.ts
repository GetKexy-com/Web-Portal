import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

@Pipe({ name: 'imageurl', pure: false })
export class ImageUrlPipe implements PipeTransform {
  transform(path: string): string {
    return `${environment.imageUrl}${path}`;
  }
}
