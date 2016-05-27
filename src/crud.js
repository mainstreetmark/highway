var Promise = require( 'promise' );

var mongojs = require( 'mongojs' );

var ObjectId = require( 'mongojs' )
	.ObjectId;
var _ = require( 'underscore' );


var DB = function ( uri, hooks, parent ) {
	if ( !uri ) {
		console.log( 'No URI provided. No database connection available' );
	}
	this.uri = uri;
	this.hooks = hooks || {};
	this.highway = parent;
	this.collections = [];

	function sanitizeURI( uri ) {
		return uri.replace( 'mongodb://', '' );
	}

	return this;

};

/**
 * Connect to a mongo database and return a promise
 * @method connect
 * @param  {string} uri An optional uri to connect to.
 * @return {instance} A promise
 */
DB.prototype.connect = function ( uri ) {
	var self = this;
	return new Promise( function ( fulfill, reject ) {
		self.db = mongojs( 'mongodb://' + self.uri, [], {
			connectTimeoutMS: 604800000,
			socketTimeoutMS: 604800000
		} );
		self.db.getCollectionNames( function ( err, collections ) {
			if ( err ) reject( err );
			else {
				self.collections = collections.map( function ( m ) {
					return m.trim()
						.toString();
				} );
				fulfill( self );
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
			.then( function ( data ) {
				self.db.collection( collection )
					.insert( data, function ( err, doc ) {
						if ( err ) failure( err );
						else {
							self.hook( collection, 'afterSave', doc[ 0 ] )
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
							failure( err );
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
				self.hooks[ collection ][ hook ]( self, data )
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
