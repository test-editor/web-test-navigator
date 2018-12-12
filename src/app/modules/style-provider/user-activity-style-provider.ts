import { StyleProvider } from '@testeditor/testeditor-commons';

export class DefaultUserActivityStyleProvider extends StyleProvider {
  getCssClasses(key: string): string {
    return 'fa fa-user user-activity';
  }

}
