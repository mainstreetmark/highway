var Promise = require('promise');
var DB = function(uri){

  function DB(uri){
    MongoClient.connect('mongodb://'+sanitizeURI(uri), function(){
      //listCollectionsCallback
    });
  }

  function sanitizeURI(uri){
    return uri.replace('mongodb://','');
  }

}

DB.prototype.fetchAllRecords =function(collection, search, callback){
	callback = typeof callback == 'function' ? callback : function(err, docs){};
	search = search || {};
	self.db.collection(collection).find(search, callback);
};

DB.prototype.createRecord = function(record, collection, callback){
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		self.db.collection(collection).insert(record, callback);
};

DB.prototype.updateRecord = function(record, collection, callback){
		var tosave = _.clone(record);
		delete tosave._id;
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		self.db.collection(collection).update({ "_id": ObjectId(record._id) }, { $set: tosave }
		, callback)
};

DB.prototype.deleteRecord = function(_id, collection, callback){
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		self.db.collection(collection).remove({ "_id" : ObjectId(_id)}, callback );
};

module.exports = DB;
