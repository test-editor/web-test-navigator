import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { Conflict, HttpProviderService } from '@testeditor/testeditor-commons';
import { BackupEntry } from '../event-types';
import { PersistenceService } from './persistence.service';
import { PersistenceServiceConfig } from './persistence.service.config';
import { ElementType } from './workspace-element';

describe('PersistenceService', () => {
  let serviceConfig: PersistenceServiceConfig;
  let messagingService: MessagingService;
  let httpClient: HttpClient;
  let pullMatcher: any;
  let copyMatcher: any;

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

    pullMatcher = {
      method: 'POST',
      url: serviceConfig.persistenceServiceUrl + '/workspace/pull'
    };
    copyMatcher = {
      method: 'POST',
      url: serviceConfig.persistenceServiceUrl + '/documents/newpath/to/file%3F.tcl?source=path%2Fto%2Ffile%3F.tcl&clean=true'
    };
 });

  it('does multiple pulls if REPULL is requested by backend',  fakeAsync(inject([HttpTestingController, PersistenceService],
    (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
      // given
      const tclFilePath = 'path/to/file?.tcl';
      const tclFileTarget = 'newpath/to/file?.tcl';
      let changedFiles: string[];

      // when
      messagingService.subscribe('files.changed', (files) => { changedFiles = files; });
      persistenceService.copyResource(tclFileTarget, tclFilePath)

      // then
      .then((response) => expect(response).toBe(tclFileTarget));
      tick();

      httpMock.match(pullMatcher)[0].flush({ failure: false, diffExists: false, headCommit: 'abcdef',
        changedResources: [ 'fileA' ],
        backedUpResources: []
      });
      tick();

      httpMock.match(copyMatcher)[0].flush('REPULL', {status: 409, statusText: 'Conflict'});
      tick();

      httpMock.match(pullMatcher)[0].flush({ failure: false, diffExists: false, headCommit: 'abcdef',
        changedResources: [ 'fileB' ],
        backedUpResources: []
      });
      tick();

      httpMock.match(copyMatcher)[0].flush(tclFileTarget);
      tick();

      expect(changedFiles).toContain('fileA'); // first pull reports this one
      expect(changedFiles).toContain('fileB'); // second pull reports this one
    })));

  it('copies a resource regularly if backend reports no conflict nor error', fakeAsync(inject([HttpTestingController, PersistenceService],
    (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
      // given
      const tclFilePath = 'path/to/file?.tcl';
      const tclFileTarget = 'newpath/to/file?.tcl';

      // when
      persistenceService.copyResource(tclFileTarget, tclFilePath)

      // then
      .then((response) => expect(response).toBe(tclFileTarget));
      tick();

      httpMock.match(pullMatcher)[0].flush({ failure: false, diffExists: false, headCommit: 'abcdef',
        changedResources: [],
        backedUpResources: []
      });
      tick();

      httpMock.match(copyMatcher)[0].flush(tclFileTarget);
  })));

  it('expect messages about changes when copying and pull reports changes', fakeAsync(inject([HttpTestingController, PersistenceService],
    (httpMock: HttpTestingController, persistenceService: PersistenceService) => {

      // given
      const tclFilePath = 'path/to/file?.tcl';
      const tclFileTarget = 'newpath/to/file?.tcl';
      let changedFiles: string[];
      let backedUpFiles: BackupEntry[];

      // when
      messagingService.subscribe('files.changed', (files) => { changedFiles = files; });
      messagingService.subscribe('files.backedup', (files) => { backedUpFiles = files; });
      persistenceService.copyResource(tclFileTarget, tclFilePath)

       // then
      .then((response) => expect(response).toBe(tclFileTarget));
      tick();

      httpMock.match(pullMatcher)[0].flush({ failure: false, diffExists: true, headCommit: 'abcdef',
        changedResources: [ 'some/file' ],
        backedUpResources: [ { resource: 'some/other/file', backupResource: 'some/other/backup.file' } ]
      });
      tick();

      httpMock.match(copyMatcher)[0].flush(tclFileTarget);
      tick();

      // messages were received and changedFiles and backedUpFiles were set
      expect(changedFiles).toContain('some/file');
      expect(backedUpFiles.length).toEqual(1);
      expect(backedUpFiles[0].resource).toEqual('some/other/file');
      expect(backedUpFiles[0].backupResource).toEqual('some/other/backup.file');
   })));

  it('ensure that pull passes no more "resources" and "dirtyResources" if closing/saved/non-dirty messages were received',
      fakeAsync(inject([HttpTestingController, PersistenceService],
                       (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
      // given
      persistenceService.startSubscriptions();

      // when
      messagingService.publish('navigation.open', { id: 'some/file/closed' });
      messagingService.publish('navigation.open', { id: 'some/open-file' });
      messagingService.publish('editor.dirtyStateChanged', { path: 'yet/another/closed', dirty: true });
      messagingService.publish('editor.dirtyStateChanged', { path: 'and/a-file/no-longer-dirty', dirty: true });
      messagingService.publish('editor.dirtyStateChanged', { path: 'and/still/a-file/no-longer-dirty', dirty: true });

      messagingService.publish('editor.close', { id: 'some/file/closed' });
      messagingService.publish('editor.close', { id: 'yet/another/closed' });
      messagingService.publish('editor.dirtyStateChanged', { path: 'and/a-file/no-longer-dirty', dirty: false });
      messagingService.publish('editor.save.completed', { id: 'and/still/a-file/no-longer-dirty'});
      persistenceService.copyResource('target-file', 'source-file'); // will trigger a pull
      tick();

       // then
      const pullMatched = httpMock.match(pullMatcher)[0];
      expect(pullMatched.request.body).toEqual(jasmine.objectContaining(
        { resources: [ 'target-file', 'source-file', 'some/open-file', 'and/a-file/no-longer-dirty', 'and/still/a-file/no-longer-dirty' ],
          dirtyResources: [ ] }));
    })));

  it('ensure that pull passes "resources" and "dirtyResources" without duplicates',
      fakeAsync(inject([HttpTestingController, PersistenceService],
                       (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
      // given
      persistenceService.startSubscriptions();

      // when
      messagingService.publish('navigation.open', { id: 'some/file' });
      messagingService.publish('navigation.open', { id: 'some/other/file' });
      messagingService.publish('navigation.open', { id: 'some/other/file' });
      messagingService.publish('editor.dirtyStateChanged', { path: 'and/yet/another', dirty: true });
      messagingService.publish('editor.dirtyStateChanged', { path: 'and/yet/another', dirty: true });
      persistenceService.copyResource('target-file', 'source-file'); // will trigger a pull
      tick();

       // then
      const pullMatched = httpMock.match(pullMatcher)[0];
      expect(pullMatched.request.body).toEqual(jasmine.objectContaining(
        { resources: [ 'target-file', 'source-file', 'some/file', 'some/other/file' ], dirtyResources: [ 'and/yet/another' ] }));

    })));

  it('returns a conflict if backend reports one', fakeAsync(inject([HttpTestingController, PersistenceService],
    (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
      // given
      const tclFilePath = 'path/to/file?.tcl';
      const tclFileTarget = 'newpath/to/file?.tcl';
      const message = `The file '${tclFileTarget}' already exists.`;
      const expectedConflict = new Conflict(message);

      // when
      persistenceService.copyResource(tclFileTarget, tclFilePath)

      // then
      .then((result) => {
        expect(result).toEqual(expectedConflict);
      }, (error) => {
        fail('expect conflict to be remapped to regular response!');
      });
      tick();

      httpMock.match(pullMatcher)[0].flush({ failure: false, diffExists: false, headCommit: 'abcdef',
        changedResources: [],
        backedUpResources: []
      });
      tick();

      httpMock.match(copyMatcher)[0].flush(message, {status: 409, statusText: 'Conflict'});
  })));

  it('invokes REST endpoint with encoded path', fakeAsync(inject([HttpTestingController, PersistenceService],
    (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
    // given
    const tclFilePath = 'path/to/file?.tcl';

    // when
    persistenceService.deleteResource(tclFilePath)

    // then
    .then((response) => expect(response).toBe(''));
    tick();

    httpMock.match(pullMatcher)[0].flush({ failure: false, diffExists: false, headCommit: 'abcdef',
      changedResources: [],
      backedUpResources: []
    });
    tick();

    httpMock.match({
      method: 'DELETE',
      url: serviceConfig.persistenceServiceUrl + '/documents/path/to/file%3F.tcl?clean=true'
    })[0].flush('');
  })));

  it('createResource returns Conflict object if HTTP status code is CONFLICT', fakeAsync(
    inject([HttpTestingController, PersistenceService],
    (httpMock: HttpTestingController, persistenceService: PersistenceService) => {
    // given
    const tclFilePath = 'path/to/file.tcl';
    const url = `${serviceConfig.persistenceServiceUrl}/documents/${tclFilePath}?clean=true`;
    const message = `The file '${tclFilePath}' already exists.`;
    // const mockResponse = new HttpResponse({ body: message, status: 409, statusText: 'Conflict' });

    const expectedResult = new Conflict(message);

    // when
    persistenceService.createResource(tclFilePath, ElementType.File)

    // then
    .then((actualResult) => expect(actualResult).toEqual(expectedResult));
    tick();

    httpMock.match(pullMatcher)[0].flush({ failure: false, diffExists: false, headCommit: 'abcdef',
      changedResources: [],
      backedUpResources: []
    });
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
    const url = `${serviceConfig.persistenceServiceUrl}/documents/${tclFilePath}?clean=true`;
    const message = `The file '${tclFilePath}' does not exist.`;

    const expectedResult = new Conflict(message);

    // when
    persistenceService.deleteResource(tclFilePath)

    // then
    .then((result) => {
      expect(result).toEqual(expectedResult);
    }, (response) => {
      fail('expect conflict to be remapped to regular response: ' + response.toString());
    });
    tick();

    httpMock.match(pullMatcher)[0].flush({ failure: false, diffExists: false, headCommit: 'abcdef',
      changedResources: [],
      backedUpResources: []
    });
    tick();

    const actualRequest = httpMock.expectOne({ method: 'DELETE' });
    expect(actualRequest.request.url).toEqual(url);
    actualRequest.flush(message, {status: 409, statusText: 'Conflict'});
  })));

});
