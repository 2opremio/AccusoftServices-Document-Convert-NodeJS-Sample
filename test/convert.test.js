'use strict';

var chai = require('chai'),
expect = chai.expect,
fs = require('fs'),
request = require('request'),
ConversionService = require('../convert.js');

describe('Conversion Service', function() {
  var oldFsReadFile = fs.readFile,
      oldFsCreateWriteStream = fs.createWriteStream,
      oldRequestPost = request.post,
      oldRequestGet = request.get,
      responsePost = undefined,
      responseGet = undefined,
      statusCount = 0
      
  function getConversionService() {
    return new ConversionService({ apiKey: 'key' });
  }
  
  beforeEach(function() {
    request.post = function(options, callback) {
      callback(undefined, { statusCode: responsePost.statusCode }, responsePost.body);
    };
    request.get = function(options, callback) {
      if(options.url.indexOf('https://api.accusoft.com/v2/contentConverters/') === 0) {
        if(statusCount > 1) {
          responseGet = { statusCode: 200, body: JSON.stringify({ 'state': 'complete' })};
        }
        statusCount++;
      }
      if(callback) {
        callback(undefined, { statusCode: responseGet.statusCode, pipe: responseGet.pipe }, responseGet.body);
      } else {
        return { 
          'on': function(event, callback) {
            if(event == 'response') {
              callback({
                statusCode: responseGet.statusCode, 
                pipe: function(stream) { return;  }
              });
            }
            return this;
          } 
        }
      }
    };
    fs.readFile = function(input, callback) {
      if(!input) {
        callback(new Error('undefined input file'));
      } else if(input == 'bad-input.docx') {
        callback(new Error('bad-input file'));
      } else {
        callback(undefined, 'filedata');
      }
    };
    fs.createWriteStream = function(path) {
      return ({
      on: function(event, callback) {
        if(event == 'finish'){
          callback(undefined);
        }
        return this;
      }})
    }
  });
  
  afterEach(function() {
    fs.readFile = oldFsReadFile;
    fs.createWriteStream = oldFsCreateWriteStream;
    request.post = oldRequestPost;
    request.get = oldRequestGet;
    responsePost = undefined;
    responseGet = undefined;
    statusCount = 0;
  })
  
	describe('constructor', function() {
    it('fails if no config', function () {
      expect(function () {
        new ConversionService();
      }).to.throw();
    });

    it('fails if no key', function () {
      expect(function () {
        new ConversionService({ apiKey: null });
      }).to.throw();
    });

    it('succeeds if all values are set', function () {
      expect(function () {
        new ConversionService({ apiKey: 'key' });
      }).to.not.throw();
    });
	});
  
  describe('convert', function() {
    it('fails with no callback', function () {
      expect(function () {
        getConversionService()
          .convert();
      }).to.throw();
    });

    it('fails with invalid inputFile', function (done) {
      getConversionService()
        .convert(null, 'pdf', function (error) {
          expect(error).to.be.ok;
          done();
        });
    });

    it('fails with invalid outputFileType', function (done) {
      getConversionService()
        .convert('test.jpg', null, function (error) {
          expect(error).to.be.ok;
          done();
        });
    });
  });
  
  describe('createWorkFile', function() {
    it('creates valid workfile', function() {
      responsePost = { statusCode: 200, body: JSON.stringify({
        'fileId': 1,
        'affinityToken': 1
      }) };
      
      getConversionService().createWorkFile('input.docx', function(err, result) {
        expect(result.fileId).to.be.ok;
        expect(err).to.not.be.ok;
      });
    });
    it('fails if input file does not exist', function() {
      getConversionService().createWorkFile('bad-input.docx', function(err, result) {
        expect(result).to.not.be.ok;
        expect(err).to.be.ok;
      });
    });
    it('fails if input file undefined', function() {
      getConversionService().createWorkFile(undefined, function(err, result) {
        expect(result).to.not.be.ok;
        expect(err).to.be.ok;
      });
    });
  });
  
  describe('convertDocument', function() {
    it('calls conversion API successfully', function() {
      responsePost = { statusCode: 200, body: JSON.stringify({
        'state': 'processing'
      })};
      
      getConversionService().convertDocument({ fileId: 1, affinityToken: 1 }, 'pdf', function(err, result) {
        result = JSON.parse(result);
        expect(result).to.be.ok;
        expect(result.state).equals('processing');
        expect(err).to.not.be.ok;
      });
    });
    it('fails if no workfile', function() {
      getConversionService().convertDocument(undefined, 'pdf', function(err, result) {
        expect(result).to.not.be.ok;
        expect(err).to.be.ok;
      });
    });
    it('fails if bad workfile', function() {
      responsePost = { statusCode: 400, body: JSON.stringify({
        'state': 'error',
        'errorCode': 'bad file id'
      }) };
      
      getConversionService().convertDocument({ fileId: 'bad', affinityToken: 1 }, 'pdf', function(err, result) {
        expect(result).to.not.be.ok;
        expect(err).to.be.ok;
      });
    });
    it('fails if bad output type', function() {
      responsePost = { statusCode: 400, body: JSON.stringify({
        'state': 'error',
        'errorCode': 'bad output format'
      })};
      
      getConversionService().convertDocument({ fileId: 1, affinityToken: 1 }, 'bad', function(err, result) {
        expect(result).to.not.be.ok;
        expect(err).to.be.ok;
      });
    });
  });
  
  describe('checkConversionState', function() {
    it('checks status until not processing', function() {
      responseGet = { statusCode: 200, body: JSON.stringify({ 'state': 'processing' })};
      
      getConversionService().checkConversionState({ 'state': 'processing', 'processId': 1 }, { fileId: 1, affinityToken: 1 }, function(err, result) {
        expect(result).to.be.ok;
        expect(statusCount).to.be.above(1);
        expect(err).to.not.be.ok;
      });
    });
    
    it('fails if error status is returned', function() {
      responseGet = { statusCode: 200, body: JSON.stringify({ 'state': 'error', 'errorCode': 'error' })};
      
      getConversionService().checkConversionState({ 'state': 'processing', 'processId': 1 }, { fileId: 1, affinityToken: 1 }, function(err, result) {
        expect(result).to.not.be.ok;
        expect(err).to.be.ok;
      });
    });
  });
  
  describe('getConversionState', function() {
    it('calls conversion API successfully', function() {
      responseGet = { statusCode: 200, body: JSON.stringify({ 'state': 'processing' })};
      
      getConversionService().getConversionState({ 'state': 'processing', 'processId': 1 }, { fileId: 1, affinityToken: 1 }, function(err, result) {
        expect(result).to.be.ok;
        expect(err).to.not.be.ok;
      });
    });
    it('fails if processid is not available', function() {
      getConversionService().getConversionState(undefined, { fileId: 1, affinityToken: 1 }, function(err, result) {
        expect(result).to.not.be.ok;
        expect(err).to.be.ok;
      });
    });
  })
  
  describe('saveOutput', function() {
    it('saves output successfully', function() {
      responseGet = { 
        statusCode: 200, 
        body: 'filedata' };
      
      getConversionService().saveOutput({
          'output': {
            'results': [ { 'fileId': 1, 'src': { 'pages': '1' } }]
          },
          'input': {
            'src': {
              'inputFilePath': 'test/test.docx'
            },
            'dest': {
              'format': 'pdf'
            }
          }
        },  
        { fileId: 1, affinityToken: 1 },
        'input/input.docx',
        function(err, result) {
          expect(err).to.not.be.ok;
      });
    });
    it('fails if bad result workfile', function() {
      responseGet = { 
        statusCode: 400 };
      
      getConversionService().saveOutput({
          'output': {
            'results': [ { 'fileId': 'bad', 'src': { 'pages': '1' } }]
          },
          'input': {
            'src': {
              'inputFilePath': 'test/test.docx'
            },
            'dest': {
              'format': 'pdf'
            }
          }
        }, 
        { fileId: 1, affinityToken: 1 },
        'input/input.docx',
        function(err, result) {
          expect(err).to.be.ok;
        });
    });
  })
});