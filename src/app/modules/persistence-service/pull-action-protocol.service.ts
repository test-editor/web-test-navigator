import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Conflict } from './conflict';
import { HttpProviderService } from '@testeditor/testeditor-commons';
import { isDevMode } from '@angular/core';
import { BackupEntry } from '../event-types';

export const HTTP_STATUS_NO_CONTENT = 204;
export const HTTP_STATUS_CONFLICT = 409;

export interface PullResponse {
  failure: boolean;
  diffExists: boolean;
  headCommit: string;
  changedResources: Array<string>;
  backedUpResources: Array<BackupEntry>;
}

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

/** Wrap a simple action (e.g. copy, list-files etc.) into a protocol that does the following:

    1. pull, collect interesting changes in diffs, that may be of interest to the ui
       - if the pull fails, report a pull failure and exit
    2. execute the repository action
       - if the action could not be executed by the backend, and the backend indicates to repull,
         undo the action (user of the protocol should start over at step 1, collecting additional! diffs of interest)
       - if an error occured during the execution of the action,
         undo the action (user of the protocol should start over at step 1, collecting additional! diffs of interest)
       - if errors repeatedly occur, even though additional pulls did not change the repository (since it was up to date),
         fail the whole action


    usage:
      const pullActionProtocol = new PullActionProtocol(...);
      while (pullActionProtocol.retryExecution()) {
        await pullActionProtocol.execute();
        // do some logging?
      }
      // inform about changes of interest
      // pullActionProtocol.changedResourcesSet: contains all files that changed due to executed pulls.
      //                    changedResourcesSet is filled with filesInterestedInContentChanges (see ctor)
      // pullActionProtocol.backedUpResourcesSet: contains files (and the corresponding backup files) that changed due to executed pulls.
      //                    backedUpResourcesSet is filled with fileListToBackupOnChange (see ctor)
      // if pull result in changes to files in the criticalFilesOfInterest list, the process stops with an error (pullActionProcotol.result)

      if (pullActionProtocol.result instanceof Error) {
        throw pullActionProcotol.result;
      } else if (pullActionProtocol.result instanceof Conflict) {
        ...
      } else {
        return pullActionProcotol.result;
      }
  */
export class PullActionProtocol<T> {
  changedResourcesSet = new Set<string>();
  backedUpResourcesSet = new BackupEntrySet();
  executedRetries: number;
  consecutiveExecutedRetriesWithoutDiff: number;
  httpClient: HttpClient;
  result: T | Conflict | Error;

  readonly filesOfInterest: string[];
  readonly dirtyFilesOfInterest: string[];

  constructor(private httpProvider: HttpProviderService, private serviceUrl: string,
              private action: (client: HttpClient) => Promise<T | Conflict>,
              filesInterestedInContentChanges: string[], fileListToBackupOnChanges: string[], private criticalFilesOfInterest: string[]) {
    this.filesOfInterest = criticalFilesOfInterest ?
      criticalFilesOfInterest.concat(filesInterestedInContentChanges) :
      filesInterestedInContentChanges;
    this.dirtyFilesOfInterest = fileListToBackupOnChanges;
    this.serviceUrl = serviceUrl;
    this.action = action;
    this.executedRetries = -1;
    this.consecutiveExecutedRetriesWithoutDiff = -1;
  }

  /** is a (re)try possible? if a result is present, the protocol is at an end and no more calls to execute() should take place */
  executionPossible(): boolean {
    return this.result === undefined;
  }

  /** execute a pull (and if without incident) followed by the action itself */
  async execute(): Promise<void> {
    this.log('trace: execute');
    if (this.executionPossible()) {
      this.log('trace: execute: get http client', this.httpProvider);
      this.httpClient = this.httpClient ? this.httpClient : await this.httpProvider.getHttpClient();
      this.executedRetries++;
      this.log('trace: execute: execute pull');
      const pullResponse = await this.executePull(this.filesOfInterest, this.dirtyFilesOfInterest, this.httpClient);
      this.log('pullResponse', pullResponse);
      if (!pullResponse.failure) {
        this.handlePullResponse(pullResponse);
        if (!this.result) {
          await this.executeAction();
        }
      } else {
        this.log('ERROR: unexpected error during pull, pullresponse:', pullResponse);
        this.result = new Error('pull failure');
      }
    } else {
      throw new Error('procotol usage error. no more executions possible.');
    }
  }

