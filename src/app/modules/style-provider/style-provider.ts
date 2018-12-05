import { UserActivityType } from '../test-navigator/test-navigator-field-setup';

export abstract class StyleProvider {
  abstract getCssClasses(key: string): string;
}

export class TestNavigatorDefaultStyleProvider extends StyleProvider {
  getCssClasses(key: string): string {
    switch (key) {
      case UserActivityType.EXECUTED_TEST: return 'fa fa-cog user-activity';
      default: return '';
    }
  }

}
