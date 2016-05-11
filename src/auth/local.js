// This is the local authentication strategy,
// encapsulated as a module.
//
// This is goddamn spaghetti.  It needs a lot of cleanup.

var Local = function ( strategy, self ) {

	var passport = require( 'passport' );
	var LocalStrategy = require( 'passport-local' )
		.Strategy;
	var session = require( 'express-session' );
	var secret = self.settings.auth_secret || 'highwaysecret';
	var _ = require( 'underscore' );
	var ObjectId = require( 'mongojs' )
		.ObjectId;

	strategy.routes = strategy.routes || {};
	strategy.options = strategy.options || {};

	var routes = {
		auth: strategy.routes.auth || '/auth',
		login: strategy.routes.login || '/login',
		logout: strategy.routes.logout || '/logout',
		home: strategy.routes.home || '/'
	};

	var SessionStore = require( './session_store.js' );
	var store = new SessionStore( session, self.settings.uri + '/' + self.settings.database )
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

module.exports = Local;
