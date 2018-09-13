import { Component, isDevMode, OnDestroy, OnInit } from '@angular/core';
import { MessagingService } from '@testeditor/messaging-service';
import { NewElementConfig, TreeNode, TreeViewerConfig,
  TREE_NODE_CREATE_AT_SELECTED, TREE_NODE_DESELECTED, TREE_NODE_SELECTED } from '@testeditor/testeditor-commons';
import { Subscription } from 'rxjs/Subscription';
import { EDITOR_SAVE_COMPLETED, TEST_EXECUTION_STARTED, TEST_EXECUTION_START_FAILED } from '../event-types-in';
import { NAVIGATION_CREATED, NAVIGATION_OPEN, TEST_EXECUTE_REQUEST,
  WORKSPACE_RETRIEVED, WORKSPACE_RETRIEVED_FAILED } from '../event-types-out';
import { FilterState } from '../filter-bar/filter-bar.component';
import { IndexService } from '../index-service/index.service';
import { filterFor, testNavigatorFilter } from '../model/filters';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { isConflict } from '../persistence-service/conflict';
import { PersistenceService } from '../persistence-service/persistence.service';
import { ElementType } from '../persistence-service/workspace-element';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { PathValidator } from './path-validator';

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
  errorMessage: string;
  notification: string;

  model: TestNavigatorTreeNode;
  treeConfig: TreeViewerConfig = {
    onClick: () => null,
    onDoubleClick: (node: TreeNode) => {
      const testNavNode = (node as TestNavigatorTreeNode);
      if (testNavNode.type === ElementType.Folder) {
        node.expanded = !node.expanded;
      } else {
        this.messagingService.publish(NAVIGATION_OPEN, node);
        this.log('published NAVIGATION_OPEN', node);
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

  /** create a new element within the tree */
  newElement(type: string): void {
    const payload: NewElementConfig = {
      indent: this.selectedNode.type === ElementType.Folder,
      validateName: (newName: string) => {
        let result: { valid: boolean, message?: string } = { valid: true };
        if (!this.pathValidator.isValid(newName)) {
          result = { valid: false, message: this.pathValidator.getMessage(newName) };
        }
        return result;
      },
      createNewElement: (newName: string) => this.sendCreateRequest(this.selectedNode.getDirectory() + newName, type),
      iconCssClasses: type === ElementType.Folder ? 'fa-folder' : 'fa-file'
    };
    this.messagingService.publish(TREE_NODE_CREATE_AT_SELECTED, payload);
  }

  private async sendCreateRequest(newPath: string, type: string): Promise<boolean> {
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
