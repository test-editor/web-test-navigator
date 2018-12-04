import { Injectable } from '@angular/core';
import { HttpProviderService } from '@testeditor/testeditor-commons';
import { IndexDelta, IndexService } from './index.service';
import { IndexServiceConfig } from './index.service.config';

@Injectable()
export class XtextIndexService extends IndexService {

  constructor(private httpProvider: HttpProviderService, config: IndexServiceConfig) {
    super(config);
  }

  /*
   * load potential deltas into the index
   */
  async refresh(): Promise<IndexDelta[]> {
    try {
      const http = await this.httpProvider.getHttpClient();
      return  await http.post<IndexDelta[]>(this.serviceUrl + '/refresh', null).toPromise();
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  /*
   * reload does no delta processing but rebuilds the index 'from scratch'.
   * this operation is costly since it triggers a gradle rebuild of the project.
   * it is useful for cases where the delta processing did not catch 'all' deltas.
   */
  async reload(): Promise<any> {
    try {
      const http = await this.httpProvider.getHttpClient();
      await http.post(this.serviceUrl + '/reload', null);
    } catch (error) {
      console.log(error);
    }
  }
}
