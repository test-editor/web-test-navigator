import { ChangeDetectorRef, Component, isDevMode, OnDestroy, OnInit } from '@angular/core';
import { MessagingService } from '@testeditor/messaging-service';
import { DeleteAction, EmbeddedDeleteButton, IndicatorFieldSetup, InputBoxConfig, TreeNode, TreeViewerConfig, TreeViewerInputBoxConfig,
  TREE_NODE_CREATE_AT_SELECTED, TREE_NODE_DESELECTED, TREE_NODE_RENAME_SELECTED, TREE_NODE_SELECTED } from '@testeditor/testeditor-commons';
import { Subscription } from 'rxjs/Subscription';
import { WORKSPACE_MARKER_UPDATE } from '../event-types';
import { EDITOR_CLOSE, EDITOR_DIRTY_CHANGED, EDITOR_SAVE_COMPLETED, ElementActivity, UserActivityData,
  USER_ACTIVITY_UPDATED } from '../event-types-in';
import { NAVIGATION_CREATED, NAVIGATION_DELETED, NAVIGATION_OPEN, NAVIGATION_RENAMED, SNACKBAR_DISPLAY_NOTIFICATION, TEST_SELECTED,
  WORKSPACE_RETRIEVED, WORKSPACE_RETRIEVED_FAILED } from '../event-types-out';
import { FilterState, FilterType } from '../filter-bar/filter-bar.component';
import { IndexService } from '../index-service/index.service';
import { filterFor, isFileOfType, testNavigatorFilter, validExtensions } from '../model/filters';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { Conflict, isConflict } from '../persistence-service/conflict';
import { PersistenceService } from '../persistence-service/persistence.service';
import { ElementType, WorkspaceElement } from '../persistence-service/workspace-element';
import { TreeFilterService } from '../tree-filter-service/tree-filter.service';
import { ValidationMarkerService } from '../validation-marker-service/validation-marker.service';
import { ValidationMarkerSummary } from '../validation-marker-summary/validation-marker-summary';
import { FilenameValidator } from './filename-validator';
import { SubscriptionMap } from './subscription-map';
import { AtomicUserActivitySet, EMPTY_USER_ACTIVITY_SET } from './user-activity-set';

export type ClipType = 'cut' | 'copy' | null;

@Component({
  selector: 'app-test-navigator',
  templateUrl: './test-navigator.component.html',
  styleUrls: ['./test-navigator.component.css']
})
export class TestNavigatorComponent implements OnInit, OnDestroy {
  static readonly NOTIFICATION_TIMEOUT_MILLIS = 4000;
  private readonly WORKSPACE_LOAD_RETRY_COUNT = 3;

  public refreshClassValue = '';
  public selectedNode: TestNavigatorTreeNode = null;
  public readonly elementTypes = ElementType;

  private nodeClipped: TestNavigatorTreeNode = null;
  private clippedBy: ClipType = null;
  private pasteRunning = false;
  private renameRunning = false;

