import { TestBed, inject, fakeAsync, tick } from '@angular/core/testing';
import { IndexServiceConfig } from './index.service.config';
import { XtextIndexService } from './xtext-index.service';
import { IndexService, IndexDelta } from './index.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { MessagingService, MessagingModule } from '@testeditor/messaging-service';

describe('XtextIndexService', () => {

  let serviceConfig: IndexServiceConfig;
  let messagingService: MessagingService;
  let httpClient: HttpClient;

  beforeEach(() => {
    serviceConfig = new IndexServiceConfig();
    serviceConfig.serviceUrl = '';

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HttpClientModule, MessagingModule.forRoot()],
      providers: [
        { provide: IndexServiceConfig, useValue: serviceConfig },
        { provide: IndexService, useClass: XtextIndexService },
        HttpClient,
        HttpProviderService
      ]
    });
    messagingService = TestBed.get(MessagingService);
    httpClient = TestBed.get(HttpClient);

    const subscription = messagingService.subscribe('httpClient.needed', () => {
      subscription.unsubscribe();
      messagingService.publish('httpClient.supplied', { httpClient: httpClient });
    });
  });


  it('processes results of type index delta', fakeAsync(inject([HttpTestingController, IndexService],
    (httpMock: HttpTestingController, indexService: IndexService) => {
      // given
      const indexServiceRefreshRequest = {
        url: serviceConfig.serviceUrl + '/refresh',
        method: 'POST'
      };
      const mockResponse = [{ path: 'some/path/to/file' }];

      // when
      indexService.refresh().then((indexDelta: IndexDelta[]) => {

        // then
        expect(indexDelta.length).toEqual(1);
        expect(indexDelta[0]).toEqual({ path: 'some/path/to/file' });
      });
      tick();

      httpMock.match(indexServiceRefreshRequest)[0].flush(mockResponse);
    })));

  it('processes empty results', fakeAsync(inject([HttpTestingController, IndexService],
    (httpMock: HttpTestingController, indexService: IndexService) => {
      // given
      const indexServiceRefreshRequest = {
        url: serviceConfig.serviceUrl + '/refresh',
        method: 'POST'
      };
      const mockResponse = null;

      // when
      indexService.refresh().then((indexDelta: IndexDelta[]) => {

        // then
        expect(indexDelta).toBeNull();
      });
      tick();

      httpMock.match(indexServiceRefreshRequest)[0].flush(mockResponse);
    })));

});
