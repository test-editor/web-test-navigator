import { HttpClient } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { MessagingService } from '@testeditor/messaging-service';
import { Conflict, HttpProviderService, PullActionProtocol } from '@testeditor/testeditor-commons';
import 'rxjs/add/operator/toPromise';
import { Subscription } from 'rxjs/Subscription';
import { FilesBackedupPayload, FILES_BACKEDUP } from '../event-types';
import { EditorDirtyChangedPayload, EDITOR_CLOSE, EDITOR_DIRTY_CHANGED, EDITOR_SAVE_COMPLETED, NAVIGATION_CLOSE } from '../event-types-in';
import { FilesChangedPayload, FILES_CHANGED, NAVIGATION_OPEN, NAVIGATION_RENAMED, SNACKBAR_DISPLAY_NOTIFICATION } from '../event-types-out';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { PersistenceServiceConfig } from './persistence.service.config';
import { ElementType, WorkspaceElement } from './workspace-element';


export abstract class AbstractPersistenceService {
  abstract listFiles(): Promise<WorkspaceElement>;
  abstract renameResource(newPath: string, oldPath: string): Promise<string | Conflict>;
  abstract deleteResource(path: string): Promise<string | Conflict>;
  abstract createResource(path: string, type: ElementType): Promise<string | Conflict>;
  abstract getBinaryResource(path: string): Promise<Blob>;
}

@Injectable()
export class PersistenceService extends AbstractPersistenceService {

  private readonly serviceUrl: string;
  private readonly listFilesUrl: string;
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
    this.log('trace: copy resource, post ' + this.getCopyURL(newPath, sourcePath));
    return this.wrapActionInPulls(async (client) =>
                                  (await client.post(this.getCopyURL(newPath, sourcePath), '',
                                                     { observe: 'response', responseType: 'text'})
                                   .toPromise()).body, [ newPath, sourcePath ]);
  }

  async renameResource(newPath: string, oldPath: string): Promise<string | Conflict> {
    this.log('trace: rename resource, put ' + this.getRenameURL(oldPath));
    return this.wrapActionInPulls(async (client: HttpClient) =>
                                  (await client.put(this.getRenameURL(oldPath), newPath,
                                                    { observe: 'response', responseType: 'text'})
                                   .toPromise()).body, [ newPath, oldPath ]);
  }

  async deleteResource(path: string): Promise<string | Conflict> {
    this.log('trace: delete resource, delete ' + this.getURL(path));
    return this.wrapActionInPulls(async (client: HttpClient) =>
                                  (await client.delete(this.getURL(path), { observe: 'response', responseType: 'text'})
                                   .toPromise()).body, [ path ]);
  }

  async createResource(path: string, type: ElementType): Promise<string | Conflict> {
    this.log('trace: create resource, post ' + this.getURL(path));
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

  private async wrapActionInPulls<T>(action: (client: HttpClient) => Promise<T | Conflict>,
                                     additionalFilesOfInterest: string[]): Promise<T | Conflict> {
    const PULL_MAX_RETRY_COUNT = 20;
    const pullActionProtocol = new PullActionProtocol(this.httpProvider, this.serviceUrl, action, Array.from(this.openNonDirtyTabs),
                                                      Array.from(this.openDirtyTabs), additionalFilesOfInterest);
    let retryCount = 0;
    while (pullActionProtocol.executionPossible() && retryCount < PULL_MAX_RETRY_COUNT) {
      await pullActionProtocol.execute();
      retryCount++;
    }
    if (retryCount >= PULL_MAX_RETRY_COUNT) {
      console.error(`aborted after ${retryCount} retries`);
      throw new Error(`pull retry timeout after ${retryCount} retries`);
    } else {
      this.informPullChanges(Array.from(pullActionProtocol.changedResourcesSet), pullActionProtocol.backedUpResourcesSet.toArray());
      if (pullActionProtocol.result instanceof Error) {
        throw pullActionProtocol.result;
      }
      return pullActionProtocol.result;
    }
  }

  private getRenameURL(path: string): string {
    return this.getDocumentURL(path) + '?rename&clean=true';
  }

  private getCopyURL(path: string, sourcePath: string): string {
    return this.getDocumentURL(path) + '?source=' + encodeURIComponent(sourcePath) + '&clean=true';
  }

  private getDocumentURL(path: string): string {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    return `${this.serviceUrl}/documents/${encodedPath}`;
  }

  private getURL(path: string): string {
    return this.getDocumentURL(path) + '?clean=true';
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
