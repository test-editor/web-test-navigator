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

  it('can be iterated in depth-first, pre-order traversal fashion, with elements of the same depth being sorted alphabetically', () => {
    // given
    const treeNode = new TestNavigatorTreeNode (
      { name: 'root', path: 'path/to/root', type: ElementType.Folder, children: [
        { name: 'child', path: 'path/to/root/child', type: ElementType.File, children: [] },
        { name: 'subDir', path: 'path/to/root/subDir', type: ElementType.Folder, children: [
          { name: 'grandChild', path: 'path/to/root/subDir/grandChild', type: ElementType.File, children: [] },
        ]},
        { name: 'anotherChild', path: 'path/to/root/anotherChild', type: ElementType.File, children: [] },
      ]}
    );
    const actualNames = [];

    // when
    treeNode.forEach((node) => actualNames.push(node.name));

    // then
    expect(actualNames).toEqual(['root', 'anotherChild', 'child', 'subDir', 'grandChild' ]);
  });

});
