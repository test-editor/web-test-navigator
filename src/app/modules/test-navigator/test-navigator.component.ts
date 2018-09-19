import { Component, isDevMode, OnDestroy, OnInit } from '@angular/core';
import { MessagingService } from '@testeditor/messaging-service';
import { InputBoxConfig, TreeNode, TreeViewerConfig, TreeViewerInputBoxConfig,
  TREE_NODE_CREATE_AT_SELECTED, TREE_NODE_DESELECTED, TREE_NODE_RENAME_SELECTED, TREE_NODE_SELECTED } from '@testeditor/testeditor-commons';
import { Subscription } from 'rxjs/Subscription';
import { EDITOR_DIRTY_CHANGED, EDITOR_SAVE_COMPLETED, TEST_EXECUTION_STARTED, TEST_EXECUTION_START_FAILED } from '../event-types-in';
import { NAVIGATION_CREATED, NAVIGATION_OPEN, NAVIGATION_RENAMED,
  TEST_EXECUTE_REQUEST, WORKSPACE_RETRIEVED, WORKSPACE_RETRIEVED_FAILED } from '../event-types-out';
import { FilterState } from '../filter-bar/filter-bar.component';
import { IndexService } from '../index-service/index.service';
import { filterFor, testNavigatorFilter } from '../model/filters';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { isConflict } from '../persistence-service/conflict';
import { PersistenceService } from '../persistence-service/persistence.service';
import { ElementType } from '../persistence-service/workspace-element';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { PathValidator } from './path-validator';
import { SubscriptionMap } from './subscription-map';

@Component({
  selector: 'app-test-navigator',
  templateUrl: './test-navigator.component.html',
  styleUrls: ['./test-navigator.component.css']
})
export class TestNavigatorComponent implements OnInit, OnDestroy {
  static readonly NOTIFICATION_TIMEOUT_MILLIS = 4000;
  private readonly WORKSPACE_LOAD_RETRY_COUNT = 3;
  private fileSavedSubscription: Subscription;
  public refreshClassValue  = '';
  private selectedNode: TestNavigatorTreeNode = null;
  private treeSelectionChangeSubscription: Subscription;
  private treeDeselectionChangeSubscription: Subscription;
  private testExecutionSubscription: Subscription;
  private testExecutionFailedSubscription: Subscription;
  private openFilesSubscriptions = new SubscriptionMap<TestNavigatorTreeNode>();
  errorMessage: string;
  notification: string;

  model: TestNavigatorTreeNode;
  filterState: FilterState = { aml: false, tcl: false, tsl: false };
  treeConfig: TreeViewerConfig = {
    onClick: () => null,
    onDoubleClick: (node: TreeNode) => {
      const testNavNode = (node as TestNavigatorTreeNode);
      if (testNavNode.type === ElementType.Folder) {
        node.expanded = !node.expanded;
      } else {
        this.open(testNavNode);
      }
    },
    onIconClick: (node: TreeNode) => node.expanded = !node.expanded
  };

  constructor(private filteredTreeService: TreeFilterService,
              private messagingService: MessagingService,
              private indexService: IndexService,
              private pathValidator: PathValidator,
              private persistenceService: PersistenceService) {
  }

  ngOnInit() {
    this.updateModel();
    this.setupRepoChangeListeners();
    this.setupTreeSelectionChangeListener();
    this.setupTestExecutionListener();
  }

  ngOnDestroy(): void {
    this.fileSavedSubscription.unsubscribe();
    this.treeDeselectionChangeSubscription.unsubscribe();
    this.treeSelectionChangeSubscription.unsubscribe();
    this.testExecutionSubscription.unsubscribe();
    this.testExecutionFailedSubscription.unsubscribe();
    this.openFilesSubscriptions.clear();
  }

  private setupTestExecutionListener(): void {
    this.testExecutionSubscription = this.messagingService.subscribe(TEST_EXECUTION_STARTED, payload => {
      this.log('received TEST_EXECUTION_STARTED', payload);
      this.showNotification(payload.message, payload.path);
    });
    this.testExecutionFailedSubscription = this.messagingService.subscribe(TEST_EXECUTION_START_FAILED, payload => {
      this.log('received TEST_EXECUTION_START_FAILED', payload);
      this.showErrorMessage(payload.message, payload.path);
    });
  }

