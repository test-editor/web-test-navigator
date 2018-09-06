import { TestBed, inject, async } from '@angular/core/testing';

import { TestExecutionService, DefaultTestExecutionService, AllStatusResponse } from './test-execution.service';
import { HttpClientTestingModule, HttpTestingController, RequestMatch } from '@angular/common/http/testing';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TestExecutionServiceConfig } from './test-execution.service.config';
import { TestExecutionState } from './test-execution-state';

describe('TestExecutionService', () => {
  let serviceConfig: TestExecutionServiceConfig;

  beforeEach(() => {
    serviceConfig = { testExecutionServiceUrl: 'http://localhost:9080/test-suite' };

    TestBed.configureTestingModule({
      imports: [ HttpClientTestingModule, HttpClientModule ],
      providers: [ HttpClient,
        { provide: TestExecutionService, useClass: DefaultTestExecutionService},
        { provide: TestExecutionServiceConfig, useValue: serviceConfig }, ]
    });
  });

  it('should be created', inject([TestExecutionService], (service: TestExecutionService) => {
    expect(service).toBeTruthy();
  }));

  it('execute passes path list on as HTTP POST body', async(inject([TestExecutionService, HttpTestingController],
    (service: TestExecutionService, httpMock: HttpTestingController) => {
    // given
    const paths = [ 'path/to/first/test', 'path/to/a/differentTest' ];
    const testExecutionRequest: RequestMatch = {
      method: 'POST',
      url: serviceConfig.testExecutionServiceUrl + '/launch-new'
    };
    const mockResponse = 'http://example.org/1234/5678';

    // when
    service.execute(...paths);

    // then
    const testRequest = httpMock.expectOne(testExecutionRequest);
    expect(testRequest.request.body).toEqual(paths);
    testRequest.flush(null, {headers: {location: mockResponse}});
  })));

  it('execute returns location attribute of response header', async(inject([TestExecutionService, HttpTestingController],
    (service: TestExecutionService, httpMock: HttpTestingController) => {
    // given
    const paths = [ 'path/to/first/test', 'path/to/a/differentTest' ];
    const testExecutionRequest = {
      method: 'POST',
      url: serviceConfig.testExecutionServiceUrl + '/launch-new'
    };
    const mockResponse = 'http://example.org/1234/5678';

    // when
    service.execute(...paths)

    // then
    .then((actualResponse) => {
      expect(actualResponse).toEqual(mockResponse);
    });

    httpMock.expectOne(testExecutionRequest).flush(null, {headers: {location: mockResponse}});
  })));

  it('getStatus makes a GET request at the provided URL with query parameter "status" appended',
    async(inject([TestExecutionService, HttpTestingController],
    (service: TestExecutionService, httpMock: HttpTestingController) => {
    // given
    const testResourceURL = 'http://example.org/1234/5678';
    const testExecutionRequest: RequestMatch = {
      method: 'GET',
      url: testResourceURL + '?status&wait'
    };

    // when
    service.getStatus(testResourceURL);

    // then
    httpMock.expectOne(testExecutionRequest);
    expect().nothing();
  })));

  it('getStatus returns TestExecutionStatus object containing the test state returned by the server',
    async(inject([TestExecutionService, HttpTestingController],
    (service: TestExecutionService, httpMock: HttpTestingController) => {
    // given
    const testResourceURL = 'http://example.org/1234/5678';
    const testExecutionRequest: RequestMatch = {
      method: 'GET',
      url: testResourceURL + '?status&wait'
    };

    // when
    service.getStatus(testResourceURL)

    // then
    .then((actualStatus) => {
      expect(actualStatus.resourceURL).toEqual(testResourceURL);
      expect(actualStatus.status).toEqual(TestExecutionState.Running);
    });

    httpMock.expectOne(testExecutionRequest).flush('RUNNING');
  })));

  it('getAllStatus makes the proper GET request',
    async(inject([TestExecutionService, HttpTestingController],
    (service: TestExecutionService, httpMock: HttpTestingController) => {
    // given
    const testExecutionRequest: RequestMatch = {
      method: 'GET',
      url: serviceConfig.testExecutionServiceUrl + '/status'
    };

    // when
    service.getAllStatus();

    // then
    httpMock.expectOne(testExecutionRequest);
    expect().nothing();
  })));

  it('getAllStatus returns an array of TestExecutionStatus object',
    async(inject([TestExecutionService, HttpTestingController],
    (service: TestExecutionService, httpMock: HttpTestingController) => {
    // given
    const testExecutionRequest: RequestMatch = {
      method: 'GET',
      url: serviceConfig.testExecutionServiceUrl + '/status'
    };
    const mockResponse: AllStatusResponse[] = [
      { key: { suiteId: '1234', suiteRunId: '5678' }, status: 'RUNNING' },
      { key: { suiteId: '1234', suiteRunId: '4711' }, status: 'SUCCESS' },
      { key: { suiteId: '4321', suiteRunId: '1111' }, status: 'FAILED' },
      { key: { suiteId: '1234', suiteRunId: '9876' }, status: 'IDLE' },
    ];

    // when
    service.getAllStatus()

    // then
    .then((actualStatus) => {
      expect(actualStatus.length).toEqual(4);
      expect(actualStatus).toContain({
        resourceURL: serviceConfig.testExecutionServiceUrl + '/1234/5678',
        status: TestExecutionState.Running
      });
      expect(actualStatus).toContain({
        resourceURL: serviceConfig.testExecutionServiceUrl + '/1234/4711',
        status: TestExecutionState.LastRunSuccessful
      });
      expect(actualStatus).toContain({
        resourceURL: serviceConfig.testExecutionServiceUrl + '/4321/1111',
        status: TestExecutionState.LastRunFailed
      });
      expect(actualStatus).toContain({
        resourceURL: serviceConfig.testExecutionServiceUrl + '/1234/9876',
        status: TestExecutionState.Idle
      });
    });

    httpMock.expectOne(testExecutionRequest).flush(mockResponse);
  })));




});
