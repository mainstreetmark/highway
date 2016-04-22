var SocketServer = function ( sockets, collection, db ) {
	sockets[ collection ].on( 'connection', function ( socket ) {


		/**
		 * [on description]
		 * @method on
		 * @param  {[type]} 'init'   [description]
		 * @param  {[type]} function (             search [description]
		 * @return {[type]} [description]
		 */
		socket.on( 'init', function ( search ) {
			db.fetchAllRecords( collection, search )
				.then( function ( docs ) {
					socket.emit( 'all_records', docs );
				} )
		} )

		/**
		 * [on description]
		 * @method on
		 * @param  {[type]} 'update' [description]
		 * @param  {[type]} function (             record [description]
		 * @return {[type]} [description]
		 */
		socket.on( 'update', function ( record ) {
			db.updateRecord( record, collection )
				.then( function ( doc ) {
					socket.broadcast.emit( 'child_changed', record );
				} )
		} )

		/**
		 * [on description]
		 * @method on
		 * @param  {[type]} 'create' [description]
		 * @param  {[type]} function (             record, fn [description]
		 * @return {[type]} [description]
		 */
		socket.on( 'create', function ( record, fn ) {
			db.createRecord( record, collection )
				.then( function ( docs ) {
					fn( docs );
					socket.emit( 'child_added', docs[ 0 ] );
				} )
		} )

		/**
		 * [on description]
		 * @method on
		 * @param  {[type]} 'destroy' [description]
		 * @param  {[type]} function  (             record [description]
		 * @return {[type]} [description]
		 */
		socket.on( 'destroy', function ( record ) {
			db.deleteRecord( record._id, collection )
				.then( function ( doc ) {
					socket.broadcast.emit( 'child_changed', doc );
				} )
		} )
	} )
}



module.exports = SocketServer;
