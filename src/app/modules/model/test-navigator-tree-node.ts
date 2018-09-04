import { TreeNode } from '@testeditor/testeditor-commons';
import { WorkspaceElement, ElementType } from '../persistence-service/workspace-element';

export class TestNavigatorTreeNode implements TreeNode {
  private static readonly folderCssClass = 'fas fa-folder';
  private static readonly unknownFileCssClass = 'fas fa-question';
  private static readonly extensionToCssClass = {
    'bmp': 'fas fas fa-image', 'png': 'fas fa-image', 'jpg': 'fas fa-image', 'jpeg': 'fas fa-image', 'gif': 'fas fa-image',
    'svg': 'fas fa-image', 'tsl': 'fas fa-file', 'tcl': 'fas fa-file', 'tml': 'fas fa-file', 'config': 'fas fa-file', 'aml': 'fas fa-file'};

  private _children: TestNavigatorTreeNode[];
  collapsedCssClasses = 'fas fa-chevron-right';
  expandedCssClasses = 'fas fa-chevron-down';
  leafCssClasses: string;

  constructor(private workspaceElement: WorkspaceElement) {
    switch (workspaceElement.type) {
      case ElementType.File: this.leafCssClasses = this.leafCssClassesForFile(workspaceElement.name); break;
      case ElementType.Folder: this.leafCssClasses = TestNavigatorTreeNode.folderCssClass;
    }
  }

  get name(): string {
    return this.workspaceElement.name;
  }

  get hover(): string {
    return this.workspaceElement.name;
  }

  get id(): string {
    return this.workspaceElement.path;
  }

  get children(): TreeNode[] {
    if (!this._children) {
      if (this.workspaceElement.children) {
        this._children = this.workspaceElement.children.map((element) => new TestNavigatorTreeNode(element))
          .sort((nodeA, nodeB) => {
            return nodeA.name.localeCompare(nodeB.name);
          });
      } else {
        this._children = [];
      }

    }
    return this._children;
  }

  private leafCssClassesForFile(fileName: string): string {
    let cssClasses = TestNavigatorTreeNode.unknownFileCssClass;

    // get file extension, or empty string if file has no extension
    // https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript#answer-12900504
    const extension = fileName.slice((Math.max(0, fileName.lastIndexOf('.')) || Infinity) + 1);

    if ((extension && TestNavigatorTreeNode.extensionToCssClass[extension])) {
      cssClasses = TestNavigatorTreeNode.extensionToCssClass[extension];
    }

    return cssClasses;
  }

  forEach(callbackfn: (value: TestNavigatorTreeNode) => void) {
    callbackfn(this);
    this.children.forEach((child) => (child as TestNavigatorTreeNode).forEach(callbackfn));
  }
}
