var reststop = function ( collection, db, sockets ) {
	var express = require( 'express' );
	var router = express.Router();

	router.route( '/' )
		.get( function ( req, res ) {
			db.fetchAllRecords( collection, {} )
				.then( function ( docs ) {
					res.json( docs );
				} );
		} )
		.post( function ( req, res ) {
			db.createRecord( req.body, collection )
				.then( function ( docs ) {
					sockets.emit( 'child_added', docs );
					res.json( docs );
				} );
		} );

	router.route( '/:_id' )
		.get( function ( req, res ) {
			db.fetchAllRecords( collection, {
					"_id": req.params._id
				} )
				.then( function ( doc ) {
					res.json( doc );
				} );
		} )
		.put( function ( req, res ) {
			db.updateRecord( req.params, collection )
				.then( function ( doc ) {
					sockets.emit( 'child_changed', doc );
					res.json( doc );
				} );
		} )
		.delete( function ( req, res ) {
			db.deleteRecord( req.params._id, collection )
				.then( function () {
					sockets.emit( 'child_removed', req.params );
					req.json( {
						message: 'Successfully deleted'
					} );
				} );
		} );

	return router;
};

module.exports = reststop;
