import { Injectable } from '@angular/core';
import { IndicatorFieldSetup } from '@testeditor/testeditor-commons';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { ElementType } from '../persistence-service/workspace-element';
import { StyleProvider } from '../style-provider/style-provider';
import { UserActivityLabelProvider } from '../style-provider/user-activity-label-provider';

@Injectable()
export class TestNavigatorFieldSetup implements IndicatorFieldSetup {
  constructor(private userActivityStyles: StyleProvider, private userActivityLabeler: UserActivityLabelProvider) {}

  private static readonly validationMarkerSetup = {
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
  };

  private readonly activityMarkerSetup = {
      condition: (node: TestNavigatorTreeNode) => node && (node.type === ElementType.File || !node.expanded),
      states: [{
        condition: (node: TestNavigatorTreeNode) => node.activities.hasOnly('executedTest'),
        cssClasses: this.userActivityStyles.getCssClasses('executedTest'),
        label: (node: TestNavigatorTreeNode) => this.userActivityLabeler.getLabel(node.activities.getUsers('executedTest'), 'executedTest')
      }]
    };

  fields = [TestNavigatorFieldSetup.validationMarkerSetup, this.activityMarkerSetup];

}
