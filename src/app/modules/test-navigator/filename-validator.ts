export class FilenameValidator {

  static readonly onlyValidChars = new RegExp('^[^:*|$#%<>"\/\\\\]+$');
  static readonly invalidCharsMessage = 'disallowed characters are \\ : * " | $ # % < > /';
  static readonly tooLongMessage = 'file and folder names must not exceed 255 characters';

  isValid(input: string): boolean {
    return input.length < 256 && FilenameValidator.onlyValidChars.test(input);
  }

  getMessage(input: string): string {
    let message = '';
    if (input.length > 255) {
      message = FilenameValidator.tooLongMessage;
    } else if (!FilenameValidator.onlyValidChars.test(input)) {
      message = FilenameValidator.invalidCharsMessage;
    }
    return message;
  }

}
