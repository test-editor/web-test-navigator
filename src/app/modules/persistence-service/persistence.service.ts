import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpProviderService } from '@testeditor/testeditor-commons';
import 'rxjs/add/operator/toPromise';
import { Conflict } from './conflict';
import { PersistenceServiceConfig } from './persistence.service.config';
import { ElementType, WorkspaceElement } from './workspace-element';
import { Subscription } from 'rxjs/Subscription';
import { NAVIGATION_OPEN, NAVIGATION_RENAMED, EDITOR_RELOAD, NavigationRenamedPayload,
         FILES_CHANGED, SNACKBAR_DISPLAY_NOTIFICATION } from '../event-types-out';
import { EDITOR_CLOSE, EDITOR_DIRTY_CHANGED, EDITOR_SAVE_COMPLETED, NAVIGATION_CLOSE, EditorDirtyChangedPayload } from '../event-types-in';
import { FILES_BACKEDUP } from '../event-types';


export const HTTP_STATUS_NO_CONTENT = 204;
export const HTTP_STATUS_CONFLICT = 409;
export const HTTP_HEADER_CONTENT_LOCATION = 'content-location';

export abstract class AbstractPersistenceService {
  abstract listFiles(): Promise<WorkspaceElement>;
  abstract renameResource(newPath: string, oldPath: string): Promise<string | Conflict>;
  abstract deleteResource(path: string): Promise<string | Conflict>;
  abstract createResource(path: string, type: ElementType): Promise<string | Conflict>;
  abstract getBinaryResource(path: string): Promise<Blob>;
}

export interface BackupEntry {
  resource: string;
  backupResource: string;
}

export interface PullResponse {
  failure: boolean;
  diffExists: boolean;
  headCommit: string;
  changedResources: Array<string>;
  backedUpResources: Array<BackupEntry>;
}

@Injectable()
export class PersistenceService extends AbstractPersistenceService {

  private serviceUrl: string;
  private listFilesUrl: string;
  private openNonDirtyTabs: Array<string>;
  private openDirtyTabs: Array<string>;
  private subscriptions: Subscription[];

  startSubscriptions(): void {
    this.subscriptions = new Array();
    this.subscriptions.push(this.messagingService.subscribe(NAVIGATION_OPEN, (id) => {
      this.removeNonDirtyTab(id);
      this.openNonDirtyTabs.push(id);
    }));
    this.subscriptions.push(this.messagingService.subscribe(NAVIGATION_CLOSE, () => {
      this.openNonDirtyTabs = new Array();
      this.openDirtyTabs = new Array();
    }));
    this.subscriptions.push(this.messagingService.subscribe(NAVIGATION_RENAMED, (payload) => {
      if (this.removeNonDirtyTab(payload.oldPath)) {
        this.openNonDirtyTabs.push(payload.newPath);
      } else if (this.removeDirtyTab(payload.oldPath)) {
        this.openDirtyTabs.push(payload.newPath);
      } else {
        console.log('WARNING: received ' + NAVIGATION_RENAMED
                    + ' but no corresponding open tab is known within persistence service backend');
        console.log(payload);
      }
    }));
    this.subscriptions.push(this.messagingService.subscribe(EDITOR_CLOSE, (payload) => {
      const removedNonDirty = this.removeNonDirtyTab(payload.id);
      const removedDirty = this.removeDirtyTab(payload.id);
      if (!(removedDirty || removedNonDirty)) {
        console.log('WARNING: received ' + EDITOR_CLOSE
                    + ' but no corresponding open tab is known within persistence service backend');
        console.log(payload);
      }
    }));
    this.subscriptions.push(this.messagingService.subscribe(EDITOR_DIRTY_CHANGED, (payload: EditorDirtyChangedPayload) => {
      this.removeNonDirtyTab(payload.path);
      this.removeDirtyTab(payload.path);
      if (payload.dirty) {
        this.openDirtyTabs.push(payload.path);
      } else {
        this.openNonDirtyTabs.push(payload.path);
      }
    }));
    this.subscriptions.push(this.messagingService.subscribe(EDITOR_SAVE_COMPLETED, (payload) => {
      if (this.removeDirtyTab(payload.id)) {
          this.openNonDirtyTabs.push(payload.id);
      } else {
        console.log('WARNING: received ' + EDITOR_SAVE_COMPLETED
                    + ' but no corresponding open dirty tab is known within persistence service backend');
        console.log(payload);
      }
    }));
  }

  private removeDirtyTab(path: string): boolean {
    const dirtyTab = this.openDirtyTabs.indexOf(path);
    if (dirtyTab >= 0) {
      this.openDirtyTabs.splice(dirtyTab, 1);
      return true;
    } else {
      return false;
    }
  }

  private removeNonDirtyTab(path: string): boolean {
    const nonDirtyTab = this.openNonDirtyTabs.indexOf(path);
    if (nonDirtyTab >= 0) {
      this.openNonDirtyTabs.splice(nonDirtyTab, 1);
      return true;
    } else {
      return false;
    }
  }

  stopSubscriptions(): void {
    this.subscriptions.forEach((it) => it.unsubscribe());
  }

  constructor(config: PersistenceServiceConfig, private httpProvider: HttpProviderService, private messagingService: MessagingService) {
    super();
    this.serviceUrl = config.persistenceServiceUrl;
    this.listFilesUrl = `${config.persistenceServiceUrl}/workspace/list-files`;
    this.openNonDirtyTabs = new Array<string>();
    this.openDirtyTabs = new Array<string>();
  }

  async listFiles(): Promise<WorkspaceElement> {
    const client = await this.httpProvider.getHttpClient();
    return await client.get<WorkspaceElement>(this.listFilesUrl).toPromise();
  }

