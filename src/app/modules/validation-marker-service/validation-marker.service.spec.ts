import { TestBed, inject, tick, fakeAsync } from '@angular/core/testing';
import { ValidationMarkerServiceConfig } from './validation-marker.service.config';
import { ElementType, WorkspaceElement } from '../persistence-service/workspace-element';
import { ValidationMarkerService } from './validation-marker.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { XtextDefaultValidationMarkerService } from './xtext-default-validation-marker.service';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { ValidationMarkerData } from '../validation-marker-summary/validation-marker-summary';

const firstChild: WorkspaceElement = {
  name: 'firstChild',
  path: 'root/firstChild',
  type: ElementType.File,
  children: []
};
const greatGrandChild1: WorkspaceElement = {
  name: 'greatGrandChild1',
  path: 'root/middleChild/grandChild/greatGrandChild1',
  type: ElementType.File,
  children: []
};
const greatGrandChild2: WorkspaceElement = {
  name: 'greatGrandChild2',
  path: 'root/middleChild/grandChild/greatGrandChild2',
  type: ElementType.File,
  children: []
};
const grandChild: WorkspaceElement = {
  name: 'grandChild',
  path: 'root/middleChild/grandChild',
  type: ElementType.Folder,
  children: [greatGrandChild1, greatGrandChild2]
};
const middleChild: WorkspaceElement = {
  name: 'middleChild',
  path: 'root/middleChild',
  type: ElementType.Folder,
  children: [grandChild]
};
const lastChild: WorkspaceElement = {
  name: 'lastChild',
  path: 'root/lastChild',
  type: ElementType.File,
  children: []
};

/**
* + root
*   - firstChild
*   + middleChild
*     + grandChild
*       - greatGrandChild1
*       - greatGrandChild2
*   - lastChild
*/
const root: WorkspaceElement = {
  name: 'folder',
  path: 'root',
  type: ElementType.Folder,
  children: [firstChild, middleChild, lastChild],
};

const expectedValidationMarkersForSampleResponse = [
  { path: firstChild.path, errors: 3, warnings: 2, infos: 6 },
  { path: greatGrandChild1.path, errors: 3, warnings: 2, infos: 6 },
  { path: greatGrandChild2.path, errors: 3, warnings: 2, infos: 6 },
  { path: lastChild.path, errors: 3, warnings: 2, infos: 6 },
];

describe('ValidationMarkerService', () => {
  let serviceConfig: ValidationMarkerServiceConfig;
  let messagingService: MessagingService;
  let httpClient: HttpClient;

  beforeEach(() => {
    serviceConfig = new ValidationMarkerServiceConfig();
    serviceConfig.validationServiceUrl = '';

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HttpClientModule, MessagingModule.forRoot()],
      providers: [
        { provide: ValidationMarkerServiceConfig, useValue: serviceConfig },
        { provide: ValidationMarkerService, useClass: XtextDefaultValidationMarkerService },
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

  it('retrieves all markers', fakeAsync(inject([HttpTestingController, ValidationMarkerService],
    (httpMock: HttpTestingController, validationMarkerService: ValidationMarkerService) => {
      // given
      const allMarkerSummariesRequest = {
        url: serviceConfig.validationServiceUrl,
        method: 'GET'
      };

      // when
      validationMarkerService.getAllMarkerSummaries()

        // then
        .then((summaries: Map<string, ValidationMarkerData>) => {
          expect(summaries.size).toEqual(4);
          expect(summaries.get(firstChild.path)).toEqual(jasmine.objectContaining({errors: 3, warnings: 2, infos: 6 }));
          expect(summaries.get(greatGrandChild1.path)).toEqual(jasmine.objectContaining({errors: 3, warnings: 2, infos: 6 }));
          expect(summaries.get(greatGrandChild2.path)).toEqual(jasmine.objectContaining({errors: 3, warnings: 2, infos: 6 }));
          expect(summaries.get(lastChild.path)).toEqual(jasmine.objectContaining({errors: 3, warnings: 2, infos: 6 }));
          expect(summaries.has(grandChild.path)).toBeFalsy();
          expect(summaries.has(middleChild.path)).toBeFalsy();
          expect(summaries.has(root.path)).toBeFalsy();
        });
      tick();

      httpMock.match(allMarkerSummariesRequest)[0].flush(expectedValidationMarkersForSampleResponse);
    })));

});
