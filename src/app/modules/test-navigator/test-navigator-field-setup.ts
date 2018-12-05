import { Injectable } from '@angular/core';
import { IndicatorFieldSetup } from '@testeditor/testeditor-commons';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { ElementType } from '../persistence-service/workspace-element';
import { StyleProvider } from '../style-provider/style-provider';
import { UserActivityLabelProvider } from '../style-provider/user-activity-label-provider';

// TODO remove duplication with test-editor-web
export enum UserActivityType {
  EXECUTED_TEST = 'executed.test'
}

@Injectable()
export class TestNavigatorFieldSetup implements IndicatorFieldSetup {
  constructor(private userActivityStyles: StyleProvider, private userActivityLabeler: UserActivityLabelProvider) {}

  private readonly validationMarkerSetup = {
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
        condition: (node: TestNavigatorTreeNode) => node.activities.hasOnly(UserActivityType.EXECUTED_TEST),
        cssClasses: this.userActivityStyles.getCssClasses(UserActivityType.EXECUTED_TEST),
        label: (node: TestNavigatorTreeNode) =>
          this.userActivityLabeler.getLabel(node.activities.getUsers(UserActivityType.EXECUTED_TEST), UserActivityType.EXECUTED_TEST)
      }]
    };

  fields = [this.validationMarkerSetup, this.activityMarkerSetup];

}
