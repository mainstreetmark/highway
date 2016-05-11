var Promise = require( 'promise' );

var MongoClient = require( 'mongodb' )
	.MongoClient;

var mongojs = require( 'mongojs' );
// ObjectId to look for records by ID (_id)
var ObjectId = require( 'mongojs' )
	.ObjectId;

var DB = function ( uri, hooks ) {
	if ( !uri ) {
		console.log( 'No URI provided. No database connection available' );
	}
	this.uri = uri;
	this.hooks = hooks || {};
	this.collections = [];
	this.db;

	function sanitizeURI( uri ) {
		return uri.replace( 'mongodb://', '' );
	}

	return this;

};

/**
 * Connect to a mongo database and return a promise
 * @method connect
 * @param  {string} uri An optional uri to connect to.
 * @return {instance} An instance of MongoClient
 */
DB.prototype.connect = function ( uri ) {
	var self = this;
	return new Promise( function ( fulfill, reject ) {
		MongoClient.connect( 'mongodb://' + self.uri,
			function ( err, db ) {
				if ( err ) reject( err );
				else {
					self.db = mongojs( db, [] );
					self.connection = db;
					self.db.getCollectionNames( function ( err, collections ) {
						if ( err ) reject( err );
						else {
							collections = collections.map( function ( m ) {
								self.collections.push( m.trim()
									.toString() );
								return m.trim()
									.toString();
							} );
							fulfill( self );
						}
					} );
				}
			} );
	} );
};


/**
 * A wrapper for mongojs .collection()
 * @method function
 * @param  {[type]} collection [description]
 * @return {[type]} [description]
 */
DB.prototype.collection = function ( collection ) {
	return this.db.collection( collection );
};




/**
 * Fetch all records from a specific collection, using specified search parameters
 * and return a promise
 *
 * @method fetchAllRecords
 * @param  {string}        collection The name of the collection you want to fetch
 * @param  {object}        search     Parameters to apply to your search
 * @param  {Function}      callback   A method to execute when the search completes
 * @return {promise}        A promise
 */
DB.prototype.fetchAllRecords = function ( collection, options ) {
	var self = this;
	options = options || {};
	var search = options.search || {};
	var limit = options.limit || Infinity;
	var skip = options.skip || 0;
	return new Promise( function ( success, failure ) {
		self.db.collection( collection )
			.find( search )
			.limit( limit )
			.skip( skip, function ( err, docs ) {
				if ( err ) failure( err );
				else
					success( docs );
			} );
	} );
};

/**
 * [createRecord description]
 * @method createRecord
 * @param  {object}     record     [description]
 * @param  {string}     collection [description]
 * @return {Promise}     [description]
 */
DB.prototype.createRecord = function ( record, collection ) {
	var self = this;
	return new Promise( function ( success, failure ) {
		self.hook( collection, 'beforeSave', record )
			.then( function ( record ) {
				self.db.collection( collection )
					.insert( record, function ( err, doc ) {
						if ( err ) failure( err );
						else {
							self.hook( collection, 'afterSave', doc )
								.then( function ( record ) {
									success( record );
								}, function ( err ) {
									failure( err );
								} );
						}
					} );
			} );
	} );
};

/**
 * [updateRecord description]
 * @method updateRecord
 * @param  {[type]}     record     [description]
 * @param  {[type]}     collection [description]
 * @return {[type]}     [description]
 */
DB.prototype.updateRecord = function ( record, collection ) {
	var self = this;
	return new Promise( function ( success, failure ) {
		self.hook( collection, 'beforeSave', record )
			.then( function ( record ) {
				var tosave = _.clone( record );
				delete tosave._id;
				self.collection( collection )
					.update( {
						"_id": ObjectId( record._id )
					}, {
						$set: tosave
					}, function ( err, docs ) {
						if ( err )
							error( err );
						else {
							self.hook( collection, 'afterSave', docs )
								.then( function ( docs ) {
									success( docs );
								}, function ( err ) {
									failure( err );
								} );
						}
					} );
			} );
	} );
};

/**
 * [deleteRecord description]
 * @method deleteRecord
 * @param  {[type]}     _id        [description]
 * @param  {[type]}     collection [description]
 * @return {[type]}     [description]
 */
DB.prototype.deleteRecord = function ( _id, collection ) {
	return new Promise( function ( success, failure ) {
		self.collection( collection )
			.remove( {
				"_id": ObjectId( _id )
			}, function ( err, doc ) {
				if ( err ) failure( err );
				success( doc );
			} );
	} );

};

/**
 * [hook description]
 * @method hook
 * @param  {[type]} collection [description]
 * @param  {[type]} hook       [description]
 * @param  {[type]} data       [description]
 * @return {[type]} [description]
 */
DB.prototype.hook = function ( collection, hook, data ) {
	var self = this;
	return new Promise( function ( success, failure ) {
		if ( self.hooks && self.hooks[ collection ] && typeof self.hooks[ collection ][ hook ] == 'function' ) {
			try {
				self.hooks[ collection ][ hook ]( data )
					.then( function ( d ) {
						success( d );
					} );
			} catch ( x ) {
				failure( x );
			}
		} else {
			success( data );
		}
	} );


};

module.exports = DB;
