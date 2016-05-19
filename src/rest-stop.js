var reststop = function ( collection, db, sockets ) {
	var express = require( 'express' );
	var router = express.Router();

	router.route( '/' )
		.get( function ( req, res ) {
			db.fetchAllRecords( collection, {} )
				.then( function ( docs ) {
					res.json( docs );
				}, function ( error ) {
					res.json( error );
				} );
		} )
		.post( function ( req, res ) {
			db.createRecord( req.body, collection )
				.then( function ( docs ) {
					sockets.emit( 'child_added', docs );
					res.json( docs );
				}, function ( error ) {
					res.json( error );
				} );
		} );

	router.route( '/:_id' )
		.get( function ( req, res ) {
			db.fetchAllRecords( collection, {
					"_id": req.params._id
				} )
				.then( function ( doc ) {
					res.json( doc );
				}, function ( error ) {
					res.json( error );
				} );
		} )
		.put( function ( req, res ) {
			db.updateRecord( req.params, collection )
				.then( function ( doc ) {
					sockets.emit( 'child_changed', doc );
					res.json( doc );
				}, function ( error ) {
					res.json( error );
				} );
		} )
		.delete( function ( req, res ) {
			db.deleteRecord( req.params._id, collection )
				.then( function () {
					sockets.emit( 'child_removed', req.params );
					res.json( {
						message: 'Successfully deleted'
					} );
				}, function ( error ) {
					res.json( error );
				} );
		} );

	return router;
};

module.exports = reststop;
