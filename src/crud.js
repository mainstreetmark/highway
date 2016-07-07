var Promise = require('promise');

var mongojs = require('mongojs');

var ObjectId = require('mongojs')
	.ObjectId;
var _ = require('underscore');


var DB = function (uri, hooks, parent) {
	if (!uri) {
		console.log('No URI provided. No database connection available');
	}
	this.uri = uri;
	this.hooks = hooks || {};
	this.highway = parent;
	this.log = parent ? parent.logger : function (msg) {
		console.log(msg);
	};
	this.collections = [];

	function sanitizeURI(uri) {
		return uri.replace('mongodb://', '');
	}

	return this;

};

/**
 * Connect to a mongo database and return a promise
 * @method connect
 * @param  {string} uri An optional uri to connect to.
 * @return {instance} A promise
 */
DB.prototype.connect = function (uri) {
	var self = this;

	return new Promise(function (fulfill, reject) {
		self.db = mongojs('mongodb://' + self.uri, [], {
			connectTimeoutMS: 604800000,
			socketTimeoutMS: 604800000
		});
		self.db.on('error', function (err) {
			reject(err);
		});

		self.db.getCollectionNames(function (err, collections) {
			if (err) reject(err);
			else {
				self.collections = collections.map(function (m) {
					return m.trim()
						.toString();
				});
				self.log('info', 'Connected to database');
				fulfill(self);
			}
		});

	});
};


/**
 * A wrapper for mongojs .collection()
 * @method function
 * @param  {[type]} collection [description]
 * @return {[type]} [description]
 */
DB.prototype.collection = function (collection) {
	return this.db.collection(collection);
};




/**
 * Fetch all records from a specific collection, using specified search parameters
 * and return a promise
 *
 * @method fetchAllRecords
 * @param  {string}        collection The name of the collection you want to fetch
 * @param  {object}        search     Parameters to apply to your search
 * @param  {Function}      callback   A method to execute when the search completes
 * @return {promise}        A promise
 */
DB.prototype.fetchAllRecords = function (collection, options) {
	var self = this;
	options = options || {};
	if (self.collections.indexOf(collection) <= -1) {
		return Promise.reject(new Error('Invalid collection: ' + collection));
	}
	if (!self.isValidSearchObject(options)) {
		return Promise.reject('Invalid search criteria');
	}
	var search = options.search || {};
	var limit = options.limit || Infinity;
	var skip = options.skip || 0;
	return new Promise(function (success, failure) {
		if (search._id)
			search._id = ObjectId(search._id);
		self.db.collection(collection)
			.find(search)
			.limit(limit)
			.skip(skip, function (err, docs) {
				if (err) failure(err);
				else
					success(docs);
			});
	});
};

/**
 * [createRecord description]
 * @method createRecord
 * @param  {object}     record     [description]
 * @param  {string}     collection [description]
 * @return {Promise}     [description]
 */
DB.prototype.createRecord = function (record, collection) {
	var self = this;
	if (_.isEmpty(record) || _.isNull(record) || !record)
		return Promise.reject(new Error('Invalid record'));
	if (this.collections.indexOf(collection) <= -1)
		return Promise.reject(new Error('Invalid collection: ' + collection));
	return new Promise(function (success, failure) {
		self.hook(collection, 'beforeSave', record)
			.then(function (data) {
				self.db.collection(collection)
					.insert(data, function (err, doc) {
						if (err){
							self.log('info', collection + "\tERROR\t" + JSON.stringify(err));
							failure(err);
						}
						else {
							self.log('info', collection + "\tCREATE\t" + JSON.stringify(record));
							self.hook(collection, 'afterSave', doc)
								.then(function (record) {
									success(record);
								}, function (err) {
									failure(err);
								});
						}
					});
			});
	});
};

/**
 * [updateRecord description]
 * @method updateRecord
 * @param  {[type]}     record     [description]
 * @param  {[type]}     collection [description]
 * @return {[type]}     [description]
 */
