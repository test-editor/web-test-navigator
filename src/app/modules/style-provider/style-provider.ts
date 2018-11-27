export abstract class StyleProvider {
  abstract getCssClasses(key: string): string;
}

export class TestNavigatorDefaultStyleProvider extends StyleProvider {
  getCssClasses(key: string): string {
    switch (key) {
      case 'executedTest': return 'fa fa-cog user-activity';
      default: return '';
    }
  }

}
