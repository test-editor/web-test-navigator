import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { WorkspaceElement } from './workspace-element';
import { PersistenceServiceConfig } from './persistence.service.config';
import { Conflict } from './conflict';
import 'rxjs/add/operator/toPromise';
import { MessagingService } from '@testeditor/messaging-service';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { HttpResponse } from 'selenium-webdriver/http';

// code duplication with test execution service and test-editor-web, removal planned with next refactoring
const HTTP_CLIENT_NEEDED = 'httpClient.needed';
const HTTP_CLIENT_SUPPLIED = 'httpClient.supplied';

export const HTTP_STATUS_NO_CONTENT = 204;
export const HTTP_STATUS_CONFLICT = 409;
export const HTTP_HEADER_CONTENT_LOCATION = 'content-location';

export abstract class AbstractPersistenceService {
  abstract listFiles(): Promise<WorkspaceElement>;
  abstract renameResource(newPath: string, oldPath: string): Promise<string | Conflict>;
  abstract deleteResource(path: string): Promise<string | Conflict>;
  abstract createResource(path: string, type: string): Promise<string | Conflict>;
  abstract getBinaryResource(path: string): Promise<Blob>;
}

@Injectable()
export class PersistenceService extends AbstractPersistenceService {

  private serviceUrl: string;
  private listFilesUrl: string;

  private cachedHttpClient: HttpClient;

  constructor(config: PersistenceServiceConfig, private httpProvider: HttpProviderService) {
    super();
    this.serviceUrl = config.persistenceServiceUrl;
    this.listFilesUrl = `${config.persistenceServiceUrl}/workspace/list-files`;
  }

  async listFiles(): Promise<WorkspaceElement> {
    const client = await this.httpProvider.getHttpClient();
    return await client.get<WorkspaceElement>(this.listFilesUrl).toPromise();
  }

  async renameResource(newPath: string, oldPath: string): Promise<string | Conflict> {
    const client = await this.httpProvider.getHttpClient();
    try {
      return (await client.put(this.getRenameURL(oldPath), newPath, { observe: 'response', responseType: 'text'}).toPromise()).body;
    } catch (errorResponse) {
      return this.getConflictOrThrowError(errorResponse);
    }
  }

  async deleteResource(path: string): Promise<string | Conflict> {
    const client = await this.httpProvider.getHttpClient();
    try {
      return (await client.delete(this.getURL(path), { observe: 'response', responseType: 'text'}).toPromise()).body;
    } catch (errorResponse) {
      return this.getConflictOrThrowError(errorResponse);
    }
  }

  async createResource(path: string, type: string): Promise<string | Conflict> {
    const client = await this.httpProvider.getHttpClient();
    try {
      return (await client.post(this.getURL(path), '', { observe: 'response', responseType: 'text', params: { type: type } })
        .toPromise()).body;
    } catch (errorResponse) {
      return this.getConflictOrThrowError(errorResponse);
    }
  }

  async getBinaryResource(path: string): Promise<Blob> {
    const client = await this.httpProvider.getHttpClient();
    return await client.get(this.getURL(path), { responseType: 'blob' }).toPromise();
  }

  private getRenameURL(path: string): string {
    return this.getURL(path) + '?rename';
  }

  private getURL(path: string): string {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    return `${this.serviceUrl}/documents/${encodedPath}`;
  }

  private getConflictOrThrowError(errorResponse: HttpErrorResponse | any): Conflict {
    if (this.isHttpErrorResponse(errorResponse)) {
      if (errorResponse.status === HTTP_STATUS_CONFLICT) {
        return new Conflict(errorResponse.error);
      } else {
        throw new Error(errorResponse.error);
      }
    } else {
      throw errorResponse;
    }
  }

  private isHttpErrorResponse(response: HttpErrorResponse | any): response is HttpErrorResponse {
    return (<HttpErrorResponse>response).status !== undefined && (<HttpErrorResponse>response).error !== undefined;
  }

}
