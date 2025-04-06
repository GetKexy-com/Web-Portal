
import { Pipe, PipeTransform } from "@angular/core";
@Pipe({ name: 'metricActiveFilter', pure: false })

export class metricActiveFilterPipe implements PipeTransform {
    transform(items: any[], filter: any): any {
        if (!items || !filter) {
            return items;
        }

        if( filter == 'active' ){
            return items.filter(item => (item.status === filter || item.status == undefined) );    
        }
        return items.filter(item => item.status === filter );
    }
}