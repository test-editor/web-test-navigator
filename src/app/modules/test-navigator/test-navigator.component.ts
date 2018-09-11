import { Component, isDevMode, OnDestroy, OnInit } from '@angular/core';
import { MessagingService } from '@testeditor/messaging-service';
import { TreeNode, TreeViewerConfig } from '@testeditor/testeditor-commons';
import { testNavigatorFilter, filterFor } from '../model/filters';
import { Subscription } from 'rxjs/Subscription';
import { EDITOR_SAVE_COMPLETED } from '../event-types-in';
import { WORKSPACE_RETRIEVED, WORKSPACE_RETRIEVED_FAILED } from '../event-types-out';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { FilterState } from '../filter-bar/filter-bar.component';

@Component({
  selector: 'app-test-navigator',
  templateUrl: './test-navigator.component.html',
  styleUrls: ['./test-navigator.component.css']
})
export class TestNavigatorComponent implements OnInit, OnDestroy {
  private readonly WORKSPACE_LOAD_RETRY_COUNT = 3;
  private fileSavedSubscription: Subscription;
  public refreshClassValue  = '';

  model: TestNavigatorTreeNode;
  treeConfig: TreeViewerConfig = {
    onClick: () => null,
    onDoubleClick: (node: TreeNode) => node.expanded = !node.expanded,
    onIconClick: (node: TreeNode) => node.expanded = !node.expanded
  };

  constructor(private filteredTreeService: TreeFilterService, private messagingService: MessagingService) { }

  ngOnInit() {
    this.updateModel();
    this.setupRepoChangeListeners();
  }

  ngOnDestroy(): void {
    this.fileSavedSubscription.unsubscribe();
  }

  async updateModel(): Promise<void> {
    console.log('retrieving test file tree...');
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
          console.log('retry (re)load of workspace after failure');
        }
        return this.retryingListTreeNodes(retryCount - 1);
      } else {
        throw error;
      }
    }
  }

  // private reloadWorkspace(): void {
  //   this.indexService.reload().then(() => { this.retryingListTreeNodes(WORKSPACE_LOAD_RETRY_COUNT); });
  // }

  private refreshIndex(): void {
    // this.indexService.refresh().then(() => { this.updateModel(); });
  }

  /** create a new element within the tree
    */
  newElement(type: string): void {
    // this.workspace.newElement(type);
    // this.changeDetectorRef.detectChanges();
  }

  /** controls availability of test execution button
    */
  selectionIsExecutable(): boolean {
    return false;
  }

  refreshRunning(): boolean {
    return this.refreshClassValue !== '';
  }

  collapseAll(): void {
  }

  async refresh(): Promise<void> {
    if (!this.refreshRunning()) {
      this.refreshClassValue = 'fa-spin';
      await this.updateModel();
      this.refreshClassValue = '';
    }
  }

}
