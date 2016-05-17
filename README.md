# nodejs document conversion example code
The following is sample code for node.js document conversion with the Accusoft Services API. It converts a Microsoft Office document and returns the converted document as a PDF, JPEG, TIFF, SVG, or PNG.
###Overview
Build Document Conversion capabilities to your web application quickly using the Accusoft Services Document Conversion API. Support for converting Microsoft Office, PDF, CAD and other files into raster files such as PNG and JPEG. If you are ready to build Document Conversion into your own application then take a moment to learn more about the [Accusoft Services Document Conversion API here](https://www.accusoft.com/products/accusoft-cloud-services/overview/).
###Installation
Download the package and type

	npm install
Open config.json and replace everything within the quotes including the curly braces with a valid [api key](http://www.accusoft.com/portal/ "Get your api key") obtained for **free** from accusoft.com.

	{
	  "apiKey": "{{ valid key here }}"
	}

This code will not function without a valid api key. Please sign up at [www.accusoft.com/products/accusoft-cloud-services/portal/](http://www.accusoft.com/portal/ "Get your api key") to get your key.
###Usage instructions
From within the subdirectory where you installed this code example, type

	node app --inputFilePath=<inputFilePath> --outputFileType=<jpeg|png|svg|tiff|pdf>
	
Please note that the outputFileType is case sensative.

###Examples
Generate a PDF file from a DOCX file.

	node app --inputFilePath=samples/sample5.docx --outputFileType=pdf

###Explanation
This is a fully functioning example to get you started using the document conversion services. The main calls to the api are within **convert.js**. Here is a brief walkthrough of that file.

####Loading required node modules

	'use strict';
  var fs = require('fs'),
      request = require('request'),
      path = require('path');

####Creating a Workfile
The purpose of a WorkFile is for temporary storage of files on Accusoft servers so they can be shared by various back-end processes that need to act on it.
The parameter (**inputFilePath**) is sent via a POST to the Accusoft Services api. The api key (**config.apiKey**) is sent as a header. The response will contain the (**fileId** and **affinityToken**) within a JSON object. These values will be needed for calls to the ContentConverters and WorkFile APIs. For more information, see the [Convert work files documentation](http://help.accusoft.com/SAAS/pcc-for-acs/webframe.html#Work%20Files.html).
```
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
```
####Converting the document
The document conversion API allows you to convert a document to PDF, JPEG, PNG, SVG, or TIFF. The contents of a JSON object containing the workfile ID (**fileId**) and describing the format to convert the document to (**outputFileType**) are sent via POST to the Accusoft Services api with the api key (**config.apiKey**) sent as a header. A successful response will include a unique (**processId**) which identifies this conversion process. You will use this processId in subsequent GET calls to get the state and final results of the document conversion operation. For more information, see the [Content Conversion Service documentation](http://help.accusoft.com/SAAS/pcc-for-acs/webframe.html#Content%20Conversion%20Service.html).
```
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
```
####Getting conversion state
Gets the state of a document conversion process and its final output if available. The (**processId**) is passed via the URL and the api key (**config.apiKey**) is sent as a header via GET to the Accusoft Services api. Responses for the request are in a format that's identical to those of POST /v1/contentConverters. Requests can be sent to this URL repeatedly while the response (**state**) is "processing". When the response state is "complete", the output section will include a WorkFile id for the output document(s). You can use the (**fileId**) with the WorkFile API to download the output document(s). For more information, see the [Content Conversion Service documentation](http://help.accusoft.com/SAAS/pcc-for-acs/webframe.html#Content%20Conversion%20Service.html).
```
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
      setTimeout(
        self.getConversionState(info, workFile, function(err, response) {
          if(err) {
            callback(err);
          } else {
            checkStatus(response);
          }
        }), 30000);
    }
    else if(info.state === 'complete') {
      callback(undefined, info);
    }
    else {
      callback(new Error('unable to determine conversion status'));
    }
  })(conversionState);
};

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

```
####Saving output
Gets the data associated with an existing WorkFile. The parameter (**workfileId**) is sent via a GET to the Accusoft Services api. The api key (**config.apiKey**) and (**affinityToken**) are sent as a header. The response will contain binary data the will be be written out to the same directory as the (**inputFilePath**). For more information, see the [Work Files Service documentation](http://help.accusoft.com/SAAS/pcc-for-acs/webframe.html#Work%20Files.html).
```
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
```
##Support
If you have questions, please visit our online [help center](https://accusofthelp.zendesk.com/hc/en-us).
