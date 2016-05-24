function SessionStore( session, uri ) {
	var self = this;
	return new Promise( function ( success, failure ) {
		var MongoStore = require( 'connect-mongodb-session' )( session );

		if ( uri.indexOf( 'mongodb://' ) <= -1 ) {
			uri = 'mongodb://' + uri;
		}

		self.store = new MongoStore( {
			uri: uri,
			collection: 'sessions',
			expires: 60 * 60 * 24 * 7 * 365 * 5 * 1000
		} );

		self.store.on( 'connected', function () {
			success( self.store );
		} );

		self.store.on( 'error', function ( error ) {
			failure( error );
		} );
	} );
}

module.exports = SessionStore;
