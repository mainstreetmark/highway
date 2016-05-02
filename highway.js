var Highway = function (settings) {
	// MongoClient is how I do the bulk of my queries.
	var MongoClient = require('mongodb')
		.MongoClient;
	// mongojs is used specifically for switching between databases;
	var mongojs = require('mongojs');
	// ObjectId to look for records by ID (_id)
	var ObjectId = require('mongojs')
		.ObjectId;
	// underscore.  Should I use lodash for some reason?
	var _ = require('underscore');
	// express because this uses sockets and web
	var express = require('express');

	// email stuff
	var Email = require('./src/email.js');

	var DB = require('./src/crud.js');


	var defaults = {
		io: false,
		http: false,
		uri: false,
		database: false,
		auth: [],
		email: {}
	};

	settings = settings || {};

	var self = this;
	self.settings = _.defaults(settings, defaults);
	self.io = self.settings.io;
	self.sockets = {};
	self.mailer = new Email(self.settings.email);


	PrepareHTTP();
	var db = new DB(settings.uri + '/' + settings.database, settings.hooks);
	db.connect()
		.then(function (d) {
			self.db = d;
			listCollectionsCallback(d);
		})
		//	MongoClient.connect( 'mongodb://' + settings.uri.replace( 'mongodb://', '' ) + '/' + settings.database, listCollectionsCallback );

	function SetUpREST(collection, sockets) {
		if (!settings.http) {
			console.log('no http provided, aborting rest routes');
			return false;
		}
		router = self.router;

		router.route('/' + settings.database + '/' + collection)
			.get(function (req, res) {
				self.db.fetchAllRecords(collection, {})
					.then(function (docs) {
						res.json(docs)
					})
			})
			.post(function (req, res) {
				self.db.createRecord(req.body, collection).then(function (docs) {
					self.io.of('/' + settings.database + '/' + collection)
						.emit('child_added', docs);
					res.json(docs);
				})
			});

		router.route('/' + settings.database + '/' + collection + '/:_id')
			.get(function (req, res) {
				self.db.collection(collection)
					.find({
						"_id": ObjectId(req.params._id)
					}, function (err, doc) {
						res.json(doc);
					})
			})
			.put(function (req, res) {
				var record = req.params;
				updateRecord(record, collection, function (err, doc) {
					res.json(doc);
				});
			})
			.delete(function (req, res) {
				deleteRecord(req.params._id, collection, function (err) {
					req.json({
						message: 'Successfully deleted'
					});
				});
			});
	}

	function SetUpSockets(collection) {
		if (!settings.io) {
			console.log('no io provided, aborting sockets');
			return false;
		}
		self.sockets[collection].on('connection', function (socket) {
			socket.on('init', function (search) {
				fetchAllRecords(collection, search, function (err, docs) {
					socket.emit('all_records', docs);
				});
			})

			socket.on('update', function (record) {
				updateRecord(record, collection, function (err, docs) {
					socket.broadcast.emit('child_changed', record);
				});
			})

			socket.on('create', function (record, fn) {
				createRecord(record, collection, function (err, docs) {
					fn(docs);
					socket.emit('child_added', record);
				});
			})

			socket.on('destroy', function (record) {
				deleteRecord(record._id, collection, function (err, doc) {
					socket.broadcast.emit('child_changed', doc);
				});
			})
		})
	}

	function fetchAllRecords(collection, search, callback) {
		callback = typeof callback == 'function' ? callback : function (err, docs) {};
		search = search || {};
		self.db.collection(collection)
			.find(search, callback);
	}

	function createRecord(record, collection, callback) {
		callback = typeof callback == 'function' ? callback : function (err, docs) {};
		self.db.collection(collection)
			.insert(record, callback);
	}

	function updateRecord(record, collection, callback) {
		var tosave = _.clone(record);
		delete tosave._id;
		callback = typeof callback == 'function' ? callback : function (err, docs) {};
		self.db.collection(collection)
			.update({
				"_id": ObjectId(record._id)
			}, {
				$set: tosave
			}, callback)
	}

	function deleteRecord(_id, collection, callback) {
		callback = typeof callback == 'function' ? callback : function (err, docs) {};
		self.db.collection(collection)
			.remove({
				"_id": ObjectId(_id)
			}, callback);
	}

	function collectionList() {
		self.router = express.Router();
		collections = self.db.collections;
		while ((collection = collections.pop()) !== undefined) {
			if (collection != '' && collection != 'system.indexes') {
				self.sockets[collection] = self.io.of('/' + settings.database + '/' + collection);
				SetUpSockets(collection);
				SetUpREST(collection);
			}
		}
		self.settings.http.use('/', self.router);
		if (typeof self.settings.onComplete == 'function') {
			self.settings.onComplete(self, _, ObjectId);
		}
	}

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
	}

	function listCollectionsCallback(db) {
		for (var i in self.settings.auth) {
			handleAuthentication(self.settings.auth[i]); // This requires self.db to be populated, so it has to live here for now
		}
		collectionList();
	}

	function handleAuthentication(strategy) {

		switch (strategy.strategy) {
		case 'local':
		default:
			SetUpLocalAuthentication(strategy);
			break;
		}

	}

	function SetUpLocalAuthentication(strategy) {
		var passport = require('passport');
		var LocalStrategy = require('passport-local')
			.Strategy;
		var session = require('express-session');
		var MongoStore = require('connect-mongostore')(session);
		var secret = self.settings.auth_secret || 'highwaysecret';

		if (!strategy.routes)
			strategy.routes = {};
		if (!strategy.options)
			strategy.options = {};

		var routes = {
			auth: strategy.routes.auth || '/auth',
			login: strategy.routes.login || '/login',
			logout: strategy.routes.logout || '/logout',
			home: strategy.routes.home || '/'
		};
		if (!strategy.homeCallback) {
			strategy.homeCallback = function (req, res) {
				if (!req.session || !req.session.passport.user) {
					res.redirect('/login.html');
				} else {
					res.send('you are logged in!');
				}
			};
		}


		var store = new MongoStore({
			host: self.settings.uri,
			'db': self.settings.database
		}, function () {})
		self.settings.http.use(session({
			secret: secret,
			store: store, // use current database for sessions
			resave: true,
			saveUninitialized: true
		}));

		passport.use(new LocalStrategy({
				usernameField: 'email',
				passReqToCallback: true
			},
			function (req, username, password, done) {
				self.db.collection('users')
					.findOne({
						email: username
					}, function (err, user) {
						if (err) {
							return done(err);
						}
						if (!user) {
							return done(null, false, {
								message: 'Incorrect email.'
							});
						}
						var bcrypt = require('bcrypt');
						var salt = bcrypt.genSaltSync(10);
						if (!bcrypt.compareSync(password, user.password)) {
							return done(null, false, {
								message: 'Incorrect password.'
							});
						}
						return done(null, user);
					});
			}
		));

		passport.serializeUser(function (user, done) {
			done(null, user);
		});

		passport.deserializeUser(function (user, done) {
			delete user.password;
			done(null, user);
		});


		self.settings.http.use(passport.initialize());
		self.settings.http.use(passport.session());

		self.settings.http.get(routes.auth, function (req, res) {
			var loggedIn = req.isAuthenticated();
			if (!loggedIn) {
				res.send('false');
				return;
			} else {
				res.send(JSON.stringify(req.session.passport.user));
				return;
			}
		});


		self.settings.http.post(routes.auth,
			passport.authenticate('local', {
				failureRedirect: routes.login
			}),
			function (req, res) {
				res.cookie('user', req.session.passport.user._id.toString(), {
					maxAge: 31536000000,
					httpOnly: false
				});
				res.redirect(routes.home);
			}
		);

		self.settings.http.get(routes.logout, function (req, res) {
			res.cookie('user', strategy.defaultUser || false, {
				maxAge: 31536000000,
				httpOnly: false
			});
			req.logout();
			res.redirect(routes.home);

		});

		self.settings.http.post('/highway/user', function (req, res) {
			var bcrypt = require('bcrypt');
			var salt = bcrypt.genSaltSync(10);
			if (!req.body.email) {
				res.send('Error: No email provided');
				return;
			}
			if (!req.body.password) {
				res.send('Error: No password provided');
				return;
			}
			var saltedpassword = bcrypt.hashSync(req.body.password, salt);
			var user = {
				email: req.body.email,
				password: saltedpassword,
				name: req.body.name
			};
			self.db.collection('users')
				.insert(user, function (err, doc) {
					res.cookie('user', doc._id, {
						maxAge: 31536000000,
						httpOnly: false
					});
					res.redirect(routes.home);
				});
		});

		self.settings.http.get('/password-reset', function (req, res) {
			var fs = require('fs');
			if (req.query.token) {
				self.db.collection('users')
					.find({
						"password_token": req.query.token
					}, function (err, doc) {
						fs.readFile(__dirname + '/templates/web/password_reset/form.html', 'utf8', function (err, data) {
							res.send(_.template(data)());
						});
					});
			} else if (req.query.email) {
				self.db.collection('users')
					.find({
						"email": req.query.email
					}, function (err, doc) {
						if (err) throw err;
						var token = Math.random()
							.toString(35)
							.substring(2, 32);
						updateRecord(_.extend(doc[0], {
							password_token: token
						}), 'users');
						self.SendEmail(req.query.email, 'passwordReset', {
							"_id": doc[0]._id,
							"token": token
						});
						var template = _.template(fs.readFileSync(__dirname + '/templates/web/password_reset/email_sent.html'));
						res.send(template());
					});
			} else {
				fs.readFile(__dirname + '/templates/web/password_reset/request.html', 'utf8', function (err, data) {
					res.send(_.template(data)());
				});
			}

		});


		if (strategy.options.ForceRootAuth) {
			self.settings.http.get(routes.home, strategy.homeCallback);
		}

	}

	return self;
};



Highway.prototype.SendEmail = function (to, message, options) {
	return this.mailer.Send(to, message, options);
};


module.exports = Highway;
