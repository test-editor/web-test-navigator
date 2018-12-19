import { CompositeUserActivitySet, AtomicUserActivitySet } from './user-activity-set';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { ElementType } from '../persistence-service/workspace-element';

describe('CompositeUserActivitySet', () => {
  describe('getTypes', () => {
    it('should return an empty list if the provided element is not known to the set', () => {
      // given
      const activitySetUnderTest = new CompositeUserActivitySet();

      // when
      const actualTypes = activitySetUnderTest.getTypes('arbitrary unknown element');

      // then
      expect(actualTypes).toBeTruthy();
      expect(actualTypes.length).toEqual(0);
    });
  });

  describe('getUsers', () => {
    it('should return an empty list if the provided element is not known to the set', () => {
      // given
      const activtySetUnderTest = new CompositeUserActivitySet();

      // when
      const actualTypes = activtySetUnderTest.getUsers('arbitrary activity', 'arbitrary unknown element');

      // then
      expect(actualTypes).toBeTruthy();
      expect(actualTypes.length).toEqual(0);
    });
  });

  describe('ownAndChildActivitiesWithNoVisibleCloserAncestorNode', () => {
    it('should filter out only activities with invalid paths from set if the given node is collapsed', () => {
      // given
      const activtySetUnderTest = new CompositeUserActivitySet();
      activtySetUnderTest.set('iam/root', new AtomicUserActivitySet([{type: 'sampleActivity', user: ''}]));
      activtySetUnderTest.set('iam/root/an_element', new AtomicUserActivitySet([{type: 'sampleActivity', user: ''}]));
      activtySetUnderTest.set('iam/root/non_existing', new AtomicUserActivitySet([{type: 'sampleActivity', user: ''}]));
      activtySetUnderTest.set('not/a_valid_child_of/iam/root', new AtomicUserActivitySet([{type: 'sampleActivity', user: ''}]));
      const treeNode = new TestNavigatorTreeNode({
        name: 'root', path: 'iam/root', type: ElementType.Folder, children: [
          { name: 'element1', path: 'iam/root/an_element', type: ElementType.Folder, children: [] },
          { name: 'element2', path: 'iam/root/another_element', type: ElementType.Folder, children: []}]
      });
      treeNode.expanded = false;

      // whwen
      const actualfilteredSet = activtySetUnderTest.ownAndChildActivitiesWithNoVisibleCloserAncestorNode(treeNode);

      // then
      expect(actualfilteredSet.getTypes('iam/root')).toContain('sampleActivity');
      expect(actualfilteredSet.getTypes('iam/root/an_element')).toContain('sampleActivity');
      expect(actualfilteredSet.getTypes('iam/root/non_existing')).toContain('sampleActivity');
      expect(actualfilteredSet.getTypes('not/a_valid_child_of/iam/root').length).toEqual(0);
    });

    it('should filter out activities that have an ancestor node closer to the event node among the children of the given tree node', () => {
      // given
      const activtySetUnderTest = new CompositeUserActivitySet();
      activtySetUnderTest.set('iam/root', new AtomicUserActivitySet([{type: 'sampleActivity', user: ''}]));
      activtySetUnderTest.set('iam/root/closer_ancestor/of/this', new AtomicUserActivitySet([{type: 'sampleActivity', user: ''}]));
      activtySetUnderTest.set('iam/root/non_existing', new AtomicUserActivitySet([{type: 'sampleActivity', user: ''}]));
      activtySetUnderTest.set('not/a_valid_child_of/iam/root', new AtomicUserActivitySet([{type: 'sampleActivity', user: ''}]));
      const treeNode = new TestNavigatorTreeNode({
        name: 'root', path: 'iam/root', type: ElementType.Folder, children: [
          { name: 'element1', path: 'iam/root/an_element', type: ElementType.Folder, children: [] },
          { name: 'element2', path: 'iam/root/closer_ancestor', type: ElementType.Folder, children: []}]
      });
      treeNode.expanded = true;

      // whwen
      const actualfilteredSet = activtySetUnderTest.ownAndChildActivitiesWithNoVisibleCloserAncestorNode(treeNode);

      // then
      expect(actualfilteredSet.getTypes('iam/root')).toContain('sampleActivity');
      expect(actualfilteredSet.getTypes('iam/root/closer_ancestor/of/this').length).toEqual(0);
      expect(actualfilteredSet.getTypes('iam/root/non_existing')).toContain('sampleActivity');
      expect(actualfilteredSet.getTypes('not/a_valid_child_of/iam/root').length).toEqual(0);
    });
  });

});