  private treeSelectionChangeSubscription: Subscription;
  private treeDeselectionChangeSubscription: Subscription;
  private userActivitySubscription: Subscription;
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
    onIconClick: (node: TreeNode) => node.expanded = !node.expanded,
    embeddedButton: (node: TreeNode) => new EmbeddedDeleteButton(
      new DeleteAction(node, (_node: TestNavigatorTreeNode) => this.onDeleteConfirm(_node))),
    indicatorFields: []
  };

  /* get markers that are not visible in the test navigator, since affected files are filtered by the current FilterState */
  getFilteredOutMarkers = (type: FilterType) => {
    let markers = ValidationMarkerSummary.zero;
    if (this.hasActiveFilter && !this.filterState[type]) {
      this.model.forEach((node) => isFileOfType(node.id, type) ? markers = markers.add(node.validation) : {});
    }
    return markers;
  }

  private get hasActiveFilter(): boolean {
    return this.filterState && (this.filterState.aml || this.filterState.tsl || this.filterState.tcl);
  }

  constructor(private filteredTreeService: TreeFilterService,
              private messagingService: MessagingService,
              private indexService: IndexService,
              private filenameValidator: FilenameValidator,
              private persistenceService: PersistenceService,
              private validationMarkerService: ValidationMarkerService,
              private changeDetector: ChangeDetectorRef,
              indicators: IndicatorFieldSetup) {
    this.treeConfig.indicatorFields = indicators.fields;
  }

  ngOnInit() {
    this.updateModel();
    this.setupTreeSelectionChangeListener();
    this.setupUserActivityChangeListener();
    this.persistenceService.startSubscriptions();
  }

  ngOnDestroy(): void {
    this.treeDeselectionChangeSubscription.unsubscribe();
    this.treeSelectionChangeSubscription.unsubscribe();
    this.userActivitySubscription.unsubscribe();
    this.openFilesSubscriptions.clear();
    this.persistenceService.stopSubscriptions();
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

  setupUserActivityChangeListener() {
    this.userActivitySubscription = this.messagingService.subscribe(USER_ACTIVITY_UPDATED, (activities: ElementActivity[]) => {
      const activitiesMap = new Map<string, UserActivityData[]>();
      activities.forEach(elementActivity => {
        if (activitiesMap.has(elementActivity.element)) {
          activitiesMap.set(elementActivity.element, activitiesMap.get(elementActivity.element).concat(elementActivity.activities));
        } else {
          activitiesMap.set(elementActivity.element, elementActivity.activities.slice());
        }
      });

      const treeNodeMap = new Map<string, TestNavigatorTreeNode>();
      this.model.forEach((node) => {
        treeNodeMap.set(node.id, node);
        if (activitiesMap.has(node.id)) {
          node.activities = new AtomicUserActivitySet(activitiesMap.get(node.id));
          activitiesMap.delete(node.id);
        } else {
          node.activities = EMPTY_USER_ACTIVITY_SET;
        }
      });

      activitiesMap.forEach((activity, nodeId) => {
        const pathSegments = nodeId.split('/');
        while (pathSegments.length > 0) {
          pathSegments.pop();
          const ancestorNodeId = pathSegments.join('/');
          if (treeNodeMap.has(ancestorNodeId)) {
            treeNodeMap.get(ancestorNodeId).setDescendantActivity(nodeId, new AtomicUserActivitySet(activitiesMap.get(nodeId)));
            break;
          }
        }
      });
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

  private async retryingListTreeNodes(retryCount: number): Promise<TestNavigatorTreeNode> {
    try {
      const root = (await this.filteredTreeService.listTreeNodes())
        .forEach((node) => (node as TestNavigatorTreeNode).setVisible(testNavigatorFilter(node)));
      root.expanded = true;
      this.updateValidationMarkers(root);
      return root;
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

  public async updateValidationMarkers(root: TestNavigatorTreeNode) {
    await this.indexService.refresh();
    const markers = await this.validationMarkerService.getAllMarkerSummaries();
    this.log('received validation markers from server: ', markers);
    root.forEach((node) => {
        node.validation = markers.has(node.id) ? new ValidationMarkerSummary(markers.get(node.id)) : ValidationMarkerSummary.zero;
    });
    this.changeDetector.detectChanges();
    this.messagingService.publish(WORKSPACE_MARKER_UPDATE, markers);
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
  public refreshRunning(): boolean {
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

  private open(node: TestNavigatorTreeNode) {
    this.openFilesSubscriptions.remove(node);
    this.openFilesSubscriptions.add(node, this.messagingService.subscribe(EDITOR_DIRTY_CHANGED, (payload) => {
      if ((node.id === payload.path) && (node.dirty !== payload.dirty)) {
        this.log('received ' + EDITOR_DIRTY_CHANGED + ' for this node, that changes dirty flag', payload);
        node.dirty = payload.dirty;
        this.changeDetector.detectChanges(); // necessary to trigger rename button updates
      }
    }));
    this.openFilesSubscriptions.add(node, this.messagingService.subscribe(EDITOR_SAVE_COMPLETED, (payload) => {
      this.updateValidationMarkers(this.model);
      // no need to update any dirty markers for renames, since EDITOR_DIRTY_CHANGED will be received, too
    }));
    this.openFilesSubscriptions.add(node, this.messagingService.subscribe(EDITOR_CLOSE, (payload) => {
      if (node.id === payload.path) {
        this.log('received ' + EDITOR_CLOSE + ' for this node', payload);
        node.dirty = false; // no trigger necessary for updates (somehow) (see EDITOR_DIRTY_CHANGED subscription)
      }
    }));

    this.messagingService.publish(NAVIGATION_OPEN, node);
    this.log('published NAVIGATION_OPEN', node);
  }


  /** create a new element within the tree */
  newElement(type: ElementType): void {
    if (this.selectedNode) {
      const contextNode = this.selectedNode;
      const parentNode = contextNode.type === ElementType.Folder ? contextNode : contextNode.parent;
      const payload: TreeViewerInputBoxConfig = {
        root: this.model.root,
        indent: contextNode.type === ElementType.Folder,
        validateName: (newName: string) => this.validateName(newName, type),
        onConfirm: async (newName: string) => {
          const newPath = contextNode.getDirectory() + newName;
          const requestSuccessful = await this.sendCreateRequest(newPath, type);
          if (requestSuccessful) {
            const newNode =  parentNode.addChild({ children: [], name: newName, path: newPath, type: type });
            parentNode.expanded = true;
            // TODO programmatically select newNode
            if (type === ElementType.File) {
              this.open(newNode);
              this.updateValidationMarkers(this.model);
            }
          }
          return requestSuccessful;
        },
        iconCssClasses: type === ElementType.Folder ? 'fa-folder' : 'fa-file'
      };
      this.messagingService.publish(TREE_NODE_CREATE_AT_SELECTED, payload);
    }
  }

  renameElement(): void {
    if (this.selectedNode) {
      this.renameRunning = true;
      const selectedNode = this.selectedNode;
      const payload: InputBoxConfig = {
        root: this.model.root,
        validateName: (newName: string) => this.validateName(newName, selectedNode.type),
        onCancel: (): Promise<void> => {
          this.renameRunning = false;
          return Promise.resolve();
        },
        onConfirm: async (newName: string) => {
          let requestSuccessful = false;
          try {
            const pathElements = selectedNode.id.split('/');
            const newPath = pathElements.slice(0, pathElements.length - 1).join('/') + '/' + newName;
            requestSuccessful = await this.sendRenameRequest(newPath, selectedNode.id);
            if (requestSuccessful) {
              selectedNode.rename(newPath, newName);
              this.updateValidationMarkers(this.model);
            }
          } catch (error) {
            this.log('error during onConfirm in rename request', error);
          }
          this.renameRunning = false;
          return requestSuccessful;
        }
      };
      this.messagingService.publish(TREE_NODE_RENAME_SELECTED, payload);
    }
  }

  private validateName(newName: string, type: ElementType): { valid: boolean, message?: string } {
    let result: { valid: boolean, message?: string } = { valid: true };
    if (!this.filenameValidator.isValidName(newName, type)) {
      result = { valid: false, message: this.filenameValidator.getMessage(newName) };
    }
    if (!filterFor(this.filterState, { type: type, id: newName })) {
      result = { valid: false, message: 'invalid (or currently filtered) file extension (valid extensions:'
                 + validExtensions().join(', ') + ')' };
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

  get renameDisabled(): boolean {
    return this.renameRunning || !this.selectedNode || this.selectedNode === this.selectedNode.root;
  }

  get renameHoverText(): string {
    let result = 'cannot rename: no element selected';
    if (this.selectedNode) {
      if (this.renameRunning) {
        result = 'cannot rename until currently running rename finished';
      } else if (this.selectedNode === this.selectedNode.root) {
        result = 'cannot rename the root element';
      } else {
        result = `rename "${this.selectedNode.name}"`;
      }
    }
    return result;
  }

  select(node: TestNavigatorTreeNode) {
    if (node === null && this.selectedNode) {
      this.messagingService.publish(TREE_NODE_DESELECTED, this.selectedNode);
      this.selectedNode = null;
    } else if (this.model.sameTree(node)) {
      this.selectedNode = node;
      if (node.isTclFile()) {
        this.messagingService.publish(TEST_SELECTED, node);
      }
    }
  }

  collapseAll(): void {
    // TODO: put collapse all on the bus such that the respective tree is collapsed
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

  async onDeleteConfirm(nodeToDelete: TestNavigatorTreeNode): Promise<void> {
    try {
      const result = await this.persistenceService.deleteResource(nodeToDelete.id);
      if (isConflict(result)) {
        this.handleDeleteFailed(result.message);
      } else {
        nodeToDelete.remove();
        this.updateValidationMarkers(this.model);
        this.messagingService.publish(NAVIGATION_DELETED, nodeToDelete);
      }
    } catch (error) {
      this.log(error, nodeToDelete);
      this.handleDeleteFailed('Error while deleting element!');
    }
  }

  handleDeleteFailed(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = null;
    }, 3000);
  }

  cutElement(): void {
    this.nodeClipped = this.selectedNode;
    this.clippedBy = 'cut';
  }

  copyElement(): void {
    this.nodeClipped = this.selectedNode;
    this.clippedBy = 'copy';
  }

  /** create an id that is unique within the children of the target folder) */
  uniqifyTargetId(targetFolder: TestNavigatorTreeNode, source: TestNavigatorTreeNode): string {
    let createdId = targetFolder.id + '/' + source.id.split('/').pop();
    let tailNumber = 0;
    while (targetFolder.findFirst((node) => node.id === createdId) && tailNumber < 9) {
      const tail = createdId.split('.').pop();
      let body = createdId.substring(0, createdId.length - tail.length - 1);
      if (body.substring(body.length - 2).match('_\\d')) {
        tailNumber++;
        body = body.substring(0, body.length - 2);
      }
      createdId = body + '_' + tailNumber + '.' + tail;
    }
    if (targetFolder.findFirst((node) => node.id === createdId)) {
      throw(new Error('Target name \'' + createdId + '\' already exists.'));
    }
    if (!this.filenameValidator.isValidFileName(createdId.split('/').pop())) {
      throw(new Error('Target name \'' + createdId + '\' is an invalid filename.'));
    }

    return createdId;
  }

  private async executeBackendClipping(clippedBy: ClipType, clippedNodeId: string, newPath: string): Promise<string | Conflict> {
    let backendResult;
    switch (clippedBy) {
      case 'copy':
        this.log('calling backend to copy resource ' + clippedNodeId + ' to ' + newPath);
        backendResult = await this.persistenceService.copyResource(newPath, clippedNodeId);
        break;
      case 'cut':
        this.log('calling backend to move resource ' + clippedNodeId + ' to ' + newPath);
        backendResult = await this.persistenceService.renameResource(newPath, clippedNodeId);
        break;
    }
    return backendResult;
  }

  private createNodeFromBackendClippingResult(backendResult: string): WorkspaceElement {
    const rawElement: WorkspaceElement = {
      name: backendResult.split('/').pop(),
      path: backendResult,
      type: ElementType.File,
      children: []
    };
    return rawElement;
  }

  /** currently working only if the clipped element is a file! */
  async pasteElement(): Promise<void> {
    if (!this.pasteDisabled) {
      this.pasteRunning = true;
      try {
        const targetFolder = this.targetFolderForPaste();
        const newPath = this.uniqifyTargetId(targetFolder, this.nodeClipped);
        const backendResult = await this.executeBackendClipping(this.clippedBy, this.nodeClipped.id, newPath);
        if (backendResult instanceof Conflict) {
           this.messagingService.publish(SNACKBAR_DISPLAY_NOTIFICATION, { message: 'ERROR during paste: ' + backendResult.message });
        } else {
          this.messagingService.publish(SNACKBAR_DISPLAY_NOTIFICATION, { message: 'pasted into ' + backendResult });
          const rawElement = this.createNodeFromBackendClippingResult(backendResult);
          this.log('adding child to target folder', rawElement);
          targetFolder.addChild(rawElement);
          if (this.clippedBy === 'cut') {
            this.nodeClipped.remove();
          }
          this.nodeClipped = null;
          this.clippedBy = null;
        }
      } catch (error) {
        this.messagingService.publish(SNACKBAR_DISPLAY_NOTIFICATION, { message: 'ERROR pasting: ' + error });
      }
      this.pasteRunning = false;
    }
  }

  get cutDisabled(): boolean {
    return !(this.selectedNode && this.selectedNode.type === ElementType.File);
  }

  get copyDisabled(): boolean {
    return !(this.selectedNode && this.selectedNode.type === ElementType.File);
  }

  get pasteDisabled(): boolean {
    return this.pasteRunning ||
      !(this.nodeClipped && this.nodeClipped.type === ElementType.File
             && this.selectedNode
             && (this.clippedBy === 'copy'
                 || (this.clippedBy === 'cut' && this.nodeClipped.parent !== this.targetFolderForPaste())));
  }

  targetFolderForPaste(): TestNavigatorTreeNode {
    if (this.selectedNode) {
      return this.selectedNode.type === ElementType.Folder ? this.selectedNode : this.selectedNode.parent;
    } else {
      return null;
    }
  }

  hasCuttedNodeInClipboard(): boolean {
    return this.nodeClipped !== null && this.clippedBy === 'cut';
  }

  hasCopiedNodeInClipboard(): boolean {
    return this.nodeClipped !== null && this.clippedBy === 'copy';
  }

}
