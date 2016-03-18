var Highway = function(settings){
	var MongoClient = require('mongodb').MongoClient;
	var mongojs = require('mongojs');
	var ObjectId = require('mongojs').ObjectId;
	var _ = require('underscore');
	
	var defaults = {
		io: false,
		http: false,
		uri: false,
		database: false,
		auth: false
	}
	
	var self = this;
	self.settings = _.defaults(settings, defaults);
	self.io = self.settings.io;
	self.sockets = {};
	
	
	
	
	MongoClient.connect(settings.uri+'/'+settings.database, listCollectionsCallback)
	
	function SetUpREST(collection, sockets){
		if(!settings.router){
			console.log('no router provided, aborting rest routes');
			return false;
		}
		router = settings.router;
		
		router.route('/'+settings.database+'/'+collection)
	    .get(function(req, res){
			fetchAllRecords(collection, {}, function(err, docs){ res.json(docs); });
	    })
	    .post(function(req, res) {
			createRecord(req.body, collection, function(err, docs){ 
				io.of('/'+settings.database+'/'+collection).emit('child_added', docs);
				res.json(docs)
			})
	    });

		router.route('/'+settings.database+'/'+collection+'/:_id')
		.get(function(req, res){
			self.db.collection(collection).find({ "_id" : ObjectId(req.params._id)}, function(err, doc){
				res.json(doc);
			})
		})
		.put(function(req, res) {
			var record = req.params;
			updateRecord(record, collection, function(err, doc){ res.json(doc); });
		})
	    .delete(function(req, res) {
			deleteRecord(req.params._id, collection, function(err){ req.json({ message: 'Successfully deleted' }); });
	    });		
	}

	function SetUpSockets(collection){
		if(!settings.io){
			console.log('no io provided, aborting sockets');
			return false;
		}
		self.sockets[collection].on('connection', function(socket){
			socket.on('init', function(search){
				fetchAllRecords(collection, search, function(err, docs){ socket.emit('all_records', docs); });
			})

	 		socket.on('update', function(record){
				updateRecord(record, collection, function(err, docs){ socket.emit('child_changed', record); });
	 		})

	 		socket.on('create', function(record){
	 			createRecord(record, collection, function(err, docs){ socket.broadcast.emit('child_added', record); });
	 		})

	 		socket.on('destroy', function(record){
				deleteRecord(record._id, collection, function(err, doc){ 
					socket.broadcast.emit('child_changed', doc); 
				});
	 		})
		})		
	}

	function fetchAllRecords(collection, search, callback){
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		search = search || {};
		self.db.collection(collection).find(search, callback);
	}
	
	function createRecord(record, collection, callback){
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		self.db.collection(collection).insert(record, callback);
	}
	
	function updateRecord(record, collection, callback){
		var tosave = _.clone(record);
		delete tosave._id;
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		self.db.collection(collection).update({ "_id": ObjectId(record._id) }, { $set: tosave }
		, callback)
	}
	
	function deleteRecord(_id, collection, callback){
		callback = typeof callback == 'function' ? callback : function(err, docs){};
		self.db.collection(collection).remove({ "_id" : ObjectId(_id)}, callback );
	}
	
	function collectionList(err, collections){
		collections = collections.map(function(m){ return m.trim().toString(); })
		while( (collection = collections.pop()) !== undefined){
			if(collection != '' && collection != 'system.indexes'){
				self.sockets[collection] = self.io.of('/'+settings.database+'/'+collection);
				SetUpSockets(collection);
				SetUpREST(collection);
			}
		}
	}

	function listCollectionsCallback(err, db) {
		self.db = mongojs(db, [])
		self.db.getCollectionNames(collectionList);
	}
	
	function handleAuthentication(){
		
		var passport = require('passport');
		
		self.settings.http.use(session({
		  cookie : {
		    maxAge: 3600000 
		  },
		  store : new MongoStore()
		});

		app.use(passport.session());
		
		
	}

	return self;	
}

module.exports = Highway;