import { Injectable } from '@angular/core';
import { PersistenceService } from '../persistence-service/persistence.service';
import { WorkspaceElement } from '../persistence-service/workspace-element';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';

@Injectable()
export class TreeFilterService {

  constructor(private persistenceService: PersistenceService) { }

  async listTestFiles(): Promise<TestNavigatorTreeNode> {
    return this.persistenceService.listFiles().then((root) => new TestNavigatorTreeNode(root));
  }
}
