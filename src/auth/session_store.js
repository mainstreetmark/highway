function SessionStore( session, uri ) {
	var self = this;
	return new Promise( function ( success, failure ) {
		var MongoStore = require( 'connect-mongodb-session' )( session )
		self.store = new MongoStore( {
			uri: uri,
			collection: 'sessions'
		} )

		self.store.on( 'connected', function () {
			success( self.stroe );
		} )

		self.store.on( 'error', function ( error ) {
			failure( error );
		} )
	} );
}

module.exports = SessionStore;
