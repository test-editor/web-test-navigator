import { isDevMode } from '@angular/core';
import { TreeNode } from '@testeditor/testeditor-commons';
import { ElementType, WorkspaceElement } from '../persistence-service/workspace-element';
import { CompositeUserActivitySet, EMPTY_USER_ACTIVITY_SET, UserActivitySet } from '../test-navigator/user-activity-set';
import { ValidationMarkerSummary } from '../validation-marker-summary/validation-marker-summary';

export class TestNavigatorTreeNode implements TreeNode {
  private static readonly hideCssClass = 'hidden';
  private static readonly folderCssClass = 'fas fa-folder';
  private static readonly unknownFileCssClass = 'fas fa-question';
  private static readonly extensionToCssClass = {
    'bmp': 'fas fas fa-image', 'png': 'fas fa-image', 'jpg': 'fas fa-image',
    'jpeg': 'fas fa-image', 'gif': 'fas fa-image', 'svg': 'fas fa-image',
    'tsl': 'fas fa-file tsl-file-color', 'tcl': 'fas fa-file tcl-file-color', 'tml': 'fas fa-file tcl-file-color',
    'config': 'fas fa-file tcl-file-color', 'aml': 'fas fa-file aml-file-color'
  };

  private _activities = new CompositeUserActivitySet();
  private _children: TestNavigatorTreeNode[];
  private _validation = ValidationMarkerSummary.zero;
  collapsedCssClasses = 'fas fa-chevron-right';
  expandedCssClasses = 'fas fa-chevron-down';
  cssClasses = '';
  expanded = undefined;
  parent: TestNavigatorTreeNode;
  dirty = false;


  constructor(private workspaceElement: WorkspaceElement, parent?: TestNavigatorTreeNode) {
    if (workspaceElement.type === ElementType.Folder) {
      this.expanded = false;
    }
    if (parent === undefined) {
      this.parent = null;
    } else {
      this.parent = parent;
    }
    this._activities.set(this.id, EMPTY_USER_ACTIVITY_SET);
  }

  setVisible(showNotHide: boolean): void {
    if (this.isFiltered() === showNotHide) {
      if (showNotHide) {
        this.cssClasses = this.removeFromCssClasses(this.cssClasses, TestNavigatorTreeNode.hideCssClass);
        if (this.parent) {
          this.parent.updateValidation(this._validation);
        }
      } else {
        this.cssClasses = this.addToCssClasses(this.cssClasses, TestNavigatorTreeNode.hideCssClass);
        if (this.parent) {
          this.parent.updateValidation(this._validation.negate());
        }
      }
    }
  }

  isFiltered(): boolean {
    return this.cssClasses.includes(TestNavigatorTreeNode.hideCssClass);
  }

  private removeFromCssClasses(cssClasses: string, classToRemove: string): string {
    const cssClassesArray = cssClasses.trim().split(/\s+/);
    return cssClassesArray.filter((cls) => cls !== classToRemove).join(' ');
  }

  private addToCssClasses(cssClasses: string, classToAdd: string): string {
    const cssClassesArray = cssClasses.trim().split(/\s+/);
    return cssClassesArray.find((element) => element === classToAdd) ? cssClasses : cssClassesArray.concat(classToAdd).join(' ');
  }

  get name(): string {
    return this.workspaceElement.name;
  }

  set name(displayName: string) {
    this.workspaceElement.name = displayName;
  }

  get type(): ElementType {
    return this.workspaceElement.type;
  }

  get hover(): string {
    return this.workspaceElement.name;
  }

  get id(): string {
    return this.workspaceElement.path;
  }

  get activities(): UserActivitySet {
    return this._activities;
  }

  set activities(value: UserActivitySet) {
      this.updateParentActivities(this.id, value);
  }

  private updateParentActivities(element: string, uaSet: UserActivitySet) {
    this._activities.set(element, uaSet);
    if (this.parent && !this.isFiltered()) {
      this.parent.updateParentActivities(element, uaSet);
    }
  }

  get validation(): ValidationMarkerSummary {
    return this._validation;
  }

  set validation(value: ValidationMarkerSummary) {
    if (this.type === ElementType.File) {
      const difference = value.subtract(this._validation);
      this._validation = value;
      if (this.parent && !this.isFiltered()) {
        this.parent.updateValidation(difference);
      }
    }
  }

