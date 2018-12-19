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
import { PullActionProtocol } from './pull-action-protocol.service';


export const HTTP_STATUS_NO_CONTENT = 204;
export const HTTP_STATUS_CONFLICT = 409;
export const HTTP_HEADER_CONTENT_LOCATION = 'content-location';

export class BackupEntrySet {
  entries: BackupEntry[] = [];

  add(additionalEntries: BackupEntry[]): void {
    const newEntries = additionalEntries.filter(additionalEntry => !this.entries.find(entry => this.equals(entry, additionalEntry)));
    this.entries = this.entries.concat(newEntries);
  }

  equals(entry1: BackupEntry, entry2: BackupEntry): boolean {
    return entry1.backupResource === entry2.backupResource
      && entry1.resource === entry2.resource;
  }

  toArray(): BackupEntry[] {
    return this.entries;
  }

}

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

  constructor(config: PersistenceServiceConfig, private httpProvider: HttpProviderService, private messagingService: MessagingService) {
    super();
    this.serviceUrl = config.persistenceServiceUrl;
    this.listFilesUrl = `${config.persistenceServiceUrl}/workspace/list-files`;
    this.openNonDirtyTabs = new Set<string>();
    this.openDirtyTabs = new Set<string>();
  }

  startSubscriptions(): void {
    this.subscribeNavigationOpen(); // opens one file
    this.subscribeNavigationClose(); // closes all
    this.subscribeNavigationRenamed(); // renames one file
    this.subscribeEditorClose(); // closes one (editor) file
    this.subscribeEditorDirtyChanged(); // editor is dirty/not dirty
    this.subscribeEditorSaveCompleted(); // editor content was saved
  }

  stopSubscriptions(): void {
    this.subscriptions.forEach((it) => it.unsubscribe());
  }

  // TODO: given the fact, that the new backend will not return conflicts other than repull requests,
  //       conflicts could probably be removed from the interface of the public functions here as soon
  //       as the backend is switched to the new endpoints

  async listFiles(): Promise<WorkspaceElement> {
    const result = await this.wrapActionInPulls((client) => client.get<WorkspaceElement>(this.listFilesUrl).toPromise(), []);
    if (result instanceof Conflict) {
      throw Error('conflict "' + result.message + '" return on list files');
    } else {
      return result;
    }
  }

  /** copy either a file to its new location (new location is the new filename),
      or copy whole directories (newPath is the path to the new directory to be created)
      ui currently allows only for file copies. folder copies are disabled. */
  async copyResource(newPath: string, sourcePath: string): Promise<string | Conflict> {
    return this.wrapActionInPulls(async (client) =>
                                  (await client.post(this.getCopyURL(newPath, sourcePath), '',
                                                     { observe: 'response', responseType: 'text'})
                                   .toPromise()).body, [ newPath, sourcePath ]);
  }

  async renameResource(newPath: string, oldPath: string): Promise<string | Conflict> {
    return this.wrapActionInPulls(async (client: HttpClient) =>
                                  (await client.put(this.getRenameURL(oldPath), newPath,
                                                    { observe: 'response', responseType: 'text'})
                                   .toPromise()).body, [ newPath, oldPath ]);
  }

  async deleteResource(path: string): Promise<string | Conflict> {
    return this.wrapActionInPulls(async (client: HttpClient) =>
                                  (await client.delete(this.getURL(path), { observe: 'response', responseType: 'text'})
                                   .toPromise()).body, [ path ]);
  }

  async createResource(path: string, type: ElementType): Promise<string | Conflict> {
    return this.wrapActionInPulls(async (client: HttpClient) =>
                                  (await client.post(this.getURL(path), '',
                                                     { observe: 'response', responseType: 'text', params: { type: type } })
                                   .toPromise()).body, [ path ]);
  }

  async getBinaryResource(path: string): Promise<Blob> {
    const result = await this.wrapActionInPulls(async (client: HttpClient) =>
                                  (await client.get(this.getURL(path), { responseType: 'blob' }).toPromise()), []);
    if (result instanceof Blob) {
      return result;
    } else {
      throw new Error('unexpected conflict ' + result.message + ' upon loading binary object');
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

  private async newWrapActionInPulls<T>(action: (client: HttpClient) => Promise<T | Conflict>,
                                     additionalFilesOfInterest: string[]): Promise<T | Conflict> {
    const pullActionProtocol = new PullActionProtocol(this.httpProvider, this.serviceUrl, action, Array.from(this.openNonDirtyTabs),
                                                      Array.from(this.openDirtyTabs), additionalFilesOfInterest);
    while (pullActionProtocol.retryExecution()) {
      pullActionProtocol.execute();
    }
    this.informPullChanges(Array.from(pullActionProtocol.changedResourcesSet), pullActionProtocol.backedUpResourcesSet.toArray());
    if (pullActionProtocol.result instanceof Error) {
      throw pullActionProtocol.result;
    }
    return pullActionProtocol.result;
  }

  /** wrap the given async funnction in a pull loop that will pull as long as the backend requests pulls
      before the backend actually executes the expected function

      if the action fails, the backend requests repulls, but pulling will repeatedly report no differences,
      repulling will be aborted (executedRetriesWithoutDiff)
      */
  private async wrapActionInPulls<T>(action: (client: HttpClient) => Promise<T | Conflict>,
                                     additionalFilesOfInterest: string[]): Promise<T | Conflict> {
    const client = await this.httpProvider.getHttpClient();
    let result: T | Conflict;
    let executePullAgain = true;
    let changedResourcesSet = new Set<string>();
    const backedUpResourcesSet = new BackupEntrySet();
    let executedRetries = -1; // first pull is no retry, first increment will set counter to zero
    // counter for consecutive retries where pulls did not provide any changes and thus no new chance for the backend to actually proceed
    let consecutiveExecutedRetriesWithoutDiff = -1;
    const filesOfInterest = additionalFilesOfInterest ?
      additionalFilesOfInterest.concat(Array.from(this.openNonDirtyTabs)) :
      Array.from(this.openNonDirtyTabs);
    const dirtyFilesOfInterest = Array.from(this.openDirtyTabs);
    while (executePullAgain) {
      executePullAgain = false;
      executedRetries++;
      const pullResponse = await this.executePull(filesOfInterest, dirtyFilesOfInterest, client);
      if (!pullResponse.failure) {
        this.log('received pull response:', pullResponse);
        changedResourcesSet = new Set([...Array.from(changedResourcesSet), ...pullResponse.changedResources]);
        backedUpResourcesSet.add(pullResponse.backedUpResources);
        if (pullResponse.diffExists) {
          consecutiveExecutedRetriesWithoutDiff = 0; // reset counter if a diff is present
        } else {
          consecutiveExecutedRetriesWithoutDiff++;
        }
        const changesInAdditionalFilesOfInterest = Array.from(changedResourcesSet).filter(changedFile =>
           additionalFilesOfInterest.find(fileOfInterest => changedFile.startsWith(fileOfInterest))); //
        if (changesInAdditionalFilesOfInterest.length > 0) {
            // pull resulted in diff that touches (at least one) file of interest
          return new Conflict('File touching this action has been changed, please recheck file before retry.');
        } else {
          try {
            this.log('executing action');
            result = await action(client);
          } catch (errorResponse) {
            this.log('WARNING: got error on action', errorResponse);
            if (this.isRepullConflict(errorResponse)) {
              if (consecutiveExecutedRetriesWithoutDiff > 0) {
                this.log('WARNING: action failed after ' + consecutiveExecutedRetriesWithoutDiff
                         + ' consecutive retries (and pulls) without differences');
              } else {
                this.log('execute pull again, retry number ' + (executedRetries + 1));
                executePullAgain = true;
              }
            } else {
              this.informPullChanges(Array.from(changedResourcesSet), backedUpResourcesSet.toArray());
              return this.getConflictOrThrowError(errorResponse);
            }
          }
        }
      } else {
        this.log('ERROR: unexpected error during pull, pullresponse:', pullResponse);
        this.informPullChanges(Array.from(changedResourcesSet), backedUpResourcesSet.toArray());
        throw new Error('pull failure');
      }
    }
    this.informPullChanges(Array.from(changedResourcesSet), backedUpResourcesSet.toArray());
    return result;
  }

  private async executePull(nonDirtyFiles: string[], dirtyFiles: string[], httpClient?: HttpClient): Promise<PullResponse> {
    const client = httpClient ? httpClient : await this.httpProvider.getHttpClient();
    try {
      this.log('executing pull with resources:', nonDirtyFiles);
      this.log('..and dirtyResources:', dirtyFiles);
      return (await client.post(this.getPullURL(),
                                { resources: nonDirtyFiles, dirtyResources: dirtyFiles },
                                { observe: 'response', responseType: 'json' }).toPromise()).body as PullResponse;
    } catch (errorResponse) {
      // TODO: pull must always work, otherwise the local workspace is in deep trouble
      console.error('could not execute pull', errorResponse);
    }
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

  private subscribeNavigationOpen(): void {
    this.subscriptions.push(this.messagingService.subscribe(NAVIGATION_OPEN, (treeNode: TestNavigatorTreeNode) => {
      this.openNonDirtyTabs.add(treeNode.id);
    }));
  }

  private subscribeNavigationClose(): void {
    this.subscriptions.push(this.messagingService.subscribe(NAVIGATION_CLOSE, () => {
      this.openNonDirtyTabs.clear();
      this.openDirtyTabs.clear();
    }));
  }

  private subscribeNavigationRenamed(): void {
    this.subscriptions.push(this.messagingService.subscribe(NAVIGATION_RENAMED, (payload) => {
      if (this.openNonDirtyTabs.delete(payload.oldPath)) {
        this.openNonDirtyTabs.add(payload.newPath);
      } else if (this.openDirtyTabs.delete(payload.oldPath)) {
        this.openDirtyTabs.add(payload.newPath);
      } else {
        this.log('WARNING: received ' + NAVIGATION_RENAMED
                 + ' but no corresponding open tab is known within persistence service backend:', payload);
      }
    }));
  }

  private subscribeEditorClose(): void {
    this.subscriptions.push(this.messagingService.subscribe(EDITOR_CLOSE, (payload) => {
      const removedNonDirty = this.openNonDirtyTabs.delete(payload.id);
      const removedDirty = this.openDirtyTabs.delete(payload.id);
      if (!(removedDirty || removedNonDirty)) {
        this.log('WARNING: received ' + EDITOR_CLOSE
                 + ' but no corresponding open tab is known within persistence service backend:', payload);
      }
    }));
  }

  private subscribeEditorDirtyChanged(): void {
    this.subscriptions.push(this.messagingService.subscribe(EDITOR_DIRTY_CHANGED, (payload: EditorDirtyChangedPayload) => {
      this.openNonDirtyTabs.delete(payload.path);
      this.openDirtyTabs.delete(payload.path);
      if (payload.dirty) {
        this.openDirtyTabs.add(payload.path);
      } else {
        this.openNonDirtyTabs.add(payload.path);
      }
    }));
  }

  private subscribeEditorSaveCompleted() {
    this.subscriptions.push(this.messagingService.subscribe(EDITOR_SAVE_COMPLETED, (payload) => {
      if (this.openDirtyTabs.delete(payload.id)) {
          this.openNonDirtyTabs.add(payload.id);
      } else {
        this.log('WARNING: received ' + EDITOR_SAVE_COMPLETED
                 + ' but no corresponding open dirty tab is known within persistence service backend', payload);
      }
    }));
  }

}