DB.prototype.updateRecord = function (record, collection) {
	var self = this;
	if (this.collections.indexOf(collection) <= -1)
		return Promise.reject(new Error('Invalid collection ' + collection));
	return new Promise(function (success, failure) {
		self.hook(collection, 'beforeSave', record)
			.then(function (record) {
				var tosave = _.clone(record);
				var unset = { highwayTempProp : ''};
				for(var i in record){
					if(record[i] === undefined)
						unset[i] = '';
				}
				delete unset._id;

				if (record._id) {
					self.collection(collection)
						.update({
							"_id": ObjectId(record._id)
						}, {
							$set: tosave,
							$unset: unset
						}, function (err, docs) {
							if (err){
								self.log('info', collection + "\tERROR\t" + JSON.stringify(err));
								failure(err);
							}else {
								self.log('info', collection + "\tUPDATE\t" + JSON.stringify(record));
								self.hook(collection, 'afterSave', record)
									.then(function (docs) {
										success(docs);
									}, function (err) {
										failure(err);
									});
							}
						});
				} else {
					self.collection(collection).insert(record, function (err, doc) {
						if (err) failure(err);
						else {
							self.log('info', collection + "\tCREATE\t"+ JSON.stringify(doc));
							self.hook(collection, 'afterSave', doc)
								.then(function (record2) {
									success(record2);
								}, function (err) {
									failure(err);
								});
						}
					});
				}


			});
	});
};


/**
 * [replaceRecord description]
 * @method replaceRecord
 * @param  {[type]}     record     [description]
 * @param  {[type]}     collection [description]
 * @return {[type]}     [description]
 */
DB.prototype.replaceRecord = function (record, collection) {
	var self = this;
	if (this.collections.indexOf(collection) <= -1)
		return Promise.reject(new Error('Invalid collection ' + collection));
	if (!record._id)
		return Promise.reject(new Error('No _id provided'));
	return new Promise(function (success, failure) {
		self.hook(collection, 'beforeSave', record)
			.then(function (record) {

				var bulk = self.collection(collection).initializeOrderedBulkOp();
				bulk.find({ _id : ObjectId(record._id)}).replaceOne(record);



				bulk.execute(function (err, res) {
				  console.log('Done!');
				});
					self.collection(collection)
						.replaceOne({
							"_id": ObjectId(record._id)
						}, {
							$set: tosavet
						}, function (err, docs) {
							if (err)
								failure(err);
							else {
								self.log('info', collection + "\tREPLACE\t" + JSON.stringify(record));
								self.hook(collection, 'afterSave', record)
									.then(function (docs) {
										success(docs);
									}, function (err) {
										failure(err);
									});
							}
						});
			});
	});
};



/**
 * [deleteRecord description]
 * @method deleteRecord
 * @param  {[type]}     _id        [description]
 * @param  {[type]}     collection [description]
 * @return {[type]}     [description]
 */
DB.prototype.deleteRecord = function (_id, collection) {
	var self = this;
	if (this.collections.indexOf(collection) <= -1)
		return Promise.reject(new Error('Invalid collection'));
	return new Promise(function (success, failure) {
		self.hook(collection, 'beforeDelete', _id)
			.then(function (record) {
				self.collection(collection)
					.remove({
						"_id": ObjectId(_id)
					}, function (err, doc) {
						if (err){
							self.log('info', collection + "\tERROR\t" + JSON.stringify(err));
							failure(err);
						} else {
						self.log('info', collection + "\tDELETE\t" + _id);
						self.hook(collection, 'afterDelete', doc)
							.then(function (record) {
								success(record);
							});
						}
					});
			});
	});

};

/**
 * [hook description]
 * @method hook
 * @param  {[type]} collection [description]
 * @param  {[type]} hook       [description]
 * @param  {[type]} data       [description]
 * @return {[type]} [description]
 */
DB.prototype.hook = function (collection, hook, data) {
	var self = this;
	return new Promise(function (success, failure) {
		if (self.hooks && self.hooks[collection] && typeof self.hooks[collection][hook] == 'function') {
			try {
				self.hooks[collection][hook](self, data)
					.then(function (d) {
						success(d);
					});
			} catch (x) {
				failure(x);
			}
		} else {
			success(data);
		}
	});


};

DB.prototype.isValidSearchObject = function (object) {
	var ret = true;

	for (var i in object) {
		if (i != 'search' && i != 'limit' && i != 'skip')
			ret = false;
	}

	return ret;
};

module.exports = DB;
