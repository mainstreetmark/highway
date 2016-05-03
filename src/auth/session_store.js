function SessionStore( session, db ) {
	var self = this;
	return new Promise( function ( success, failure ) {
		var MongoStore = require( 'connect-mongostore' )( session )
		try {
			self.store = new MongoStore( {
				db: db
			}, function ( a, b, c ) {
				console.log( 'session store created' );
				success( self );
			} )
		} catch ( x ) {
			failure( x );
		}
	} )
}

module.exports = SessionStore;
