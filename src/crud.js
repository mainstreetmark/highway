var DB = {

  fetchAllRecords: function(collection, search, callback){
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		search = search || {};
		self.db.collection(collection).find(search, callback);
	},

	createRecord function(record, collection, callback){
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		self.db.collection(collection).insert(record, callback);
	},

	updateRecord: function(record, collection, callback){
		var tosave = _.clone(record);
		delete tosave._id;
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		self.db.collection(collection).update({ "_id": ObjectId(record._id) }, { $set: tosave }
		, callback)
	},

	deleteRecord, function(_id, collection, callback){
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		self.db.collection(collection).remove({ "_id" : ObjectId(_id)}, callback );
	}

}


module.exports = DB;
