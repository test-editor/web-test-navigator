import { FilenameValidator } from './filename-validator';

const longestAcceptableFileName = 'x'.repeat(255);

const disallowedChars = ['\\', ':', '*', '"', '|', '$', '#', '%', '<', '>', '/'];

const cases = [
  {
    input: 'test.txt',
    expected: true,
    description: 'should allow a simple file'
  },
  {
    input: 'simple/path/test.txt',
    expected: false,
    description: 'should prevent paths'
  },
  {
    input: '../test.txt',
    expected: false,
    description: 'should prevent dot segment at the beginning'
  },
  {
    input: 'simple/path/../test.txt',
    expected: false,
    description: 'should prevent dot segment in between'
  },
  {
    input: longestAcceptableFileName,
    expected: true,
    description: 'should allow 255 character file names'
  },
  {
    input: `x${longestAcceptableFileName}`,
    expected: false,
    description: 'should prevent 256 character file names'
  },
  {
    input: ` ${longestAcceptableFileName}`,
    expected: false,
    description: 'should prevent 256 character file names with space included'
  }
].concat(disallowedChars.map((char) => ({
  input: `filename with ${char} symbol`,
  expected: false,
  description: `should prevent file names with ${char} in them`
})));

describe('FilnameValidator', () => {

  let validator: FilenameValidator;

  beforeEach(() => {
    validator = new FilenameValidator();
  });

  cases.forEach(value => {
    it(value.description, () => {
      // when
      const result = validator.isValid(value.input);

      // then
      expect(result).toBe(value.expected);
    });
  });

});
