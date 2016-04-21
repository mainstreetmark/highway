var SocketServer = function ( sockets, collection, db ) {
	sockets[ collection ].on( 'connection', function ( socket ) {
		socket.on( 'init', function ( search ) {
			db.fetchAllRecords( collection, search )
				.then( function ( docs ) {
					socket.emit( 'all_records', docs );
				} )
		} )

		socket.on( 'update', function ( record ) {
			updateRecord( record, collection, function ( err, docs ) {
				socket.broadcast.emit( 'child_changed', record );
			} );
		} )

		socket.on( 'create', function ( record, fn ) {
			createRecord( record, collection, function ( err, docs ) {
				fn( docs );
				socket.emit( 'child_added', record );
			} );
		} )

		socket.on( 'destroy', function ( record ) {
			deleteRecord( record._id, collection, function ( err, doc ) {
				socket.broadcast.emit( 'child_changed', doc );
			} );
		} )
	} )
}



module.exports = SocketServer;
