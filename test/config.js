var express = require('express');
var path = require('path');


var port = 3000;

var app = express();
var http = require('http')
	.Server(app);



app.set('host', 'localhost');
var server = app.listen(port, function () {
	console.log('Test server running on port ' + port);
});

var io = require('socket.io')
	.listen(server);



var config = {
	http: app,
	io: io,
	uri: '127.0.0.1',
	database: 'highway',
	auth: [{
		//	defaultUser: '56fea5cc54d49c036c802e53',
		strategy: 'local',
		forceRootAuth: false,
	}],

	onComplete: function (self, _, ObjectId) {

	},
	hooks: {

	}
};

module.exports = config;
