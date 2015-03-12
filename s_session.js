var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var express = require('express');
var fs = require("fs-extra");
var mkdirp = require('mkdirp');
var router = express.Router();
var path = require('path');
var async = require('async');
var kloudless = require('kloudless')(process.env.API_KEY || 'MPTcgxGlEx6KuW7aH2xvr_Cq63LdAGWjenopayI0IhaolajZ');
if (process.env.API_HOST)
    kloudless.setHost(process.env.API_HOST, process.env.API_PORT || 443);
if (process.env.API_CA != null)
    kloudless.setCA(process.env.API_CA);

var files, clips = [], stream, currentfile, dhh;
var _public='./';
var fldname=_public+"temp";

router.get('/session', function (req, res) {
	res.render('session',{
    title:"Session API"
  });
});

/*
recieve session parameters and create the session
return status 0 if the failed to create session
return status 1 if the session created
return timestamp to use it as session id
*/
router.post('/session/createSession', function (req, res) {
  var date= new Date().getTime();
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  try{
    data = JSON.parse(req.body.data);
  }catch(err){ }
  var info={};
  if (fs.existsSync(_public+date+userip)) {
    info.status = 0;
    info.session = date+userip;
    info.desc = "failed";
  }
  else {
    //fs.mkdirSync(_public+date);
    info.status = 1;
    info.session = date+userip;
    info.desc = "created";
  }
  info.timestamp = date;
  res.send(JSON.stringify(info));
});

/*
get session id to know the relevant directory
*/
router.get("/session/mergeAudios/:sessionId?", function(req, res) {
  fldname = _public+req.query.sessionId;
  var mergedRecName=req.query.sessionId+'.mp3';
  files = fs.readdirSync(fldname),
  dhh = fs.createWriteStream(fldname+'/'+mergedRecName);
  // fs.renameSync(currentname, newname);

  // create an array with filenames (time)
  files.forEach(function (file) {
      if (file.indexOf(".mp3")!= -1 && file.indexOf(mergedRecName) == -1){
        clips.push(file.substring(0, file.length-4));  
     }
  });

  // Sort
  clips.sort(function (a, b) {
      return a - b;
  });

  merge();

  res.send(JSON.stringify({"status":1,"desc":"success"}))
});

// recursive function
function merge() {
    if (!clips.length) {
        dhh.end("Done");
        return;
    }
    currentfile = fldname +"/"+ clips.shift() + '.mp3';
    stream = fs.createReadStream(currentfile);
    stream.pipe(dhh, {end: false});
    stream.on("end", function() {
        console.log(currentfile + ' appended');
        merge();        
    });
    stream.on("error", function() {
        console.log('error while merging');
    });
}

/*
get session id and image file
{data: file.jpg, sessionId:sessionid}
return status 1 if success and 0 if fail
*/
router.post("/session/uploadImage",multipartMiddleware, function(req, res ) {
  fldname = _public+req.body.sessionId;
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  if (!req.body.sessionId) res.send(JSON.stringify({"status":0,"desc":"data error"}));
  else if (!req.files) res.send(JSON.stringify({"status":0,"desc":"file error"}));
  else fs.readFile(req.files.data.path, function (err, data) {
    if (err)  res.send(JSON.stringify({"status":0,"desc":"fail"}));
    else fs.writeFile(fldname+"/"+uniqueid+".jpg", data, function (err) {
        if (err)  res.send(JSON.stringify({"status":0,"desc":"fail"}));
        res.send(JSON.stringify({"status":1,"desc":"success"}))
    });
  });
});
/*
get session id and audio file
{data: file.mp3, sessionId:sessionid}
return status 1 if success and 0 if fail
*/
router.post("/session/uploadAudio",multipartMiddleware, function(req, res ) {
  fldname = _public+req.body.sessionId;
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;

  if (!req.body.sessionId) res.send(JSON.stringify({"status":0,"desc":"session error"}));
  else if (!req.files) res.send(JSON.stringify({"status":0,"desc":"file error"}));
  else fs.readFile(req.files.data.path, function (err, data) { //req.files.data.path
    if (err) res.send(JSON.stringify({"status":0,"desc":"fail"}));
    else fs.writeFile(fldname+"/"+uniqueid+".mp3", data, function (err) {
        if (err) res.send(JSON.stringify({"status":0,"desc":"fail"}));
        res.send(JSON.stringify({"status":1,"desc":"success"}))
    });
  });
});

/*
get image by session id
return audio file or status 0 (fail)
*/
router.get('/session/getImage/:sessionId?:imageId?', function (req, res) {
  
  fldname = _public+req.query.sessionId;
  var iid = "/"+req.query.imageId;
  try{
    var headerOptions = {
      'Content-Type': 'image/jpg'
    }
    res.writeHead(200, headerOptions);
    res.end(fs.readFileSync(fldname+iid), 'binary');
   
   
  }catch(err){
    res.send(JSON.stringify({"status":0,"desc":"fail"})); 
  }
});

/*
get session id and audio file
return audio file of status 0 (fail)
*/
router.get('/session/getAudio/:sessionId?:videoId?', function (req, res) {
  fldname = _public+req.query.sessionId;
  var vid = "/"+req.query.videoId;
  try{
    var stat = fs.statSync(fldname+vid);
    //https://groups.google.com/forum/#!topic/nodejs/gzng3IJcBX8
    var headerOptions = {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
      'Content-Range': "bytes " + 0 + "-" + stat.size + "/" + stat.size, 
      "Accept-Ranges": "bytes"
    }
    
    res.writeHead(200, headerOptions );
    
   var options = { 
      flags: 'r',
      encoding: null,
      fd: null,
      mode: 0666,
      bufferSize: 64*1024,
      start: 0, 
      end: stat.size
    }
    var readStream = fs.createReadStream(fldname+vid, options);

    var temp=[];
    
    readStream.on('open', function () {
      readStream.pipe(res,'binary');
    });

    readStream.on('end', function() {
       res.end();
    });

    readStream.on('error', function(err) {
      res.end({"status":0,"desc":"failed while transfering"});
    });

  }catch(err){
    res.send(JSON.stringify({"status":0,"desc":"fail"}));
  }
});

