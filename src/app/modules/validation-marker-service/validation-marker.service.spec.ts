import { async, TestBed, inject } from '@angular/core/testing';
import { XtextValidationMarkerServiceConfig } from './xtext-validation-marker.service.config';
import { ElementType, WorkspaceElement } from '../persistence-service/workspace-element';
import { ValidationMarkerService, ValidationSummary } from './validation-marker.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { XtextDefaultValidationMarkerService } from './xtext-default-validation-marker.service';

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
  { path: grandChild.path, errors: 6, warnings: 4, infos: 12 },
  { path: middleChild.path, errors: 6, warnings: 4, infos: 12 },
  { path: lastChild.path, errors: 3, warnings: 2, infos: 6 },
  { path: root.path, errors: 12, warnings: 8, infos: 24 },
];

describe('ValidationMarkerService', () => {
  let serviceConfig: XtextValidationMarkerServiceConfig;

  beforeEach(() => {
    serviceConfig = new XtextValidationMarkerServiceConfig();
    serviceConfig.serviceUrl = '';

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HttpClientModule],
      providers: [
        { provide: XtextValidationMarkerServiceConfig, useValue: serviceConfig },
        { provide: ValidationMarkerService, useClass: XtextDefaultValidationMarkerService },
        HttpClient
      ]
    });
  });

  // this test should be rewritten, too, I guess, since checking is done for all files
  it('retrieves markers for single file', async(inject([HttpTestingController, ValidationMarkerService],
    (httpMock: HttpTestingController, validationMarkerService: ValidationMarkerService) => {
      // given
      const sampleFile: WorkspaceElement = { path: 'sample/path/file.txt', name: 'file.txt', children: [], type: ElementType.File };
      const allMarkerSummariesRequest = {
        url: serviceConfig.serviceUrl,
        method: 'GET'
      };

      // when
      validationMarkerService.getAllMarkerSummaries(sampleFile)

        // then
        .then((summaries: ValidationSummary[]) => {
          expect(summaries.length).toEqual(8);
          expect(summaries[7].path).toEqual(sampleFile.path);
          expect(summaries[7].errors).toEqual(0);
          expect(summaries[7].warnings).toEqual(0);
          expect(summaries[7].infos).toEqual(0);
        });

      httpMock.match(allMarkerSummariesRequest)[0].flush(expectedValidationMarkersForSampleResponse);
    })));

});
