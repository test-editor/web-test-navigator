import { Injectable } from '@angular/core';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { PersistenceService } from '../persistence-service/persistence.service';
import { WorkspaceElement } from '../persistence-service/workspace-element';

@Injectable()
export class TreeFilterService {
  private static readonly ROOT_PATH = 'src/test/java';

  constructor(private persistenceService: PersistenceService) { }

  async listTreeNodes(): Promise<TestNavigatorTreeNode> {
    return this.persistenceService.listFiles().then(
      (root) => {
        const testNavigatorRoot = new TestNavigatorTreeNode(
          this.findFirst(root, (element) => element.path === TreeFilterService.ROOT_PATH));
        testNavigatorRoot.name = 'Workspace';
        return testNavigatorRoot;
      });
  }

  private findFirst(root: WorkspaceElement, condition: (element: WorkspaceElement) => boolean): WorkspaceElement {
    let result: WorkspaceElement = null;
    if (condition(root)) {
      result = root;
    } else {
      for (const child of root.children) {
        result = this.findFirst(child, condition);
        if (result !== null) {
          break;
        }
      }
    }
    return result;
  }

}
