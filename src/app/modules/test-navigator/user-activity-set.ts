import { UserActivityData } from '../event-types-in';

export interface UserActivitySet {
  getUsers(type: string, element?: string): string[];
  getTypes(element?: string): string[];
  hasOnly(type: string, element?: string): boolean;
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

  constructor() {}

  set(element: string, uaSet: UserActivitySet) {
    this.elementActivityMap.set(element, uaSet);
  }

  getUsers(type: string, element?: string): string[] {
    if (element) {
      return this.elementActivityMap.get(element).getUsers(type);
    } else {
    return [].concat(...this.children.map((uaSet) => uaSet.getUsers(type))).filter(this.unique);
    }
  }

  getTypes(element?: string): string[] {
    if (element) {
      return this.elementActivityMap.get(element).getTypes();
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

  private get children(): UserActivitySet[] {
    return Array.from(this.elementActivityMap.values());
  }

  private unique<T>(value: T, index: number, self: T[]) {
    return self.indexOf(value) === index;
  }
}
