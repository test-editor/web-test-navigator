import { IndexServiceConfig } from './index.service.config';
import { Injectable } from '@angular/core';

@Injectable()
export abstract class IndexService {
  protected serviceUrl: string;
  constructor(config: IndexServiceConfig) {
    this.serviceUrl = config.indexServiceUrl;
  }
  abstract refresh(): Promise<IndexDelta[]>;
  abstract reload(): Promise<any>;
}

export interface IndexDelta {
  path: string;
}
