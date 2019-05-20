import { FilenameValidator } from './filename-validator';

const longestAcceptableFileName = 'x'.repeat(251) + '.ext';
const longestAcceptableFolderName = 'x'.repeat(255);

const disallowedChars = ['\\', ':', '*', '"', '|', '$', '#', '%', '<', '>', '/', '!', '\'',
  '§', '&', '(', ')', '[', ']', '{', '}', '?', '`', ' ', '\n', '\t', '\b', '\f', '\r', '\v',
  '-', '–', ',', ';', ':', '@']; // non-exhaustive examples of disallowed chars

const filenameCases = [
  {
    input: 'test_ABC_123.txt',
    expected: true,
    description: 'should allow a simple file'
  },
  {
    input: 'µŧæ_ſðđ.öäüß',
    expected: true,
    description: 'should allow special letter characters and the underscore'
  },
  {
    input: 'FileName',
    expected: false,
    description: 'should prevent missing extensions'
  },
  {
    input: 'File\tName \n.txt',
    expected: false,
    description: 'should prevent whitespace'
  },
  {
    input: '0file',
    expected: false,
    description: 'should prevent digits as first character'
  },
  {
    input: '_file',
    expected: false,
    description: 'should prevent underscores as first character'
  },
  {
    input: 'FileName.tcl.bak',
    expected: false,
    description: 'should prevent more than one dot / extension'
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
  }
].concat(disallowedChars.map((char) => ({
  input: `FileName_with_${char}.symbol`,
  expected: false,
  description: `should prevent file names with ${char} in them`
})));

const foldernameCases = [
  {
    input: 'test_ABC_123',
    expected: true,
    description: 'should allow a simple folder'
  },
  {
    input: 'µŧæ_ſðđ_öäüß',
    expected: true,
    description: 'should allow special letter characters and the underscore'
  },
  {
    input: 'Folder\tName \n',
    expected: false,
    description: 'should prevent whitespace'
  },
  {
    input: '0folder',
    expected: false,
    description: 'should prevent digits as first character'
  },
  {
    input: '_folder',
    expected: false,
    description: 'should prevent underscores as first character'
  },
  {
    input: longestAcceptableFolderName,
    expected: true,
    description: 'should allow 255 character folder names'
  },
  {
    input: `x${longestAcceptableFolderName}`,
    expected: false,
    description: 'should prevent 256 character folder names'
  }
].concat(disallowedChars.map((char) => ({
  input: `FileName_with_${char}.symbol`,
  expected: false,
  description: `should prevent folder names with ${char} in them`
})));

describe('FilenameValidator', () => {

  let validator: FilenameValidator;

  beforeEach(() => {
    validator = new FilenameValidator();
  });

  filenameCases.forEach(value => {
    it(value.description, () => {
      // when
      const result = validator.isValidFileName(value.input);

      // then
      expect(result).toBe(value.expected);
    });
  });

  foldernameCases.forEach(value => {
    it(value.description, () => {
      // when
      const result = validator.isValidFolderName(value.input);

      // then
      expect(result).toBe(value.expected);
    });
  });

});
