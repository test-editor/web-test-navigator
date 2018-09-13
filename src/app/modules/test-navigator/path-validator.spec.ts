import { PathValidator } from './path-validator';

const longestAcceptableFileName = 'x'.repeat(255);

const cases = [
  {
    input: 'test.txt',
    expected: true,
    description: 'should allow a simple file'
  },
  {
    input: 'simple/path/test.txt',
    expected: true,
    description: 'should allow a simple path'
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
    input: `some/path/${longestAcceptableFileName}`,
    expected: true,
    description: 'should allow 255 character file names'
  },
  {
    input: `some/path/x${longestAcceptableFileName}`,
    expected: false,
    description: 'should prevent 256 character file names'
  },
  {
    input: `some/path/ ${longestAcceptableFileName}`,
    expected: false,
    description: 'should prevent 256 character file names with space included'
  }
];

describe('PathValidator', () => {

  let validator: PathValidator;

  beforeEach(() => {
    validator = new PathValidator();
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