  private setupTreeSelectionChangeListener() {
    this.treeSelectionChangeSubscription = this.messagingService.subscribe(TREE_NODE_SELECTED, (node) => {
      this.log('received TREE_NODE_SELECTED', node);
      this.select(node);
    });

    this.treeDeselectionChangeSubscription = this.messagingService.subscribe(TREE_NODE_DESELECTED, (node) => {
      this.log('received TREE_NODE_DESELECTED', node);
      if (node === this.selectedNode) {
        this.selectedNode = null;
      }
    });
  }

  async updateModel(): Promise<void> {
    this.log('retrieving test file tree...');
    try {
      this.model = await this.retryingListTreeNodes(this.WORKSPACE_LOAD_RETRY_COUNT);
      this.messagingService.publish(WORKSPACE_RETRIEVED, this.model.name);
    } catch (error) {
      this.messagingService.publish(WORKSPACE_RETRIEVED_FAILED, error);
      if (isDevMode()) {
        console.error('failed to load workspace');
      }
    }
  }

  onFiltersChanged(state: FilterState) {
    this.filterState = state;
    this.model.forEach((node) => (node as TestNavigatorTreeNode).setVisible(filterFor(state, node)));
  }

/**
   * listen to events that changed the repository (currently only editor save completed events)
   * inform index to refresh itself
   */
  private setupRepoChangeListeners(): void {
    this.fileSavedSubscription = this.messagingService.subscribe(EDITOR_SAVE_COMPLETED, () => {
      this.refreshIndex();
    });
  }

  private async retryingListTreeNodes (retryCount: number): Promise<TestNavigatorTreeNode> {
    try {
      const root = (await this.filteredTreeService.listTreeNodes())
      .forEach((node) => (node as TestNavigatorTreeNode).setVisible(testNavigatorFilter(node)) );
      root.expanded = true;
      return root;
      // this.updateValidationMarkers(root);
    } catch (error) {
      // TODO: prevent errors! keep connection to backend, as long as the list files service is running (in the backend) show the spinner!
      if (retryCount > 0) {
        if (isDevMode()) {
          this.log('retry (re)load of workspace after failure');
        }
        return this.retryingListTreeNodes(retryCount - 1);
      } else {
        throw error;
      }
    }
  }

  /** called by button bar to completely load the index anew and load the workspace thereafter */
  async refreshWorkspace(): Promise<void> {
    if (!this.refreshRunning()) {
      this.setRefreshRunning(true);
      await this.reloadWorkspace();
      this.setRefreshRunning(false);
    }
  }

  /** currently running a refresh ? */
  private refreshRunning(): boolean {
    return this.refreshClassValue !== '';
  }

  /** set the refresh running status */
  private setRefreshRunning(setRunning: boolean) {
    if (setRunning) {
      this.refreshClassValue = 'fa-spin';
    } else {
      this.refreshClassValue = '';
    }
  }

  /** completely load the index anew and load the workspace thereafter */
  private async reloadWorkspace(): Promise<void> {
    await this.indexService.reload();
    await this.updateModel();
  }

  /** update the index (with delta from repo if available) and load the workspace thereafter */
  private async refreshIndex(): Promise<void> {
    await this.indexService.refresh();
    await this.updateModel();
  }

  private open(node: TestNavigatorTreeNode) {
    this.openFilesSubscriptions.remove(node);
    this.openFilesSubscriptions.add(node, this.messagingService.subscribe(EDITOR_DIRTY_CHANGED, (payload) => {
      if (node.id === payload.path) {
        node.dirty = payload.dirty;
      }
    }));

    this.messagingService.publish(NAVIGATION_OPEN, node);
    this.log('published NAVIGATION_OPEN', node);
  }


  /** create a new element within the tree */
  newElement(type: ElementType): void {
    const contextNode = this.selectedNode;
    const parentNode = contextNode.type === ElementType.Folder ? contextNode : contextNode.parent;
    const payload: TreeViewerInputBoxConfig = {
      indent: contextNode.type === ElementType.Folder,
      validateName: (newName: string) => this.validateName(newName, type),
      onConfirm: async (newName: string) => {
        const newPath = contextNode.getDirectory() + newName;
        const requestSuccessful = await this.sendCreateRequest(newPath, type);
        if (requestSuccessful) {
          /* const newNode = */ parentNode.addChild({children: [], name: newName, path: newPath, type: type });
          parentNode.expanded = true;
          // TODO programmatically select newNode
          if (type === ElementType.File) {
            this.messagingService.publish(NAVIGATION_OPEN, { name: newName, id: newPath });
          }
        }
        return requestSuccessful;
      },
      iconCssClasses: type === ElementType.Folder ? 'fa-folder' : 'fa-file'
    };
    this.messagingService.publish(TREE_NODE_CREATE_AT_SELECTED, payload);
  }