  private updateValidation(difference: ValidationMarkerSummary) {
    this._validation = this._validation.add(difference);
    if (this.parent) {
      this.parent.updateValidation(difference);
    }
  }

  get root(): TestNavigatorTreeNode {
    return this.parent ? this.parent.root : this;
  }

  get children(): TestNavigatorTreeNode[] {
    if (!this._children) {
      if (this.workspaceElement.children) {
        this._children = this.workspaceElement.children.map((element) => new TestNavigatorTreeNode(element, this))
          .sort((nodeA, nodeB) => {
            return nodeA.name.localeCompare(nodeB.name);
          });
      } else {
        this._children = [];
      }

    }
    return this._children;
  }

  addChild(rawElement: WorkspaceElement): TestNavigatorTreeNode {
    this.workspaceElement.children.push(rawElement);
    let newNode: TestNavigatorTreeNode;
    if (this._children) {
      newNode = new TestNavigatorTreeNode(rawElement, this);
      this._children.push(newNode);
      this._children.sort((nodeA, nodeB) => nodeA.name.localeCompare(nodeB.name));
    } else {
      newNode = this.children.find((node) => node.id === rawElement.path);
    }
    return newNode;
  }

  /**
   * removes this node from its parent
   */
  remove() {
    if (this.parent) {
      this.parent.removeChild(this);
      if (!this.isFiltered()) {
        this.parent.updateValidation(this._validation.negate());
      }
    } else {
      this.log('ERROR: cannot remove root element');
    }
  }

  log(message: string, payload?: any) {
    if (isDevMode()) {
      console.log(message);
      if (payload !== undefined) {
        console.log(payload);
      }
    }
  }

  removeChild(child: TestNavigatorTreeNode) {
    if (this._children) {
      this._children.splice(this._children.indexOf(child), 1);
    }
    this.workspaceElement.children.splice(this.workspaceElement.children.indexOf(child.workspaceElement), 1);
  }

  get leafCssClasses(): string {
    let cssClasses = TestNavigatorTreeNode.unknownFileCssClass;
    if (this.workspaceElement.type === ElementType.Folder) {
      cssClasses = TestNavigatorTreeNode.folderCssClass;
    } else {
      // get file extension, or empty string if file has no extension
      // https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript#answer-12900504
      const extension = this.id.slice((Math.max(0, this.id.lastIndexOf('.')) || Infinity) + 1);
      if ((extension && TestNavigatorTreeNode.extensionToCssClass[extension])) {
        cssClasses = TestNavigatorTreeNode.extensionToCssClass[extension];
      }
    }
    return cssClasses;
  }

  forEach(callbackfn: (value: TestNavigatorTreeNode) => void): TestNavigatorTreeNode {
    callbackfn(this);
    this.children.forEach((child) => (child as TestNavigatorTreeNode).forEach(callbackfn));
    return this;
  }

  findFirst(condition: (element: TestNavigatorTreeNode) => boolean): TestNavigatorTreeNode {
    let result: TestNavigatorTreeNode = null;
    if (condition(this)) {
      result = this;
    } else {
      for (const child of this.children) {
        result = (child as TestNavigatorTreeNode).findFirst(condition);
        if (result !== null) {
          break;
        }
      }
    }
    return result;
  }

  /** do these two nodes share the same root, are part of the same tree
      note: could be pushed down to commons (TreeNode is an interface, though) */
  public sameTree(other: TreeNode): boolean {
    return this.root === other.root;
  }

  /** is this node a regular tcl file? */
  public isTclFile() {
    return (this.type === ElementType.File && this.id.toUpperCase().endsWith('.TCL'));
  }

  public rename(newPath: string, newName: string) {
    this.workspaceElement.path = newPath;
    this.workspaceElement.name = newName;
  }

  public getDirectory(): string {
    if (this.type === ElementType.Folder) {
      return this.endWithSlash(this.id);
    } else if (this.type === ElementType.File) {
      const split = this.id.split('/');
      split.pop();
      const parentPath = split.join('/');
      return this.endWithSlash(parentPath);
    }
    throw new Error('Invalid element type: ' + this.type);
  }

  private endWithSlash(path: string) {
    return path.endsWith('/') ? path : path + '/';
  }
}
