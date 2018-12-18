import { LabelProvider } from '@testeditor/testeditor-commons';

export interface UserActivityLabelSubject {
  users: string[];
  activityType: string;
  forChildElement?: boolean;
}

export class DefaultUserActivityLabelProvider extends LabelProvider<UserActivityLabelSubject> {
  getLabel(): string {
    return 'one or more collaborators are currently working on this';
  }
}
