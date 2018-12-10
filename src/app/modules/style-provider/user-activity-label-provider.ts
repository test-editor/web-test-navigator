import { UserActivityType } from './user-activity-type';

export abstract class UserActivityLabelProvider {
  abstract getLabel(users: string[], activityType: string, forChildElement?: boolean): string;
}

export class DefaultUserActivityLabelProvider extends UserActivityLabelProvider {
  getLabel(users: string[], activityType: string, forChildElement = false): string {
    return this.userString(users) + ' ' + this.activityString(activityType, users.length < 2, forChildElement);
  }

  private userString(users: string[]): string {
    switch (users.length) {
      case 0: return 'Somebody';
      case 1: return users[0];
      case 2: return users[0] + ' and ' + users[1];
      default: return users.slice(0, -1).join(', ') + ', and ' + users.slice(-1);
    }
  }

  private activityString(type: string, singular: boolean, forChildElement: boolean) {
    switch (type) {
      case UserActivityType.EXECUTED_TEST:
        return `${singular ? 'is' : 'are'} executing ${forChildElement ? 'a test in this folder' : 'this test'}`;
      default: return `${singular ? 'is' : 'are'} working on this`;
    }
  }

}
