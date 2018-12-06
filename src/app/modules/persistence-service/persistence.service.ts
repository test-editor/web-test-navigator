import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { HttpProviderService } from '@testeditor/testeditor-commons';
import 'rxjs/add/operator/toPromise';
import { Conflict } from './conflict';
import { PersistenceServiceConfig } from './persistence.service.config';
import { ElementType, WorkspaceElement } from './workspace-element';
import { Subscription } from 'rxjs/Subscription';
import { NAVIGATION_OPEN, NAVIGATION_RENAMED, FILES_CHANGED, SNACKBAR_DISPLAY_NOTIFICATION, FilesChangedPayload } from '../event-types-out';
import { EDITOR_CLOSE, EDITOR_DIRTY_CHANGED, EDITOR_SAVE_COMPLETED, NAVIGATION_CLOSE, EditorDirtyChangedPayload } from '../event-types-in';
import { FILES_BACKEDUP, BackupEntry, FilesBackedupPayload } from '../event-types';
import { MessagingService } from '@testeditor/messaging-service';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';


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
  private openNonDirtyTabs: Set<string>;
  private openDirtyTabs: Set<string>;
  private subscriptions: Subscription[] = [];

  startSubscriptions(): void {
    this.subscriptions.push(this.messagingService.subscribe(NAVIGATION_OPEN, (treeNode: TestNavigatorTreeNode) => {
      this.log('navigation open:', treeNode);
      this.openNonDirtyTabs.add(treeNode.id);
    }));
    this.subscriptions.push(this.messagingService.subscribe(NAVIGATION_CLOSE, () => {
      this.openNonDirtyTabs.clear();
      this.openDirtyTabs.clear();
    }));
    this.subscriptions.push(this.messagingService.subscribe(NAVIGATION_RENAMED, (payload) => {
      this.log('navigation rename:', payload);
      if (this.openNonDirtyTabs.delete(payload.oldPath)) {
        this.openNonDirtyTabs.add(payload.newPath);
      } else if (this.openDirtyTabs.delete(payload.oldPath)) {
        this.openDirtyTabs.add(payload.newPath);
      } else {
        this.log('WARNING: received ' + NAVIGATION_RENAMED
                 + ' but no corresponding open tab is known within persistence service backend:', payload);
      }
    }));
    this.subscriptions.push(this.messagingService.subscribe(EDITOR_CLOSE, (payload) => {
      this.log('editor close:'); this.log(payload);
      const removedNonDirty = this.openNonDirtyTabs.delete(payload.id);
      const removedDirty = this.openDirtyTabs.delete(payload.id);
      if (!(removedDirty || removedNonDirty)) {
        this.log('WARNING: received ' + EDITOR_CLOSE
                 + ' but no corresponding open tab is known within persistence service backend:', payload);
      }
    }));
    this.subscriptions.push(this.messagingService.subscribe(EDITOR_DIRTY_CHANGED, (payload: EditorDirtyChangedPayload) => {
      this.log('editor dirty change:', payload);
      this.openNonDirtyTabs.delete(payload.path);
      this.openDirtyTabs.delete(payload.path);
      if (payload.dirty) {
        this.openDirtyTabs.add(payload.path);
      } else {
        this.openNonDirtyTabs.add(payload.path);
      }
    }));
    this.subscriptions.push(this.messagingService.subscribe(EDITOR_SAVE_COMPLETED, (payload) => {
      this.log('save completed:', payload);
      if (this.openDirtyTabs.delete(payload.id)) {
          this.openNonDirtyTabs.add(payload.id);
      } else {
        this.log('WARNING: received ' + EDITOR_SAVE_COMPLETED
                    + ' but no corresponding open dirty tab is known within persistence service backend');
        this.log(payload);
      }
    }));
  }

  stopSubscriptions(): void {
    this.subscriptions.forEach((it) => it.unsubscribe());
  }

  constructor(config: PersistenceServiceConfig, private httpProvider: HttpProviderService, private messagingService: MessagingService) {
    super();
    this.serviceUrl = config.persistenceServiceUrl;
    this.listFilesUrl = `${config.persistenceServiceUrl}/workspace/list-files`;
    this.openNonDirtyTabs = new Set<string>();
    this.openDirtyTabs = new Set<string>();
  }

  async listFiles(): Promise<WorkspaceElement> {
    const result = await this.wrapActionInPulls((client) => client.get<WorkspaceElement>(this.listFilesUrl).toPromise());
    if (result instanceof Conflict) {
      throw Error('conflict "' + result.message + '" return on list files');
    } else {
      return result;
    }
  }

  private informPullChanges(changedResources: FilesChangedPayload, backedUpResources: FilesBackedupPayload): void {
    this.log('inform about pull changes (if any) with changedResources:', changedResources);
    this.log('..and backedUpResources:', backedUpResources);
    const shortMessage = (changedResources.length + backedUpResources.length)
      + 'File(s) changed in your workspace, please check your open tabs!';
    if (changedResources.length > 0) {
      // editor will reload, inform user about this
      this.messagingService.publish(FILES_CHANGED, changedResources);
    }
    if (backedUpResources.length > 0) {
      // editor will replace resource with backup (name, not content),
      // test-navigator must update tree with additional backup file! inform user about that
      this.messagingService.publish(FILES_BACKEDUP, backedUpResources);
    }
    if (changedResources.length + backedUpResources.length > 0) {
      this.messagingService.publish(
        SNACKBAR_DISPLAY_NOTIFICATION,
        { message: shortMessage,
          timeout: 15000
        });
    }
  }

  /** is the given a conflict (returned by any backend action) that indicates a repull? */
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

  /** wrap the given async funnction in a pull loop that will pull as long as the backend requests pulls
      before the backend actually executes the expected function */
  private async wrapActionInPulls<T>(action: (client: HttpClient) => Promise<T | Conflict>): Promise<T | Conflict> {
    const client = await this.httpProvider.getHttpClient();
    let result: T | Conflict;
    let executePullAgain = true;
    let changedResources = new Array<string>();
    let  backedUpResources = new Array<BackupEntry>();
    while (executePullAgain) {
      executePullAgain = false;
      const pullResponse = await this.executePull(client);
      if (!pullResponse.failure) {
        this.log('received pull response:', pullResponse);
        changedResources = changedResources.concat(pullResponse.changedResources);
        backedUpResources = backedUpResources.concat(pullResponse.backedUpResources);
        try {
          this.log('executing action');
          result = await action(client);
        } catch (errorResponse) {
          this.log('WARNING: got error on copy');
          this.log(errorResponse);
          if (this.isRepullConflict(errorResponse)) {
            this.log('info: execute pull again');
            executePullAgain = true;
          } else {
            this.informPullChanges(changedResources, backedUpResources);
            return this.getConflictOrThrowError(errorResponse);
          }
        }
      } else {
        console.error('unexpected error during pull, pullresponse:', pullResponse);
        this.informPullChanges(changedResources, backedUpResources);
        throw new Error('pull failure');
      }
    }
    this.informPullChanges(changedResources, backedUpResources);
    return result;
  }

  /** copy either a file to its new location (new location is the new filename),
      or copy whole directories (newPath is the path to the new directory to be created) */
  async copyResource(newPath: string, sourcePath: string): Promise<string | Conflict> {
    return this.wrapActionInPulls(async (client) =>
                                  (await client.post(this.getCopyURL(newPath, sourcePath), '',
                                                     { observe: 'response', responseType: 'text'})
                                   .toPromise()).body);
  }

  async renameResource(newPath: string, oldPath: string): Promise<string | Conflict> {
    return this.wrapActionInPulls(async (client: HttpClient) =>
                                  (await client.put(this.getRenameURL(oldPath), newPath,
                                                    { observe: 'response', responseType: 'text'})
                                   .toPromise()).body);
  }

  async deleteResource(path: string): Promise<string | Conflict> {
    return this.wrapActionInPulls(async (client: HttpClient) =>
                                  (await client.delete(this.getURL(path), { observe: 'response', responseType: 'text'})
                                   .toPromise()).body);
  }

  async createResource(path: string, type: ElementType): Promise<string | Conflict> {
    return this.wrapActionInPulls(async (client: HttpClient) =>
                                  (await client.post(this.getURL(path), '',
                                                     { observe: 'response', responseType: 'text', params: { type: type } })
                                   .toPromise()).body);
  }

  private async executePull(httpClient?: HttpClient): Promise<PullResponse> {
    const client = httpClient ? httpClient : await this.httpProvider.getHttpClient();
    try {
      this.log('executing pull with resources:', Array.from(this.openNonDirtyTabs));
      this.log('..and dirtyResources:', Array.from(this.openDirtyTabs));
      return (await client.post(this.getPullURL(),
                                { resources: Array.from(this.openNonDirtyTabs), dirtyResources: Array.from(this.openDirtyTabs) },
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

  private log(msg: String, ...payloads: any[]) {
    if (isDevMode()) {
      console.log('TestNavigator.PersistenceService: ' + msg);
      if (payloads) {
        payloads.forEach((payload) => console.log(payload));
      }
    }
  }

}
