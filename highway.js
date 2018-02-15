const Highway = function hw(settings) {
	const ObjectId = require('mongojs')
		.ObjectId;
	const _ = require('underscore');
	const express = require('express');
	const Email = require('./src/email.js');
	const DB = require('./src/crud.js');
	const reststop = require('./src/rest-stop.js');
	const SocketServer = require('./src/socket.js');
	const Auth = require('./src/auth.js');
	const winston = require('winston');

	const defaults = {
		io      : false,
		http    : false,
		uri     : false,
		database: false,
		auth    : [],
		email   : {},
		log     : false,
	};

	if (!settings)
		throw new Error('No settings provided');


	// logger crap
	if (settings && settings.log) {
		winston.add(winston.transports.File, {
			filename: '/var/log/highway.log',
			json    : false,
		});
		winston.remove(winston.transports.Console);
	}
	const self = this;
	self.settings = _.defaults(settings || {}, defaults);
	self.io = self.settings.io;
	self.socketservers = self.sockets = {};
	self.mailer = new Email(self.settings.email);
	self.logger = self.settings.log ? winston.log : function () {};


	// get the IP address of the device this is running on
	const os = require('os');
	const ifaces = os.networkInterfaces();

	Object.keys(ifaces).forEach((ifname) => {
		let alias = 0;

		ifaces[ifname].forEach((iface) => {
			if (iface.family !== 'IPv4' || iface.internal !== false)
				// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
				return;


			if (alias >= 1)
				// this single interface has multiple ipv4 addresses
				self.ip = iface.address;
			 else
				// this interface has only one ipv4 adress
				self.ip = iface.address;

			++alias;
		});
	});


	function PrepareHTTP() {
		if (!self.settings.http)
			return;

		const bodyParser = require('body-parser');
		const cookieParser = require('cookie-parser');

		self.settings.http.use(cookieParser());
		self.settings.http.use(bodyParser.urlencoded({
			extended: true,
		}));
		self.settings.http.use(bodyParser.json());
		return true;
	}


	return new Promise(((success, failure) => {
		PrepareHTTP();
		const db = new DB(`${settings.uri}/${settings.database}`, settings.hooks, self);
		db.connect()
			.then((d) => {
				self.db = d;
				const auth = new Auth(self)
					.then((s) => {
						collections = _.clone(self.db.collections);
						while ((collection = collections.pop()) !== undefined)
							if (collection.trim() !== '' && collection != 'system.indexes') {
								self.sockets[collection] = self.io.of(`/${settings.database}/${collection}`);
								self.socketservers[collection] = new SocketServer(self.io, collection, self.db); // SetUpSockets( collection );
								if (self.settings.http)
									self.settings.http.use(`/${
										settings.database}/${collection}`, new reststop(collection, self.db, self.io.of(`/${settings.database}/${collection}`)));
							}


						if (typeof self.settings.onComplete === 'function')
							self.settings.onComplete(self, _, ObjectId);


						success(self);
					});
			}, (err) => {
				failure(err);
				console.error('Unable to connect to database: ', err);
			});
	}));
};

Highway.prototype.LoadRoutes = function lr(routes) {
	const self = this;
	let route;
	const _ = require('underscore');
	if (!_.isArray(routes))
		routes = [routes];

	for (const i in routes) {
		route = routes[i];
		console.log(route);
		if (!route.method || ['get', 'post'].indexOf(route.method.toLowerCase()) === -1) {
			console.error(`Routes must have a method of either GET or POST, your route has: "${route.method}"`);
		} else if (typeof route.handler() !== 'function') {
			console.error('Route handlers passed to LoadRoute must return an function');
		} else {
			console.log('Loaded route: ', route.path, route.method.toUpperCase(), this.settings);
			this.settings.http[route.method.toUpperCase()](route.path, route.handler(this));
		}
	}
	return routes;
};

Highway.prototype.SendEmail = function (to, message, options) {
	return this.mailer.Send(to, message, options);
};


module.exports = Highway;
