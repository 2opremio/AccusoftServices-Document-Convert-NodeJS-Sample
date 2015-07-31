'use strict';

var chai = require('chai'),
  expect = chai.expect,
  fs = require('fs'),
  parseArgs = require('minimist'),
  argsValidator = require('../argsValidator.js');

describe('Args Validator', function () {
  var oldStatSync = fs.statSync,
    output = false;

  beforeEach(function () {
    argsValidator.writeLine = function () { 
      output = true; 
    };
    fs.statSync = function (filePath) {
      return {
        isFile: function () {
          return filePath === 'test/input.docx';
        },
        isDirectory: function () {
          return filePath === 'test';
        }
      };
    };
  });

  afterEach(function () {
    fs.statSync = oldStatSync;
    output = false;
  });

  describe('validateArgs', function () {
    it('fails if no arguments', function () {
      expect(argsValidator.validateArgs([])).to.not.be.ok;
    });

    it('fails if arguments < 2 and not --help', function () {
      var args = parseArgs(['--inputFilePath=test/input']);
      expect(argsValidator.validateArgs(args)).to.not.be.ok;
    });

    it('fails if input file directory is invalid', function () {
      var args = parseArgs(['--inputFilePath=bad-directory/input.docx', '--outputFileType=pdf']);
      expect(argsValidator.validateArgs(args)).to.not.be.ok;
    });

    it('fails if input file is missing extension', function () {
      var args = parseArgs(['--inputFilePath=test/input', '--outputFileType=pdf']);
      expect(argsValidator.validateArgs(args)).to.not.be.ok;
    });

    it('fails if input file does not exist', function () {
      var args = parseArgs(['--inputFilePath=test/missing-input.docx', '--outputFileType=pdf']);
      expect(argsValidator.validateArgs(args)).to.not.be.ok;
    });

    it('fails if output file type is invalid', function () {
      var args = parseArgs(['--inputFilePath=test/input.docx', '--outputFileType=xml']);
      expect(argsValidator.validateArgs(args)).to.not.be.ok;
    });

    it('succeeds with valid values', function () {
      var args = parseArgs(['--inputFilePath=test/input.docx', '--outputFileType=pdf']);
      expect(argsValidator.validateArgs(args)).to.be.ok;
    });

    it('writes help when requested', function () {
      var args = parseArgs(['--help']);
      expect(argsValidator.validateArgs(args)).to.not.be.ok;
      expect(output).to.be.ok;
    });
  });
});