  /** add changes of the pull response to the already kept changes */
  private updateResourcesSets(pullResponse: PullResponse) {
    this.changedResourcesSet = new Set<string>([...Array.from(this.changedResourcesSet), ...pullResponse.changedResources]);
    this.backedUpResourcesSet.add(pullResponse.backedUpResources);
  }

  private updateConsecutiveExecutedRetriesWithoutDiffCounter(pullResponse: PullResponse) {
    if (pullResponse.diffExists) {
      this.consecutiveExecutedRetriesWithoutDiff = 0; // reset counter if a diff is present
    } else {
      this.consecutiveExecutedRetriesWithoutDiff++;
    }
  }

  private hasChangesInCriticalFilesOfInterest(): boolean {
    const changesInCriticalFilesOfInterest = Array.from(this.changedResourcesSet)
      .filter(changedFile => this.criticalFilesOfInterest.find(fileOfInterest => changedFile.startsWith(fileOfInterest)));
    return (changesInCriticalFilesOfInterest.length > 0);
  }

  private handlePullResponse(pullResponse: PullResponse): void {
    this.log('received pull response:', pullResponse);
    this.updateResourcesSets(pullResponse);
    this.updateConsecutiveExecutedRetriesWithoutDiffCounter(pullResponse);
    if (this.hasChangesInCriticalFilesOfInterest()) {
      // pull resulted in diff that touches (at least one) file of interest
      this.result = new Conflict('File touching this action has been changed, please recheck file before retry.');
    }
  }

  private async executeAction(): Promise<void> {
    try {
      this.log('trace: executeAction');
      this.result = await this.action(this.httpClient);
      this.log('action result', this.result);
    } catch (errorResponse) {
      this.log('WARNING: got error on action', errorResponse);
      if (this.isRepullConflict(errorResponse)) {
        if (this.consecutiveExecutedRetriesWithoutDiff > 1) {
          this.log('WARNING: action failed after ' + this.consecutiveExecutedRetriesWithoutDiff
                   + ' consecutive retries (and pulls) without differences');
          this.result = new Error('action failed after ' + this.consecutiveExecutedRetriesWithoutDiff + ' consecutive retries');
        } else {
          this.log('execute pull again, retry number ' + (this.executedRetries + 1));
          this.result = undefined;
        }
      } else {
        this.result = this.getConflictOrError(errorResponse);
      }
    }
  }

  private getConflictOrError(errorResponse: HttpErrorResponse | any): Conflict | Error {
    if (this.isHttpErrorResponse(errorResponse)) {
      if (errorResponse.status === HTTP_STATUS_CONFLICT) {
        return new Conflict(errorResponse.error);
      } else {
        return new Error(errorResponse.error);
      }
    } else {
      return errorResponse;
    }
  }

  private isHttpErrorResponse(response: HttpErrorResponse | any): response is HttpErrorResponse {
    return (<HttpErrorResponse>response).status !== undefined && (<HttpErrorResponse>response).error !== undefined;
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

  private async executePull(nonDirtyFiles: string[], dirtyFiles: string[], httpClient?: HttpClient): Promise<PullResponse> {
    const client = httpClient ? httpClient : await this.httpProvider.getHttpClient();
    try {
      this.log('executing pull with resources:', nonDirtyFiles);
      this.log('..and dirtyResources:', dirtyFiles);
      return (await client.post(`${this.serviceUrl}/workspace/pull`,
                                { resources: nonDirtyFiles, dirtyResources: dirtyFiles },
                                { observe: 'response', responseType: 'json' }).toPromise()).body as PullResponse;
    } catch (errorResponse) {
      // TODO: pull must always work, otherwise the local workspace is in deep trouble
      console.error('could not execute pull', errorResponse);
    }
  }

  private log(msg: String, ...payloads: any[]) {
    if (isDevMode()) {
      console.log('TestNavigator.PullActionProtocol: ' + msg);
      if (payloads) {
        payloads.forEach((payload) => console.log(payload));
      }
    }
  }

}
