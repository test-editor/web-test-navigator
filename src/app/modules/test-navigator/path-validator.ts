export class PathValidator {

  /** Matches dot segements such as "xyz/./", "/../" or "../". */
  static readonly dotSegment = new RegExp('(^|/)\\.+/');
  static readonly dotSegmentMessage = 'Relative path segments such as "{1}" are not allowed.';

  static readonly segmentTooLong = new RegExp('[^/]{256,}');
  static readonly segmentTooLongMessage = 'Folder or file names must have a maximum length of 255 characters.';

  isValid(input: string): boolean {
    const isValid = !PathValidator.dotSegment.test(input) && !PathValidator.segmentTooLong.test(input);
    return isValid;
  }

  getMessage(input: string): string {
    const dotSegmentMatch = PathValidator.dotSegment.exec(input);
    if (dotSegmentMatch) {
      return PathValidator.dotSegmentMessage.replace('{1}', dotSegmentMatch[0]);
    }
    const segmentTooLongMatch = PathValidator.segmentTooLong.test(input);
    if (segmentTooLongMatch) {
      return PathValidator.segmentTooLongMessage;
    }
    return '';
  }

}
