var Highway = function ( settings ) {
	var ObjectId = require( 'mongojs' )
		.ObjectId;
	var _ = require( 'underscore' );
	var express = require( 'express' );
	var Email = require( './src/email.js' );
	var DB = require( './src/crud.js' );
	var reststop = require( './src/rest-stop.js' );
	var SocketServer = require( './src/socket.js' );
	var Auth = require( './src/auth.js' );

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
	self.socketservers = self.sockets = {};
	self.mailer = new Email( self.settings.email );


	PrepareHTTP();
	var db = new DB( settings.uri + '/' + settings.database, settings.hooks, self );
	db.connect()
		.then( function ( d ) {
			self.db = d;
			var auth = new Auth( self );
			collections = self.db.collections;
			while ( ( collection = collections.pop() ) !== undefined ) {
				if ( collection.trim() !== '' && collection != 'system.indexes' ) {
					self.sockets[ collection ] = self.io.of( '/' + settings.database + '/' + collection );
					self.socketservers[ collection ] = new SocketServer( self.io, collection, self.db ); //SetUpSockets( collection );
					self.settings.http.use( '/' +
						settings.database + '/' + collection, new reststop( collection, self.db, self.io.of( '/' + settings.database + '/' + collection ) ) );
				}
			}
		}, function ( err ) {
			console.error( 'Unable to connect to database: ', err );
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
	this.db.close(); // close the MongoClient connection
};

Highway.prototype.SendEmail = function ( to, message, options ) {
	return this.mailer.Send( to, message, options );
};


module.exports = Highway;
