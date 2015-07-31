'use strict';

var ConversionService = require('./convert.js'),
  argsValidator = require('./argsValidator.js'),
  parseArgs = require('minimist'),
  path = require('path'),
  config = require('./config.json');

function execute(args) {
  var conversionService = new ConversionService({ apiKey: config.apiKey });
  if(args) {
    conversionService.convert(args.inputFilePath, args.outputFileType, function (error) {
      if(error) {
        console.log(error);
      } else {
        console.log('Converted ' + args.inputFilePath + ' to ' + args.outputFileType);
        console.log('See ' + path.dirname(args.inputFilePath) + ' directory for output');
      }
    });
  }
}

var args = argsValidator.validateArgs(parseArgs(process.argv.slice(2)));

if (!args) {
  process.exit(-1);
}
execute(args);
