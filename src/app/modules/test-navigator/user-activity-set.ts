import { UserActivityData } from '../event-types-in';

export class UserActivitySet {
  public static readonly EMPTY_SET = new UserActivitySet([]);
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
    return this.activities.get(type).map(userActivity => userActivity.user);
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
