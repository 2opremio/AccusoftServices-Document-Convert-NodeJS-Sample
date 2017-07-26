'use strict';

var fs = require('fs'),
    request = require('request'),
    path = require('path');

function ConversionService(config) {
  if (!config) {
    throw new Error('Missing parameter config');
  }

  if (!config.apiKey) {
    throw new Error('config.apiKey must be set');
  }
	
	this.apiKey = config.apiKey;
}


/* 
  Create a workfile from the input file that the document conversion service will use to convert.
*/
ConversionService.prototype.createWorkFile = function(inputFilePath, callback) {
  if (!inputFilePath) {
    callback(new Error('Missing inputFilePath parameter'));
    return;
  }
  
  if (!callback) {
    callback(new Error('Missing callback parameter'));
    return;
  }

  var options = {
    url: 'https://api.accusoft.com/PCCIS/V1/WorkFile',
    headers: {
      'content-type': 'application/octet-stream',
      'acs-api-key': this.apiKey
    }
  };
  fs.readFile(inputFilePath, function(error, fileData) {
    if(error) {
      callback(error);
    } else {
      options.body = fileData;
      request.post(options, function(err, response, body) {
        if(err) {
          callback(err);
        } else {
          if (response.statusCode > 300) {
            callback(new Error('unable to create workfile'));
          } else {
            callback(undefined, JSON.parse(body));
          }
        }
      });
    }
  });
};

/*
  Call the document conversion API to convert the input document to the output file type
 */
ConversionService.prototype.convertDocument = function(workFile, outputFileType, callback) {
  if (!workFile) {
    callback( new Error('Missing workFile parameter'));
    return;
  }
  
  if (!outputFileType) {
    callback( new Error('Missing outputFileType parameter'));
    return;
  }
  
  if (!callback) {
    callback( new Error('Missing callback parameter'));
    return;
  }
  
  var input = { 
    input: {
      src: {
        fileId: workFile.fileId
      },
      dest: {
        format: outputFileType
      }
    }
  };
  
  var options = {
    url: 'https://api.accusoft.com/v2/contentConverters',
    json: input,
    headers: {
      'acs-api-key': this.apiKey,
      'Accusoft-Affinity-Token': workFile.affinityToken
    }
  };
  
  request.post(options, function(error, response, body) {
    if(error) {
      callback(error);
    } else if (response.statusCode > 300) {
      callback(new Error('unable to process document conversion'));
    } else {
      callback(undefined, body);
    }
  });
};

/*
  Poll the conversion status until it is done processing
 */
ConversionService.prototype.checkConversionState = function(conversionState, workFile, callback) {
  var self = this;
  
  if (!conversionState) {
    callback(new Error('Missing conversionState parameter'));
    return;
  }
  
  if (!workFile) {
    callback(new Error('Missing workFile parameter'));
    return;
  }
  
  if (!callback) {
    callback(new Error('Missing callback parameter'));
    return;
  }
  
  (function checkStatus(info) {
    if(info.state === 'error'){
      callback(new Error('unable to convert file. Code (' + info.errorCode + ')'));
    }
    else if(info.state === 'processing'){
      setTimeout(function() {
        self.getConversionState(info, workFile, function(err, response) {
          if(err) {
            callback(err);
          } else {
            checkStatus(response);
          }
        })
      }, 100);
    }
    else if(info.state === 'complete') {
      callback(undefined, info);
    }
    else {
      callback(new Error('unable to determine conversion status'));
    }
  })(conversionState);
};

/*
  Call document conversion API to determine the state of the conversion process
 */
ConversionService.prototype.getConversionState = function(conversionState, workFile, callback) {
  if (!conversionState) {
    callback(new Error('Missing conversionState parameter'));
    return;
  }
  
  if (!workFile) {
    callback(new Error('Missing workFile parameter'));
    return;
  }
  
  if (!callback) {
    callback(new Error('Missing callback parameter'));
    return;
  }
  
  var options = {
    url: 'https://api.accusoft.com/v2/contentConverters/' + conversionState.processId,
    headers: {
      'acs-api-key': this.apiKey,
      'Accusoft-Affinity-Token': workFile.affinityToken
    }
  };
  
  request.get(options, function(error, response, body) {
    if(error) {
      callback(error);
    } else if (response.statusCode > 300) {
      callback(new Error('unable to get conversion state'));
    } else {
      var result = JSON.parse(body);
      callback(undefined, result);
    }
  });
};


/*
  Call the workfile API to get the resulting document(s) from the document conversion API, save the results to disk
 */
ConversionService.prototype.saveOutput = function(conversionState, workFile, inputFilePath, callback) {
  var self = this;
  
  if (!conversionState) {
    callback(new Error('Missing conversionState parameter'));
    return;
  }
  
  if (!workFile) {
    callback( new Error('Missing workFile parameter'));
    return;
  }
  
  if (!inputFilePath) {
    callback( new Error('Missing inputFilePath parameter'));
    return;
  }
  
  if (!callback) {
    callback( new Error('Missing callback parameter'));
    return;
  }
  
  conversionState.output.results.forEach(function(result) {
    var options = {
      url: 'https://api.accusoft.com/PCCIS/V1/WorkFile/' + result.fileId,
      headers: {
        'acs-api-key': self.apiKey,
        'Accusoft-Affinity-Token': workFile.affinityToken
      }
    };
  
    request.get(options)
      .on('error', function(error) {
        callback(error);
      })
      .on('response', function(response) {
        if (response.statusCode > 300) {
          callback(new Error('unable to process conversion'));
        } else {
          var pages = conversionState.output.results.length == 1 ? '': '_' + result.src.pages;
          var outputFileName = path.basename(inputFilePath, path.extname(inputFilePath)) + 
              pages + '.' + conversionState.input.dest.format;
          var outputFilePath = path.join(path.dirname(inputFilePath), outputFileName);        

          response.pipe(fs.createWriteStream(outputFilePath)
            .on('error', function (error) {
              callback(error);
            })
            .on('finish', function () {
              callback(null);
            }));
        }
      });
  });
};

ConversionService.prototype.convert = function(inputFilePath, outputFileType, callback) {
  var self = this;
  
  if (!callback) {
    throw new Error('Missing parameter callback');
  }
  if (!inputFilePath) {
    callback(new Error('Missing parameter inputFilePath'));
    return;
  }
  if (!outputFileType) {
    callback(new Error('Missing parameter outputFileType'));
    return;
  }
  
  this.createWorkFile(inputFilePath, function(err, workFile){
    if(err) { 
      callback(err) 
    }
    else {
      self.convertDocument(workFile, outputFileType, function(err, conversionState) {
        if(err) {
          callback(err); 
        } else {
          self.checkConversionState(conversionState, workFile, function(err, outputInfo) {
            if(err) {
              callback(err); 
            } else {
              self.saveOutput(outputInfo, workFile, inputFilePath, function(err, result) {
                if(err) {
                  callback(err); 
                } else {
                  callback();
                }
              });
            }
          });
        }
      });
    }
  });
};

module.exports = ConversionService;
