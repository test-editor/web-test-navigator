import { Injectable } from '@angular/core';
import { IndexService, IndexDelta } from './modules/index-service/index.service';

@Injectable()
export class IndexServiceMock extends IndexService {

  protected serviceUrl: string;
  refresh(): Promise<IndexDelta[]> {
    return Promise.resolve([
      { path: 'src/main/java/package/Test.java' }
    ]);
  }

  reload(): Promise<any> {
    // do nothing
    return Promise.resolve(null);
  }
}
