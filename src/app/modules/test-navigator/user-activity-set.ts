import { UserActivityData } from '../event-types-in';
import { TestNavigatorTreeNode } from '../model/test-navigator-tree-node';

export interface UserActivitySet {
  getUsers(type: string, element?: string): string[];
  getTypes(element?: string): string[];
  hasOnly(type: string, element?: string): boolean;
  filterVisibleCloserAncestors(node: TestNavigatorTreeNode): UserActivitySet;
}

export class AtomicUserActivitySet implements UserActivitySet {
  private readonly activities = new Map<string, UserActivityData[]>();

  constructor(activities: UserActivityData[]) {
    activities.forEach((activity) => {
      if (!this.activities.get(activity.type)) {
        this.activities.set(activity.type, []);
      }
      this.activities.get(activity.type).push(activity);
    });
  }

  getUsers(type: string): string[] {
    const activities = this.activities.has(type) ? this.activities.get(type) : [];
    return activities.map(userActivity => userActivity.user);
  }

  getTypes(): string[] {
    return Array.from(this.activities.keys());
  }

  hasOnly(type: string): boolean {
    return this.activities.has(type) && this.activities.size < 2;
  }

  filterVisibleCloserAncestors(node: TestNavigatorTreeNode): UserActivitySet {
    return this;
  }

  toString(): string {
    return Array.from(this.activities.values()).map(
      (activitiesSameType) => activitiesSameType.map(
        (activity) => activity.toString())
        .join('\n'))
      .join('\n');
  }

}

export const EMPTY_USER_ACTIVITY_SET = new AtomicUserActivitySet([]);

export class CompositeUserActivitySet implements UserActivitySet {
  private readonly elementActivityMap = new Map<string, UserActivitySet>();

  constructor(initialActivities?: [string, UserActivitySet][]) {
    if (initialActivities) {
      initialActivities.forEach((entry) => this.set(entry[0], entry[1]));
    }
  }

  clear() {
    this.elementActivityMap.clear();
  }

  set(element: string, uaSet: UserActivitySet) {
    this.elementActivityMap.set(element, uaSet);
  }

  getUsers(type: string, element?: string): string[] {
    if (element) {
      if (this.elementActivityMap.has(element)) {
        return this.elementActivityMap.get(element).getUsers(type);
      } else {
        return [];
      }
    } else {
      return [].concat(...this.children.map((uaSet) => uaSet.getUsers(type))).filter(this.unique);
    }
  }

  getTypes(element?: string): string[] {
    if (element) {
      if (this.elementActivityMap.has(element)) {
        return this.elementActivityMap.get(element).getTypes();
      } else {
        return [];
      }
    } else {
      return [].concat(...this.children.map((uaSet) => uaSet.getTypes())).filter(this.unique);
    }
  }

  hasOnly(type: string, element?: string): boolean {
    if (element) {
      return this.elementActivityMap.get(element).hasOnly(type);
    }
    const types = this.getTypes();
    return types.length === 1 && types[0] === type;
  }

  filterVisibleCloserAncestors(node: TestNavigatorTreeNode): UserActivitySet {
    const treeDepth = node.id.split('/').length;
    return new CompositeUserActivitySet(Array.from(this.elementActivityMap).filter(([id, uaSet]) => {
        return id.startsWith(node.id) &&
          (!node.expanded || node.children.find((child) => child.id === node.id + '/' + id.split('/')[treeDepth]) === undefined);
    }));
  }

  private get children(): UserActivitySet[] {
    return Array.from(this.elementActivityMap.values());
  }

  private unique<T>(value: T, index: number, self: T[]) {
    return self.indexOf(value) === index;
  }
}
