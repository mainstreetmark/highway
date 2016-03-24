var Highway = function(settings){
	var MongoClient = require('mongodb').MongoClient;
	var mongojs = require('mongojs');
	var ObjectId = require('mongojs').ObjectId;
	var _ = require('underscore');
	var express = require('express');
	var bodyParser = require('body-parser');
	var cookieParser = require('cookie-parser');
	
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
	
	
	MongoClient.connect('mongodb://'+settings.uri.replace('mongodb://','')+'/'+settings.database, listCollectionsCallback)
	
	function SetUpREST(collection, sockets){
		if(!settings.http){
			console.log('no http provided, aborting rest routes');
			return false;
		}
		router = self.router;
		
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
		self.settings.http.use(bodyParser.urlencoded({ extended: false }))
		self.settings.http.use(bodyParser.json());
		self.router = express.Router();
		while( (collection = collections.pop()) !== undefined){
			if(collection != '' && collection != 'system.indexes'){
				self.sockets[collection] = self.io.of('/'+settings.database+'/'+collection);
				SetUpSockets(collection);
				SetUpREST(collection);
			}
		}
		self.settings.http.use('/', self.router);
	}

	function listCollectionsCallback(err, db) {
		if(err){ return err; }
		self.db = mongojs(db, [])
		handleAuthentication(db);
		self.db.getCollectionNames(collectionList);
	}
	
	function handleAuthentication(){
		
		var passport = require('passport');
		var LocalStrategy = require('passport-local').Strategy;
		var session    = require('express-session');
		var MongoStore = require('connect-mongostore')(session);
		//var passportSocketIo = require('passport.socketio');
		var secret = self.settings.auth_secret || 'highwaysecret';

		self.settings.http.use(session({
			secret: secret,
			store: new MongoStore({ host: self.settings.uri, 'db': self.settings.database }), // use current database for sessions
			resave: true,
			saveUninitialized: true
		}));
		

		passport.use(new LocalStrategy({
			usernameField: 'email',
			passReqToCallback : true
		},
		  function(req, username, password, done) {
		    self.db.collection('users').findOne({ email: username }, function(err, user) {
		      if (err) { return done(err); }
		      if (!user) {
		        return done(null, false, { message: 'Incorrect email.' });
		      }

			  var bcrypt = require('bcrypt');
			  var salt = bcrypt.genSaltSync(10);
		      if (!bcrypt.compareSync(password, user.password)) {
		        return done(null, false, { message: 'Incorrect password.' });
		      }
			      return done(null, user);
		    });
		  }
		));

		passport.serializeUser(function(user, done) {
			delete user.password;  // Remove password from serialized user
		  done(null, user);
		});

		passport.deserializeUser(function(user, done) {
		  done(null, user);
		});

	    self.settings.http.use(passport.initialize());
		self.settings.http.use(passport.session());
		

		//self.settings.io.use(passportSocketIo.authorize({
		//  cookieParser: cookieParser,       // the same middleware you registrer in express
		//  key:          'express.sid',       // the name of the cookie where express/connect stores its session_id
		//  secret:       secret,    // the session_secret to parse the cookie
		//  store:  new MongoStore({'db': 'sessions'}),        // we NEED to use a sessionstore. no memorystore please
		 // success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
		 // fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
			//}));
			
		self.settings.http.post('/auth',
		  passport.authenticate('local', {
			  failureRedirect: '/loginerror'
		  }),
		  function(req, res){
			  console.log(req.session);
			  res.redirect('/');
		  } 
	  	);

		self.settings.http.get('/logout', function(req, res){
		  req.logout();
		  res.redirect('/');
		});


	  self.settings.http.get('/loginerror', function(req,res) {
	      console.log(req.flash('error'));
	      res.redirect('/login');
	  });


		self.settings.http.get('/', passport.authorize('local', { failureRedirect: '/fart'}), function(req, res){
			res.send('oh, hey there!')
		} );
		
		
	}

	return self;	
}

module.exports = Highway;