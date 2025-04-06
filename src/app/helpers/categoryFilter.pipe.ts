
import { Pipe, PipeTransform } from "@angular/core";
@Pipe({ name: 'categoryActiveFilter', pure: false })

export class categoryActiveFilterPipe implements PipeTransform {
    transform(items: any[], filter: any): any {
        if (!items || !filter) {
            return items;
        }
        return items.filter(item => item.status === filter);
    }
}