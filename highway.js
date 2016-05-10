var Highway = function ( settings ) {
	var ObjectId = require( 'mongojs' )
		.ObjectId;
	var _ = require( 'underscore' );
	var express = require( 'express' );
	var Email = require( './src/email.js' );
	var DB = require( './src/crud.js' );
	var reststop = require( './src/rest-stop.js' );

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

	settings = settings || {};

	var self = this;
	self.settings = _.defaults( settings, defaults );
	self.io = self.settings.io;
	self.sockets = {};
	self.mailer = new Email( self.settings.email );


	PrepareHTTP();
	var db = new DB( settings.uri + '/' + settings.database, settings.hooks );
	db.connect()
		.then( function ( d ) {
			self.db = d;
			listCollectionsCallback( d );
		}, function ( err ) {
			console.log( 'Unable to connect to database: ', err );
		} );

	function SetUpREST( collection, sockets ) {

		var router = new reststop( collection, this.db, sockets );
	}

	function SetUpSockets( collection ) {
		self.sockets[ collection ].on( 'connection', function ( socket ) {
			socket.on( 'init', function ( search ) {
				self.db.fetchAllRecords( collection, {} )
					.then( function ( docs ) {
						socket.emit( 'all_records', docs );
					} );
			} );

			socket.on( 'update', function ( record ) {
				updateRecord( record, collection, function ( err, docs ) {
					socket.broadcast.emit( 'child_changed', record );
				} );
			} );

			socket.on( 'create', function ( record, fn ) {
				createRecord( record, collection, function ( err, docs ) {
					fn( docs );
					socket.emit( 'child_added', record );
				} );
			} );

			socket.on( 'destroy', function ( record ) {
				deleteRecord( record._id, collection, function ( err, doc ) {
					socket.broadcast.emit( 'child_changed', doc );
				} );
			} );
		} );
	}

	function createRecord( record, collection, callback ) {
		callback = typeof callback == 'function' ? callback : function ( err, docs ) {};
		self.db.collection( collection )
			.insert( record, callback );
	}

	function updateRecord( record, collection, callback ) {
		var tosave = _.clone( record );
		delete tosave._id;
		callback = typeof callback == 'function' ? callback : function ( err, docs ) {};
		self.db.collection( collection )
			.update( {
				"_id": ObjectId( record._id )
			}, {
				$set: tosave
			}, callback );
	}

	function deleteRecord( _id, collection, callback ) {
		callback = typeof callback == 'function' ? callback : function ( err, docs ) {};
		self.db.collection( collection )
			.remove( {
				"_id": ObjectId( _id )
			}, callback );
	}

	function collectionList() {
		self.router = express.Router();
		collections = self.db.collections;
		while ( ( collection = collections.pop() ) !== undefined ) {
			if ( collection != '' && collection != 'system.indexes' ) {
				self.sockets[ collection ] = self.io.of( '/' + settings.database + '/' + collection );
				SetUpSockets( collection );
				self.settings.http.use( '/' + collection, new reststop( collection, self.db, self.io.of( '/' + settings.database + '/' + collection ) ) );
			}
		}
	}

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

	function listCollectionsCallback( db ) {
		for ( var i in self.settings.auth ) {
			handleAuthentication( self.settings.auth[ i ] ); // This requires self.db to be populated, so it has to live here for now
		}
		collectionList();
	}

	function handleAuthentication( strategy ) {

		switch ( strategy.strategy ) {
		case 'local':
		default:
			SetUpLocalAuthentication( strategy );
			break;
		}

	}


	// this can be done away with soon
	function SetUpLocalAuthentication( strategy ) {
		var s = require( './src/auth/local.js' );
		return new s( strategy, self );
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
