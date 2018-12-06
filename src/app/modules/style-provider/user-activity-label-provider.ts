import { UserActivityType } from './user-activity-type';

export abstract class UserActivityLabelProvider {
  abstract getLabel(users: string[], activityType: string, element?: string): string;
}

export class DefaultUserActivityLabelProvider extends UserActivityLabelProvider {
  getLabel(users: string[], activityType: string, element?: string): string {
    return this.userString(users) + ' ' + this.activityString(activityType, users.length < 2, element);
  }

  private userString(users: string[]): string {
    switch (users.length) {
      case 0: return 'Somebody';
      case 1: return users[0];
      case 2: return users[0] + ' and ' + users[1];
      default: return users.slice(0, -1).join(', ') + ', and ' + users.slice(-1);
    }
  }

  private activityString(type: string, singular: boolean, element?: string) {
    switch (type) {
      case UserActivityType.EXECUTED_TEST: return `${singular ? 'is' : 'are'} executing ${element ? element : 'this test'}`;
      default: return `${singular ? 'is' : 'are'} working on ${element ? element : 'this'}`;
    }
  }

}
