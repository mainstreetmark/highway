var Highway = function (settings) {
	var ObjectId = require('mongojs')
		.ObjectId;
	var _ = require('underscore');
	var express = require('express');
	var Email = require('./src/email.js');
	var DB = require('./src/crud.js');
	var reststop = require('./src/rest-stop.js');
	var SocketServer = require('./src/socket.js');
	var Auth = require('./src/auth.js');
	var winston = require('winston');

	var defaults = {
		io: false,
		http: false,
		uri: false,
		database: false,
		auth: [],
		email: {},
		log: false
	};

	if (!settings) {
		throw new Error('No settings provided');
	}

	// logger crap
	if (settings && settings.log) {
		winston.add(winston.transports.File, {
			filename: '/var/log/highway.log',
			json: false
		});
		winston.remove(winston.transports.Console);
	}
	var self = this;
	self.settings = _.defaults(settings || {}, defaults);
	self.io = self.settings.io;
	self.socketservers = self.sockets = {};
	self.mailer = new Email(self.settings.email);
	self.logger = self.settings.log ? winston.log : function () {};



	// get the IP address of the device this is running on
	var os = require('os');
	var ifaces = os.networkInterfaces();

	Object.keys(ifaces).forEach(function (ifname) {
		var alias = 0;

		ifaces[ifname].forEach(function (iface) {
			if ('IPv4' !== iface.family || iface.internal !== false) {
				// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
				return;
			}

			if (alias >= 1) {
				// this single interface has multiple ipv4 addresses
				self.ip = iface.address;
			} else {
				// this interface has only one ipv4 adress
				self.ip = iface.address;
			}
			++alias;
		});
	});


	function PrepareHTTP() {
		if (!self.settings.http)
			return;

		var bodyParser = require('body-parser');
		var cookieParser = require('cookie-parser');

		self.settings.http.use(cookieParser());
		self.settings.http.use(bodyParser.urlencoded({
			extended: true
		}));
		self.settings.http.use(bodyParser.json());
		return true;
	}


	return new Promise(function (success, failure) {
		PrepareHTTP();
		var db = new DB(settings.uri + '/' + settings.database, settings.hooks, self);
		db.connect()
			.then(function (d) {
				self.db = d;
				var auth = new Auth(self)
					.then(function (s) {
						collections = _.clone(self.db.collections);
						while ((collection = collections.pop()) !== undefined) {
							if (collection.trim() !== '' && collection != 'system.indexes') {
								self.sockets[collection] = self.io.of('/' + settings.database + '/' + collection);
								self.socketservers[collection] = new SocketServer(self.io, collection, self.db); //SetUpSockets( collection );
								if (self.settings.http) {
									self.settings.http.use('/' +
										settings.database + '/' + collection, new reststop(collection, self.db, self.io.of('/' + settings.database + '/' + collection)));
								}
							}
						}

						if (typeof self.settings.onComplete == 'function') {
							self.settings.onComplete(self, _, ObjectId);
						}

						success(self);
					});
			}, function (err) {
				failure(err);
				console.error('Unable to connect to database: ', err);
			});
	});
};

Highway.prototype.LoadRoutes = function (routes) {
	var self = this,
		route;
	var _ = require('underscore');
	if (!_.isArray(routes)) {
		routes = [routes];
	}
	for (var i in routes) {
		route = routes[i];
		console.log(route);
		if (!route.method || route.method.toLowerCase() !== 'get' || route.method.toLowerCase() !== 'post') {
			console.error('Routes must have a method of either GET or POST, your route has: "' + route.method + '"');
		} else if (typeof route.handler() !== 'function') {
			console.error('Route handlers passed to LoadRoute must return an function');
		} else {
			console.log('Loaded route: ', route.path, route.method.toUpperCase());
			this.settings.http[route.method.toUpperCase()](route.path, route.handler(this));
		}
	}
	return routes;
};

Highway.prototype.SendEmail = function (to, message, options) {
	return this.mailer.Send(to, message, options);
};


module.exports = Highway;
