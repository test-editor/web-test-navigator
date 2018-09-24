import { ElementType, WorkspaceElement } from '../persistence-service/workspace-element';
import { TestNavigatorTreeNode } from './test-navigator-tree-node';
import { forEach } from '@testeditor/testeditor-commons';
import { ValidationMarkerSummary } from '../validation-marker-summary/validation-marker-summary';

describe('TestNavigatorTreeNode', () => {
  it('should create an instance', () => {
    expect(new TestNavigatorTreeNode(
      {name: 'anElement', path: 'path/to/anElement', type: ElementType.File, children: []}, null)).toBeTruthy();
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
    expect(actualTreeNode.root).toEqual(actualTreeNode);
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
    expect(actualTreeNode.children[0].root).toEqual(actualTreeNode);
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
      ]}, null
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
      ]}, null
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
      ]}, null
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

  it('changes icon css class when the name changes to a different file extension / file type', () => {
    // given
    const treeNode = new TestNavigatorTreeNode({ name: 'test.tcl', path: 'path/to/test.tcl', type: ElementType.File, children: undefined});
    expect(treeNode.leafCssClasses).toEqual('fas fa-file tcl-file-color');

    // when
    treeNode.rename('path/to/spec.tsl', 'spec.tsl');

    // then
    expect(treeNode.leafCssClasses).toEqual('fas fa-file tsl-file-color');
  });

  it('allows to set validation marker data for files', () => {
    // given
    const treeNode = new TestNavigatorTreeNode({ name: 'test.tcl', path: 'path/to/test.tcl', type: ElementType.File, children: undefined});

    // when
    treeNode.validation = new ValidationMarkerSummary({ errors: 42, warnings: 23, infos: 3 });

    // then
    expect(treeNode.validation.errors).toEqual(42);
    expect(treeNode.validation.warnings).toEqual(23);
    expect(treeNode.validation.infos).toEqual(3);
  });

  it('ignores setting validation marker data for folders', () => {
    // given
    const treeNode = new TestNavigatorTreeNode({ name: 'folder', path: 'path/to/folder', type: ElementType.Folder, children: undefined});

    // when
    treeNode.validation = new ValidationMarkerSummary({ errors: 42, warnings: 23, infos: 3 });

    // then
    const actualValues = treeNode.validation;
    expect(actualValues.errors).toEqual(0);
    expect(actualValues.warnings).toEqual(0);
    expect(actualValues.infos).toEqual(0);
  });

  it('sums up validation marker data of child nodes, recursively', () => {
    // given
    const treeNode = new TestNavigatorTreeNode (
      { name: 'root', path: 'path/to/root', type: ElementType.Folder, children: [
        { name: 'child', path: 'path/to/root/child', type: ElementType.File, children: [] },
        { name: 'subDir', path: 'path/to/root/subDir', type: ElementType.Folder, children: [
          { name: 'grandChild', path: 'path/to/root/subDir/grandChild', type: ElementType.File, children: [] },
        ]},
        { name: 'anotherChild', path: 'path/to/root/anotherChild', type: ElementType.File, children: [] },
      ]}, null
    );
    forEach(treeNode, (node: TestNavigatorTreeNode) => {
      if (node.type === ElementType.File) {
        node.validation = new ValidationMarkerSummary({ errors: 3, warnings: 2, infos: 1 });
      }
    });

    // when
    const actualValues = treeNode.validation;

    // then
    expect(actualValues.errors).toEqual(9);
    expect(actualValues.warnings).toEqual(6);
    expect(actualValues.infos).toEqual(3);
  });
});