  private informPullChanges(changedResources: Array<string>, backedUpResources: Array<BackupEntry>): void {
    const msgprefix = 'Files of your workspace were modified on the repository.';
    let changedMessage;
    let backedUpMessage;
    if (changedResources.length > 0) {
      // editor will reload, inform user about this
      this.messagingService.publish(FILES_CHANGED, changedResources);
      changedMessage = '\nPlease check changes on: ' + changedResources.join(', ');
    }
    if (backedUpResources.length > 0) {
      // editor will replace resource with backup (name, not content),
      // test-navigator must update tree with additional backup file! inform user about that
      this.messagingService.publish(FILES_BACKEDUP, backedUpResources);
      backedUpMessage = '\nPlease check backups of: '
        + backedUpResources.map((entry) => entry.resource + '->' + entry.backupResource).join(', ');
    }
    if (changedMessage || backedUpMessage) {
      this.messagingService.publish(SNACKBAR_DISPLAY_NOTIFICATION,
                                    { message: msgprefix + changedMessage ? changedMessage : ''
                                      + backedUpMessage ? backedUpMessage : '' });
    }
  }

  private isRepullConflict(response: any): boolean {
    if (this.isHttpErrorResponse(response)) {
      if (response.status === HTTP_STATUS_CONFLICT) {
        if (response.error === 'REPULL') {
          return true;
        }
      }
    }
    return false;
  }

  /** copy either a file to its new location (new location is the new filename),
      or copy whole directories (newPath is the path to the new directory to be created) */
  async copyResource(newPath: string, sourcePath: string): Promise<string | Conflict> {
    const client = await this.httpProvider.getHttpClient();
    let result: string;
    let executePull = true;
    let changedResources = new Array<string>();
    let  backedUpResources = new Array<BackupEntry>();
    while (executePull) {
      executePull = false;
      const pullResponse = await this.executePull(client);
      if (!pullResponse.failure) {
        changedResources = changedResources.concat(pullResponse.changedResources);
        backedUpResources = backedUpResources.concat(pullResponse.backedUpResources);
        try {
          result = (await client.post(this.getCopyURL(newPath, sourcePath), '', { observe: 'response', responseType: 'text'})
                    .toPromise()).body;
        } catch (errorResponse) {
          if (this.isRepullConflict(errorResponse)) {
            executePull = true;
          } else {
            this.informPullChanges(changedResources, backedUpResources);
            return this.getConflictOrThrowError(errorResponse);
          }
        }
      } else {
        // TODO this is incomplete
        this.informPullChanges(changedResources, backedUpResources);
        throw new Error('pull failure');
      }
    }
    this.informPullChanges(changedResources, backedUpResources);
    return result;
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

  async createResource(path: string, type: ElementType): Promise<string | Conflict> {
    const client = await this.httpProvider.getHttpClient();
    try {
      return (await client.post(this.getURL(path), '', { observe: 'response', responseType: 'text', params: { type: type } })
        .toPromise()).body;
    } catch (errorResponse) {
      return this.getConflictOrThrowError(errorResponse);
    }
  }

  private async synchroniseWithRemote(): Promise<string[]> {
    const pullResult = await this.executePull();
    return this.handleChangesInPull(pullResult);
  }

  private handleChangesInPull(pullResult: PullResponse): string[] {
    const resultingMessages: string[] = new Array();
    pullResult.changedResources.forEach((openTab) => {
      if (this.openNonDirtyTabs.indexOf(openTab) >= 0) {
        this.messagingService.publish(EDITOR_RELOAD, openTab);
        resultingMessages.push('"' + openTab + '" reloaded.');
      } else {
        console.log('WARNING: pull reported tab change in pull which is unknown ' + openTab);
      }
    });
    pullResult.backedUpResources.forEach((originalWithBackup) => {
      if (this.openDirtyTabs.indexOf(originalWithBackup.resource) >= 0) {
        // send editor that the tab with path: openTab has been renamed to originalWithBackup.backupFile
        const payload: NavigationRenamedPayload = { newPath: originalWithBackup.backupResource, oldPath: originalWithBackup.resource };
        this.messagingService.publish(NAVIGATION_RENAMED, payload);
        resultingMessages.push('"' + originalWithBackup.resource + '" was backed up to "' + originalWithBackup.backupResource + '"');
      } else {
        console.log('WARNING: pull reported dirty tab change in pull which is unknown ' + originalWithBackup.resource);
      }
    });
    return resultingMessages;
  }

  private async executePull(httpClient?: HttpClient): Promise<PullResponse> {
    const client = httpClient ? httpClient : await this.httpProvider.getHttpClient();
    try {
      return (await client.post(this.getPullURL(),
                                { resources: this.openNonDirtyTabs, dirtyResources: this.openDirtyTabs },
                                { observe: 'response', responseType: 'json' }).toPromise()).body as PullResponse;
    } catch (errorResponse) {
      // TODO: pull must always work, otherwise the local workspace is in deep trouble
      console.error('could not execute pull', errorResponse);
    }
  }

  async getBinaryResource(path: string): Promise<Blob> {
    const client = await this.httpProvider.getHttpClient();
    return await client.get(this.getURL(path), { responseType: 'blob' }).toPromise();
  }

  private getRenameURL(path: string): string {
    return this.getURL(path) + '?rename';
  }

  private getCopyURL(path: string, sourcePath: string): string {
    return this.getURL(path) + '?source=' + encodeURIComponent(sourcePath) + '&clean=true';
  }

  private getPullURL(): string {
    return `${this.serviceUrl}/workspace/pull`;
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
