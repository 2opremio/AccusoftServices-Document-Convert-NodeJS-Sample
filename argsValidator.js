'use strict';

var fs = require('fs'),
  path = require('path');


function validateArgs(args) {
  var validOutputTypes = ['jpeg', 'pdf', 'png', 'svg', 'tiff'];
  
  function validateFilePath(filePath) {
    var dirname = path.dirname(filePath),
      extname = path.extname(filePath),
      isDirectory = fs.statSync(dirname).isDirectory(),
      isFile = fs.statSync(filePath).isFile(),
      validExtName = !!extname;

    return isDirectory && isFile && validExtName;
  }
  
  function writeLine(line) { 
    module.exports.writeLine(line); 
  }

  if (args.help) {
    writeLine('Usage: node app --inputFilePath=<file> --outputFileType=' + validOutputTypes.join('|').toString());
    writeLine('Perform a conversion of the input file to selected type');
    return null;
  }

  if (!args.inputFilePath || !validateFilePath(args.inputFilePath)) {
    writeLine('Invalid input file path [' + args.inputFilePath + ']');
    return null;
  }
  
  if (!args.outputFileType || validOutputTypes.indexOf(args.outputFileType.toLowerCase()) === -1) {
    writeLine('Invalid output file type [' + args.outputFileType + ']');
    return null;
  }

  return {
    inputFilePath: args.inputFilePath,
		outputFileType: args.outputFileType
  };
}

module.exports.validateArgs = validateArgs;

module.exports.writeLine = console.log;
