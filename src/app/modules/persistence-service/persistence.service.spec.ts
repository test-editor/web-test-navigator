import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { HttpProviderService } from '@testeditor/testeditor-commons';
import { Conflict } from './conflict';
import { PersistenceService } from './persistence.service';
import { PersistenceServiceConfig } from './persistence.service.config';
import { ElementType } from './workspace-element';

describe('PersistenceService', () => {
  let serviceConfig: PersistenceServiceConfig;
  let messagingService: MessagingService;
  let httpClient: HttpClient;

  beforeEach(() => {
    serviceConfig = new PersistenceServiceConfig();
    serviceConfig.persistenceServiceUrl = 'http://localhost:9080';

    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        HttpClientTestingModule,
        MessagingModule.forRoot()
      ],
      providers: [
        { provide: PersistenceServiceConfig, useValue: serviceConfig },
        PersistenceService,
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

  it('invokes REST endpoint with encoded path', fakeAsync(inject([HttpTestingController, PersistenceService],
    (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
    // given
    const tclFilePath = 'path/to/file?.tcl';

    // when
    persistenceService.deleteResource(tclFilePath)

    // then
    .then((response) => expect(response).toBe(''));
    tick();

    httpMock.match({
      method: 'DELETE',
      url: serviceConfig.persistenceServiceUrl + '/documents/path/to/file%3F.tcl'
    })[0].flush('');
  })));

  it('createResource returns Conflict object if HTTP status code is CONFLICT', fakeAsync(
    inject([HttpTestingController, PersistenceService],
    (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
    // given
    const tclFilePath = 'path/to/file.tcl';
    const url = `${serviceConfig.persistenceServiceUrl}/documents/${tclFilePath}`;
    const message = `The file '${tclFilePath}' already exists.`;
    // const mockResponse = new HttpResponse({ body: message, status: 409, statusText: 'Conflict' });

    const expectedResult = new Conflict(message);

    // when
    persistenceService.createResource(tclFilePath, ElementType.File)

    // then
    .then((actualResult) => expect(actualResult).toEqual(expectedResult));
    tick();

    const actualRequest = httpMock.expectOne({ method: 'POST' });
    expect(actualRequest.request.url).toEqual(url);
    expect(actualRequest.request.params.get('type')).toEqual('file');
    actualRequest.flush(message, {status: 409, statusText: 'Conflict'});
    })));

  it('deleteResource returns Conflict object if HTTP status code is CONFLICT',
    fakeAsync(inject([HttpTestingController, PersistenceService],
    (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
    // given
    const tclFilePath = 'path/to/file.tcl';
    const url = `${serviceConfig.persistenceServiceUrl}/documents/${tclFilePath}`;
    const message = `The file '${tclFilePath}' does not exist.`;

    const expectedResult = new Conflict(message);

    // when
    persistenceService.deleteResource(tclFilePath)

    // then
    .then((result) => {
        expect(result).toEqual(expectedResult);
      }, (response) => {
        fail('expect conflict to be remapped to regular response!');
      });
    tick();

    const actualRequest = httpMock.expectOne({ method: 'DELETE' });
    expect(actualRequest.request.url).toEqual(url);
    actualRequest.flush(message, {status: 409, statusText: 'Conflict'});
  })));
});