  renameElement(): void {
    const selectedNode = this.selectedNode;
    const payload: InputBoxConfig = {
      validateName: (newName: string) => this.selectedNode.dirty ?
        { valid: false, message: 'cannot rename dirty files' } : this.validateName(newName, selectedNode.type),
      onConfirm: async (newName: string) => {
        const pathElements = selectedNode.id.split('/');
        const newPath = pathElements.slice(0, pathElements.length - 1).join('/') + '/' + newName;
        const requestSuccessful = await this.sendRenameRequest(newPath, selectedNode.id);
        if (requestSuccessful) {
          selectedNode.rename(newPath, newName);
        }
        return requestSuccessful;
      }
    };
    this.messagingService.publish(TREE_NODE_RENAME_SELECTED, payload);
  }

  private validateName(newName: string, type: ElementType): { valid: boolean, message?: string } {
    let result: { valid: boolean, message?: string } = { valid: true };
    if (!this.pathValidator.isValid(newName)) {
      result = { valid: false, message: this.pathValidator.getMessage(newName) };
    }
    if (!filterFor(this.filterState, {type: type, id: newName})) {
      result = { valid: false, message: 'invalid (or currently filtered) file extension' };
    }
    return result;
  }

  private async sendCreateRequest(newPath: string, type: ElementType): Promise<boolean> {
    let result = false;
    try {
      const response = await this.persistenceService.createResource(newPath, type);
      let createdPath: string;
      if (isConflict(response)) {
        this.errorMessage = response.message;
        createdPath = newPath;
      } else {
        createdPath = response;
        result = true;
      }
      this.messagingService.publish(NAVIGATION_CREATED, { path: createdPath });
    } catch (error) {
      this.log(error, [newPath, type]);
    }
    return result;
  }

  private async sendRenameRequest(newPath: string, oldPath: string): Promise<boolean> {
    let result = false;
    try {
      const response = await this.persistenceService.renameResource(newPath, oldPath);
      let resultPath: string;
      if (isConflict(response)) {
        this.errorMessage = response.message;
        resultPath = oldPath;
      } else {
        resultPath = response;
        result = true;
      }
      this.messagingService.publish(NAVIGATION_RENAMED, { newPath: resultPath, oldPath: oldPath });
    } catch (error) {
      this.log(error, [oldPath, newPath]);
    }
    return result;
  }

  /** controls availability of test execution button */
  selectionIsExecutable(): boolean {
    return this.selectedNode && this.selectedNode.isTclFile();
  }

  select(node: TestNavigatorTreeNode) {
    if (this.model.sameTree(node)) {
      this.selectedNode = node;
    }
  }

  collapseAll(): void {
    // TODO: put collapse all on the bus such that the respective tree is collapsed
  }

  run(): void {
    if (this.selectionIsExecutable()) {
      this.messagingService.publish(TEST_EXECUTE_REQUEST, this.selectedNode.id);
    } else {
      this.log('WARNING: trying to execute test, but no test case file is selected.');
    }
  }

  hideNotification(): void {
    this.notification = null;
  }

  showNotification(notification: string, path: string): void {
    this.notification = notification.replace('\${}', path);
    setTimeout(() => { this.hideNotification(); }, TestNavigatorComponent.NOTIFICATION_TIMEOUT_MILLIS);
  }

  showErrorMessage(errorMessage: string, path: string): void {
    this.errorMessage = errorMessage.replace('\${}', path);
        setTimeout(() => {
          this.errorMessage = null;
        }, TestNavigatorComponent.NOTIFICATION_TIMEOUT_MILLIS);
  }

  private log(msg: String, payload?) {
    if (isDevMode()) {
      console.log('TestNavigatorComponent: ' + msg);
      if (payload !== undefined) {
        console.log(payload);
      }
    }
  }

}
