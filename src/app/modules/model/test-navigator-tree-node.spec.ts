import { TestNavigatorTreeNode } from './test-navigator-tree-node';
import { ElementType, WorkspaceElement } from '../persistence-service/workspace-element';

describe('TestNavigatorTreeNode', () => {
  it('should create an instance', () => {
    expect(new TestNavigatorTreeNode({name: 'anElement', path: 'path/to/anElement', type: ElementType.File, children: []})).toBeTruthy();
  });

  it('should properly fill TestNavigatorTreeNode fields', () => {
    // given
    const workspaceTree: WorkspaceElement = {
      name: 'root',
      path: 'path/to/root',
      type: ElementType.Folder,
      children: []
    };

    // when
    const actualTreeNode = new TestNavigatorTreeNode(workspaceTree);

    // then
    expect(actualTreeNode.collapsedCssClasses).toEqual('fas fa-chevron-right');
    expect(actualTreeNode.children.length).toEqual(0);
    expect(actualTreeNode.expandedCssClasses).toEqual('fas fa-chevron-down');
    expect(actualTreeNode.hover).toEqual(workspaceTree.name);
    expect(actualTreeNode.id).toEqual(workspaceTree.path);
    expect(actualTreeNode.leafCssClasses).toEqual('fas fa-folder');
    expect(actualTreeNode.name).toEqual(workspaceTree.name);
  });

  it('should recurse into children', () => {
    // given
    const workspaceTree: WorkspaceElement = {
      name: 'root',
      path: 'path/to/root',
      type: ElementType.Folder,
      children: [{
        name: 'child',
        path: 'path/to/root/child',
        type: ElementType.File,
        children: []
      }]
    };

    // when
    const actualTreeNode = new TestNavigatorTreeNode(workspaceTree);

    // then
    expect(actualTreeNode.children).toBeTruthy();
    expect(actualTreeNode.children.length).toEqual(1);
    expect(actualTreeNode.children[0].name).toEqual(workspaceTree.children[0].name);
    expect(actualTreeNode.children[0].id).toEqual(workspaceTree.children[0].path);
  });
});
