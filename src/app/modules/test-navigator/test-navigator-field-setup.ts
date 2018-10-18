import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { ElementType } from '../persistence-service/workspace-element';
import { IndicatorFieldSetup } from '@testeditor/testeditor-commons';

export class TestNavigatorFieldSetup implements IndicatorFieldSetup {
  fields = [
    {
      condition: (node: TestNavigatorTreeNode) => node && (node.type === ElementType.File || !node.expanded),
      states: [{
        condition: (node: TestNavigatorTreeNode) => node.validation.errors > 0,
        cssClasses: 'fa fa-exclamation-circle validation-errors',
        label: (node: TestNavigatorTreeNode) => node.validation.toString()
      }, {
        condition: (node: TestNavigatorTreeNode) => node.validation.errors <= 0 && node.validation.warnings > 0,
        cssClasses: 'fa fa-exclamation-triangle validation-warnings',
        label: (node: TestNavigatorTreeNode) => node.validation.toString()
      }, {
        condition: (node: TestNavigatorTreeNode) =>
          node.validation.errors <= 0 && node.validation.warnings <= 0 && node.validation.infos > 0,
        cssClasses: 'fa fa-info-circle validation-infos',
        label: (node: TestNavigatorTreeNode) => node.validation.toString()
      }]
    }
  ];

}
