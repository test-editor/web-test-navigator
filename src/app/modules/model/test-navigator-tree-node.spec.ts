import { ElementType, WorkspaceElement } from '../persistence-service/workspace-element';
import { TestNavigatorTreeNode } from './test-navigator-tree-node';

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

  it('returns the subtree matching the given condition', () => {
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

    // when
    const actualSubTree = treeNode.findFirst((node) => node.id === 'path/to/root/subDir');

    // then
    expect(actualSubTree.id).toEqual('path/to/root/subDir');
    expect(actualSubTree.children[0].id).toEqual('path/to/root/subDir/grandChild');
  });

  it('returns the first matching subtree (depth-first, pre-order, same-depth elements sorted alphabetically)', () => {
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

    // when
    const actualSubTree = treeNode.findFirst((node) => node.children.length === 0);

    // then
    expect(actualSubTree.id).toEqual('path/to/root/anotherChild');
  });

  it('adds the "hidden" css class when calling show(false)', () => {
    // given
    const treeNode = new TestNavigatorTreeNode({ name: 'root', path: 'path/to/root', type: ElementType.Folder, children: []});

    // when
    treeNode.setVisible(false);

    // then
    expect(treeNode.cssClasses).toContain('hidden');

  });

  it('does not add the "hidden" css class more than once when repeatedly calling show(false)', () => {
    // given
    const treeNode = new TestNavigatorTreeNode({ name: 'root', path: 'path/to/root', type: ElementType.Folder, children: []});

    // when
    treeNode.setVisible(false);
    treeNode.setVisible(false);

    // then
    expect(treeNode.cssClasses.match(/hidden/g).length).toEqual(1);

  });

  it('removes (all occurences of) the "hidden" css class when calling show(true)', () => {
    // given
    const treeNode = new TestNavigatorTreeNode({ name: 'root', path: 'path/to/root', type: ElementType.Folder, children: []});
    treeNode.cssClasses = 'aCssClass hidden anotherClass hidden';

    // when
    treeNode.setVisible(true);

    // then
    expect(treeNode.cssClasses).not.toContain('hidden');
    expect(treeNode.cssClasses).toContain('aCssClass');
    expect(treeNode.cssClasses).toContain('anotherClass');
  });

  it('returns an empty array when retrieving children, if the backing workspace element has none', () => {
    // given
    const treeNode = new TestNavigatorTreeNode({ name: 'root', path: 'path/to/root', type: ElementType.Folder, children: undefined});

    // when
    const actualChildren = treeNode.children;

    // then
    expect(actualChildren).toEqual([]);
  });

});
