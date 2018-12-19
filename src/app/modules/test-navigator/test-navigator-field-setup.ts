import { Injectable, InjectionToken, Inject } from '@angular/core';
import { IndicatorFieldSetup, StyleProvider, LabelProvider, Field } from '@testeditor/testeditor-commons';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';
import { ElementType } from '../persistence-service/workspace-element';
import { UserActivityLabelSubject } from '../style-provider/user-activity-label-provider';
import { MarkerState } from '@testeditor/testeditor-commons/src/app/modules/widgets/tree-viewer/markers/marker.state';

export const TEST_NAVIGATOR_USER_ACTIVITY_STYLE_PROVIDER = new InjectionToken<StyleProvider>('');
export const TEST_NAVIGATOR_USER_ACTIVITY_LABEL_PROVIDER = new InjectionToken<LabelProvider<UserActivityLabelSubject>>('');
export const TEST_NAVIGATOR_USER_ACTIVITY_LIST = new InjectionToken<string[]>('');

@Injectable()
export class TestNavigatorFieldSetup implements IndicatorFieldSetup {
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

  private readonly activityMarkerSetup: Field;

  private readonly mixedActivityMarkerState: MarkerState = {
    condition: (node: TestNavigatorTreeNode) => node.activities
      .ownAndChildActivitiesWithNoVisibleCloserAncestorNode(node).getTypes().length > 1,
    cssClasses: this.userActivityStyles.getDefaultCssClasses(),
    label: (node: TestNavigatorTreeNode) =>
      node.activities.ownAndChildActivitiesWithNoVisibleCloserAncestorNode(node).getTypes().map((userActivity) =>
        this.userActivityLabeler.getLabel({
          users: node.activities.ownAndChildActivitiesWithNoVisibleCloserAncestorNode(node).getUsers(userActivity),
          activityType: userActivity,
          forChildElement: node.type === ElementType.Folder
        })
      ).join('\n')
  };

  fields: Field[];

  constructor(
    @Inject(TEST_NAVIGATOR_USER_ACTIVITY_STYLE_PROVIDER) private userActivityStyles: StyleProvider,
    @Inject(TEST_NAVIGATOR_USER_ACTIVITY_LABEL_PROVIDER) private userActivityLabeler: LabelProvider<UserActivityLabelSubject>,
    @Inject(TEST_NAVIGATOR_USER_ACTIVITY_LIST) userActivityList: string[]) {
    this.activityMarkerSetup = {
      condition: (node: TestNavigatorTreeNode) => node != null,
      states: this.initActivityMarkerStates(userActivityList)
    };
    this.fields = [this.validationMarkerSetup, this.activityMarkerSetup];
  }

  private initActivityMarkerStates(userActivityList: string[]): MarkerState[] {
    return this.singleActivityMarkerStates(userActivityList).concat(this.mixedActivityMarkerState);
  }

  private singleActivityMarkerStates(userActivityList: string[]): MarkerState[] {
    return userActivityList.map((userActivity) => ({
      condition: (node: TestNavigatorTreeNode) => node.activities
        .ownAndChildActivitiesWithNoVisibleCloserAncestorNode(node).hasOnly(userActivity),
      cssClasses: this.userActivityStyles.getCssClasses(userActivity),
      label: (node: TestNavigatorTreeNode) => this.userActivityLabeler.getLabel({
        users: node.activities.ownAndChildActivitiesWithNoVisibleCloserAncestorNode(node).getUsers(userActivity),
        activityType: userActivity,
        forChildElement: node.type === ElementType.Folder
      })
    }));
  }

}
