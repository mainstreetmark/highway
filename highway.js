var Highway = function ( settings ) {
	var ObjectId = require( 'mongojs' )
		.ObjectId;
	var _ = require( 'underscore' );
	var express = require( 'express' );
	var Email = require( './src/email.js' );
	var DB = require( './src/crud.js' );
	var reststop = require( './src/rest-stop.js' );
	var SocketServer = require( './src/socket.js' );

	var defaults = {
		io: false,
		http: false,
		uri: false,
		database: false,
		auth: [],
		email: {}
	};

	if ( !settings ) {
		throw new Error( 'No settings provided' );
	}

	var self = this;
	self.settings = _.defaults( settings || {}, defaults );
	self.io = self.settings.io;
	self.sockets = {};
	self.mailer = new Email( self.settings.email );


	PrepareHTTP();
	var db = new DB( settings.uri + '/' + settings.database, settings.hooks );
	db.connect()
		.then( function ( d ) {
			self.db = d;
			for ( var i in self.settings.auth ) {
				handleAuthentication( self.settings.auth[ i ] ); // This requires self.db to be populated, so it has to live here for now
			}
			collections = self.db.collections;
			while ( ( collection = collections.pop() ) !== undefined ) {
				if ( collection != '' && collection != 'system.indexes' ) {
					self.sockets[ collection ] = self.io.of( '/' + settings.database + '/' + collection );
					new SocketServer( self.io, collection, self.db ); //SetUpSockets( collection );
					self.settings.http.use( '/' +
						settings.database + '/' + collection, new reststop( collection, self.db, self.io.of( '/' + settings.database + '/' + collection ) ) );
				}
			}
		}, function ( err ) {
			console.log( 'Unable to connect to database: ', err );
		} );



	function PrepareHTTP() {
		if ( !self.settings.http )
			return;

		var bodyParser = require( 'body-parser' );
		var cookieParser = require( 'cookie-parser' );

		self.settings.http.use( cookieParser() );
		self.settings.http.use( bodyParser.urlencoded( {
			extended: true
		} ) );
		self.settings.http.use( bodyParser.json() );
		return true;
	}

	function handleAuthentication( strategy ) {

		switch ( strategy.strategy ) {
		case 'local':
		default:

			SetUpLocalAuthentication( strategy );
			break;
		}

	}

	function SetUpLocalAuthentication( strategy ) {
		var passport = require( 'passport' );
		var LocalStrategy = require( 'passport-local' )
			.Strategy;
		var session = require( 'express-session' );
		var secret = self.settings.auth_secret || 'highwaysecret';

		if ( !strategy.routes )
			strategy.routes = {};
		if ( !strategy.options )
			strategy.options = {};

		var routes = {
			auth: strategy.routes.auth || '/auth',
			login: strategy.routes.login || '/login',
			logout: strategy.routes.logout || '/logout',
			home: strategy.routes.home || '/'
		};

		var sessionstore = require( './src/auth/session_store.js' );
		var store = new sessionstore( session, self.settings.uri + '/' + self.settings.database )
			.then( function ( sstore ) {
				self.settings.http.use( session( {
					secret: secret,
					store: sstore, // use current database for sessions
					resave: true,
					saveUninitialized: true
				} ) );

				passport.use( new LocalStrategy( {
						usernameField: 'email',
						passReqToCallback: true
					},
					function ( req, username, password, done ) {
						self.db.collection( 'users' )
							.findOne( {
								email: username
							}, function ( err, user ) {
								if ( err ) {
									return done( err );
								}
								if ( !user ) {
									return done( null, false, {
										message: 'Incorrect email.'
									} );
								}
								var bcrypt = require( 'bcrypt' );
								var salt = bcrypt.genSaltSync( 10 );
								if ( !bcrypt.compareSync( password, user.password ) ) {
									return done( null, false, {
										message: 'Incorrect password.'
									} );
								}
								return done( null, user );
							} );
					}
				) );

				passport.serializeUser( function ( user, done ) {
					done( null, user );
				} );

				passport.deserializeUser( function ( user, done ) {
					delete user.password;
					done( null, user );
				} );


				self.settings.http.use( passport.initialize() );
				self.settings.http.use( passport.session() );

				self.settings.http.get( routes.auth, function ( req, res ) {
					var loggedIn = req.isAuthenticated();
					if ( !loggedIn ) {
						res.send( 'false' );
						return;
					} else {
						res.send( JSON.stringify( req.session.passport.user ) );
						return;
					}
				} );


				self.settings.http.post( routes.auth,
					passport.authenticate( 'local', {
						failureRedirect: routes.login
					} ),
					function ( req, res ) {
						res.cookie( 'user', req.session.passport.user._id.toString(), {
							maxAge: 31536000000,
							httpOnly: false
						} );
						res.redirect( routes.home );
					}
				);

				self.settings.http.get( routes.logout, function ( req, res ) {
					res.cookie( 'user', strategy.defaultUser || false, {
						maxAge: 31536000000,
						httpOnly: false
					} );
					req.logout();
					res.redirect( routes.home );

				} );

				self.settings.http.post( '/highway/user', function ( req, res ) {
					var bcrypt = require( 'bcrypt' );
					var salt = bcrypt.genSaltSync( 10 );
					if ( !req.body.email ) {
						res.send( 'Error: No email provided' );
						return;
					}
					if ( !req.body.password ) {
						res.send( 'Error: No password provided' );
						return;
					}
					var saltedpassword = bcrypt.hashSync( req.body.password, salt );
					var user = {
						email: req.body.email,
						password: saltedpassword,
						name: req.body.name
					};
					self.db.collection( 'users' )
						.insert( user, function ( err, doc ) {
							res.cookie( 'user', doc._id, {
								maxAge: 31536000000,
								httpOnly: false
							} );
							res.redirect( routes.home );
						} );
				} );

				self.settings.http.get( '/password-reset', function ( req, res ) {
					var fs = require( 'fs' );
					if ( req.query.token ) {
						self.db.collection( 'users' )
							.find( {
								"password_token": req.query.token
							}, function ( err, doc ) {
								fs.readFile( __dirname + '/templates/web/password_reset/form.html', 'utf8', function ( err, data ) {
									res.send( _.template( data )() );
								} );
							} );
					} else if ( req.query.email ) {
						self.db.collection( 'users' )
							.find( {
								"email": req.query.email
							}, function ( err, doc ) {
								if ( err ) throw err;
								var token = Math.random()
									.toString( 35 )
									.substring( 2, 32 );
								updateRecord( _.extend( doc[ 0 ], {
									password_token: token
								} ), 'users' );
								self.SendEmail( req.query.email, 'passwordReset', {
									"_id": doc[ 0 ]._id,
									"token": token
								} );
								var template = _.template( fs.readFileSync( __dirname + '/templates/web/password_reset/email_sent.html' ) );
								res.send( template() );
							} );
					} else {
						fs.readFile( __dirname + '/templates/web/password_reset/request.html', 'utf8', function ( err, data ) {
							res.send( _.template( data )() );
						} );
					}

				} );


				if ( strategy.options.ForceRootAuth ) {
					self.settings.http.get( routes.home, strategy.homeCallback );
				}


				if ( typeof self.settings.onComplete == 'function' ) {
					self.settings.onComplete( self, _, ObjectId );
				}

			}, function ( err ) {
				console.log( 'error', err );
			} );
	}

	return self;
};

Highway.prototype.LoadRoutes = function ( routes ) {
	var self = this;
	var _ = require( 'underscore' );
	if ( !_.isArray( routes ) ) {
		routes = [ routes ];
	}
	var route;
	for ( var i in routes ) {
		route = routes[ i ];
		this.settings.http[ route.method ]( route.path, route.handler( this ) );
	}
};

Highway.prototype.CleanUp = function () {
	this.db.connection.close(); // close the MongoClient connection
};

Highway.prototype.SendEmail = function ( to, message, options ) {
	return this.mailer.Send( to, message, options );
};


module.exports = Highway;
