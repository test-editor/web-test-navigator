import { ElementType } from '../persistence-service/workspace-element';

export class FilenameValidator {

  static readonly fileExtensionRegexString = '\\.[a-zA-Z0-9À-ɿΑ-ѯµ_]+';
  static readonly firstLetterRegexString = '[a-zA-ZÀ-ɿΑ-ѯµ]';
  static readonly javaIdentifierRegexString = FilenameValidator.firstLetterRegexString + '[a-zA-Z0-9À-ɿΑ-ѯµ_]*';
  static readonly validFirstLetter = new RegExp('^' + FilenameValidator.firstLetterRegexString);
  static readonly validFolderName = new RegExp('^' + FilenameValidator.javaIdentifierRegexString + '$');
  static readonly validFileName = new RegExp('^' + FilenameValidator.javaIdentifierRegexString +
    FilenameValidator.fileExtensionRegexString + '$');

  static readonly invalidFirstCharacterMessage = 'names must start with a letter';
  static readonly invalidCharacterMessage = 'only letters, numbers, and underscores are allowed';
  static readonly invalidExtensionMessage = 'files must end with a dot followed by an extension';
  static readonly tooLongMessage = 'file and folder names must not exceed 255 characters';

  isValidName(input: string, type: ElementType) {
    return type === ElementType.Folder ? this.isValidFolderName(input) : this.isValidFileName(input);
  }

  isValidFileName(input: string): boolean {
    return input.length < 256 && FilenameValidator.validFileName.test(input);
  }

  isValidFolderName(input: string): boolean {
    return input.length < 256 && FilenameValidator.validFolderName.test(input);
  }

  getMessage(input: string): string {
    let message = '';
    if (input.length > 255) {
      message = FilenameValidator.tooLongMessage;
    } else if (!FilenameValidator.validFirstLetter.test(input)) {
      message = FilenameValidator.invalidFirstCharacterMessage;
    } else if (!FilenameValidator.validFolderName.test(input)) {
      message = FilenameValidator.invalidCharacterMessage;
    } else if (!FilenameValidator.validFileName.test(input)) {
      message = FilenameValidator.invalidExtensionMessage;
    }
    return message;
  }

}
