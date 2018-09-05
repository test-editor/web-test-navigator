import { Injectable } from '@angular/core';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { PersistenceService } from '../persistence-service/persistence.service';

@Injectable()
export class TreeFilterService {
  private static readonly ROOT_PATH = 'src/test/java';

  constructor(private persistenceService: PersistenceService) { }

  async listTreeNodes(): Promise<TestNavigatorTreeNode> {
    return this.persistenceService.listFiles().then((root) =>
      new TestNavigatorTreeNode(root)
      .findFirst((node) => (node as TestNavigatorTreeNode).id === TreeFilterService.ROOT_PATH)
    );
  }


}