router.get('/session/getVideoId/:videoId?', function (req, res) {
  fldname = _public+req.query.videoId;
  
  var images =[]
  files = fs.readdirSync(fldname),
  files.forEach(function (file) {
      if (file.indexOf(".jpg")!= -1)
        console.log(file)
  });

  var audios =[]
  files = fs.readdirSync(fldname),
  files.forEach(function (file) {
      if (file.indexOf(".mp3")!= -1)
        console.log(file)
  });
  

  
  var recId =  "01.mp3";
  var recId2 = "02.mp3";

  var imgId =  "01.jpg";
  var imgId2 = "02.jpg";
  var imgId3 = "03.jpg";
  var imgId4 = "04.jpg";
  try{
   var temp = {
    "videoId": "temp",
    "title": "אוטומטים שיעור 1.3.14",
    "uploadBy": "iofirag@gmail.com",
    "praticipant": [
      {
        "user": "vandervidi@gmail.com",
        "user": "avishayhajbi@gmail.com"
      }
    ],
    "totalSecondLength": 405,
    "audio": [
      {
        "sound": "https://lecturus.herokuapp.com/session/getAudio/?sessionId=temp&videoId="+recId,
        "length": 211,
        "startSecond": 0
      }, {
        "sound": "https://lecturus.herokuapp.com/session/getAudio/?sessionId=temp&videoId="+recId2,
        "length": 194,
        "startSecond": 212
      }
    ],
    "elements": {
      "6": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId,
        "text": "this is subtitles 6"
      },
      "24": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId2,
      },

      "210": {
        "text": "audio-1 end"
      },

      "220": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId3,
        "text": "this is titles 220"
      },

      "379": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId4,
        "text": "this is titles 379"
      },
      "380": {
        "text": "this is titles 380"
      },
      "381": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId,
        "text": "this is titles 381"
      },
      "382": {
        "text": "this is titles 382"
      },
      "383": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId2,
        "text": "this is titles 383"
      }
    }
     
  }
  temp.status=1;
  res.send(JSON.stringify(temp));
  }catch(err){
    res.send(JSON.stringify({"status":0,"desc":"fail"}));
  }
});

function checkAndCreateSessionDirectory(dirName){
  //check if directory exist else create
  if (fs.existsSync(dirName)) {
  }
  else fs.mkdirSync(dirName);
}

/*
TEST::
get session id and audio file named data
{data: file.mp3, sessionId:sessionid}
*/

router.post("/session/uploadAudio2", function(req, res ) {
  var form = new multiparty.Form();
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;

  var count=0;
  var data = new Buffer('');
  req.on('data', function(chunk) {
      data = Buffer.concat([data, chunk]);
  });

  form.parse(req, function(err, fields, files) {
      fldname=_public+fields['sessionId'][0];
      callback();
  });

  req.on('end', function() {
      req.rawBody = data;
      callback();
  });

  var callback = function(){
    if (count++ == 1)
    fs.writeFile(fldname+"/"+uniqueid+'.mp3', data, 'binary', function(err){
          if (err) res.send({"status":0,"desc":"fail"})
          else {
            console.log('Wrote out song');
            res.send({"status":1,"desc":"success"})
          }
      });
  }
});


var accountId, fileId;

async.series([
  function(cb) {
    // to get the base account data
    kloudless.accounts.base({}, function(err, res) {
      if (err) {
        return console.log("Error getting the account data: " + err);
      }
      // assuming you authorized at least one service (Dropbox, Google Drive, etc.)
      console.log("We got the account data!");
      accountId = res["objects"][0]["id"]
      console.log('accountId',accountId)
      cb();
    });
  },

  function(cb) {
    /*var stat = fs.statSync(_public+'temp/1.jpg');
    var options = { 
      flags: 'r',
      encoding: null,
      fd: null,
      mode: 0666,
      bufferSize: 64*1024,
      start: 0, 
      end: stat.size
    }*/
    // create the fs.ReadStream to pass in to files.upload()
    var filestream = fs.createReadStream(_public+'temp/f1.jpg');
  
    // to upload a file to the account we just got data for
    kloudless.files.upload({
      "name": "f1.jpg",
      "account_id": accountId,
      "parent_id": "root",
      "file": filestream,
      "queryParams": {
        "overwrite": "true"
      }
    }, function(err, res) {
      if (err) {
        console.log("Error uploading file: " + err);
        return cb(err);
      }
      console.log("We uploaded the file!");
      fileId = res['id'];
      cb();
    });
  },

  function(cb){
    // and now we're going to download that file we just uploaded
    kloudless.files.contents({
      "account_id": accountId,
      "file_id": fileId
    }, function(err, filestream) {
      if (err) {
        return console.log("Files contents: " + err);
      }
      var filecontents = '';
      console.log("got the filestream:");
      filestream.on('data', function(chunk) {
        console.log("reading in data chunk...");
        console.log(chunk);
        filecontents += chunk;
      });
      filestream.on('end',function() {
        console.log("finished reading file!");
        console.log(filecontents);
        cb();
      });
    });
  }
]);

module.exports = router;