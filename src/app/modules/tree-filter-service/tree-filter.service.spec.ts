import { TestBed, inject } from '@angular/core/testing';

import { TreeFilterService } from './tree-filter.service';
import { PersistenceService } from '../persistence-service/persistence.service';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { PersistenceServiceConfig } from '../persistence-service/persistence.service.config';
import { MessagingModule } from '@testeditor/messaging-service';

describe('TreeFilterService', () => {
  const persistenceServiceConfig: PersistenceServiceConfig = { persistenceServiceUrl: 'http://example.org' };
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ MessagingModule.forRoot() ],
      providers: [ TreeFilterService, HttpProviderService, PersistenceService,
        { provide: PersistenceServiceConfig, useValue: persistenceServiceConfig } ]
    });
  });

  it('should be created', inject([TreeFilterService], (service: TreeFilterService) => {
    expect(service).toBeTruthy();
  }));
});
