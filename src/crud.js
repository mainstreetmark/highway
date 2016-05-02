var Promise = require( 'promise' );
var MongoClient = require( 'mongodb' )
	.MongoClient;
var mongojs = require( 'mongojs' );
// ObjectId to look for records by ID (_id)
var ObjectId = require( 'mongojs' )
	.ObjectId;

var DB = function ( uri, options ) {
	if ( !uri ) {
		console.log( 'No URI provided. No database connection available' );
	}
	this.uri = uri;
	this.options = options || {};
	this.collections = [];
	this.db;

	function sanitizeURI( uri ) {
		return uri.replace( 'mongodb://', '' );
	}

	return this;

}

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
							} )

							fulfill( self );
						}
					} );
				}
			} )
	} )
};


/**
 * A wrapper for mongojs .collection()
 * @method function
 * @param  {[type]} collection [description]
 * @return {[type]} [description]
 */
DB.prototype.collection = function ( collection ) {
	return this.db.collection( collection );
}





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
DB.prototype.fetchAllRecords = function ( collection, search ) {
	var self = this;
	search = search || {};
	return new Promise( function ( success, failure ) {
		self.db.collection( collection )
			.find( search, function ( err, docs ) {
				if ( err ) failure( err );
				else
					success( docs );
			} );
	} )
};

/**
 * [createRecord description]
 * @method createRecord
 * @param  {[type]}     record     [description]
 * @param  {[type]}     collection [description]
 * @param  {Function}   callback   [description]
 * @return {[type]}     [description]
 */
DB.prototype.createRecord = function ( record, collection, callback ) {
	return this.hook( collection, 'beforeSave', record )
		.then( function ( record ) {
			callback = typeof callback == 'function' ? callback : function ( err, docs ) {};
			self.db.collection( collection )
				.insert( record, callback );
		} )
};

/**
 * [updateRecord description]
 * @method updateRecord
 * @param  {[type]}     record     [description]
 * @param  {[type]}     collection [description]
 * @param  {Function}   callback   [description]
 * @return {[type]}     [description]
 */
DB.prototype.updateRecord = function ( record, collection, callback ) {
	return this.hook( collection, 'beforeSave', record )
		.then( function ( record ) {
			var tosave = _.clone( record );
			delete tosave._id;
			callback = typeof callback == 'function' ? callback : function ( err, docs ) {};
			return new Promise( function ( success, error ) {
				self.db.collection( collection )
					.update( {
						"_id": ObjectId( record._id )
					}, {
						$set: tosave
					}, function ( err, docs ) {
						if ( err )
							error( err );
						else {
							success( docs );
						}
					} )
			} );
		} )
};

/**
 * [deleteRecord description]
 * @method deleteRecord
 * @param  {[type]}     _id        [description]
 * @param  {[type]}     collection [description]
 * @param  {Function}   callback   [description]
 * @return {[type]}     [description]
 */
DB.prototype.deleteRecord = function ( _id, collection, callback ) {
	callback = typeof callback == 'function' ? callback : function ( err, docs ) {};
	return new Promise( function ( success, failure ) {
		self.db.collection( collection )
			.remove( {
				"_id": ObjectId( _id )
			}, function ( err, doc ) {
				if ( err ) failure( err );
				callback();
				success( doc );
			} );
	} )

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
	return new Promise( function ( success, failure ) {
		if ( this.options.hooks && this.options.hooks[ collection ] && typeof this.options.hooks[ collection ][ hook ] == 'function' ) {
			try {
				data = this.options.hooks[ collection ][ hook ]( data );
				success( data );
			} catch ( x ) {
				failure( x );
			}
		} else {
			success( data );
		}
	} );


}

module.exports = DB;
