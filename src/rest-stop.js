var express = require('express');

var reststop = function(collection, db, sockets) {

	var router = express.Router();

	router.route(collection)
		.get(function(req, res) {
			fetchAllRecords(collection, {}, function(err, docs) {
				res.json(docs);
			});
		})
		.post(function(req, res) {
			createRecord(req.body, collection, function(err, docs) {
				io.of('/' + collection).emit('child_added', docs);
				res.json(docs)
			})
		});

	router.route(collection + '/:_id')
		.get(function(req, res) {
			self.db.collection(collection).find({
				"_id": ObjectId(req.params._id)
			}, function(err, doc) {
				res.json(doc);
			})
		})
		.put(function(req, res) {
			var record = req.params;
			updateRecord(record, collection, function(err, doc) {
				res.json(doc);
			});
		})
		.delete(function(req, res) {
			deleteRecord(req.params._id, collection, function(err) {
				req.json({
					message: 'Successfully deleted'
				});
			});
		});

	return router;
}

module.exports = reststop;
