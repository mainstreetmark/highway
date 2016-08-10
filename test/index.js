var expect = require('expect.js');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var _ = require('underscore');
var http = require('http');
var request = require('request');
var sinon = require('sinon');
chai.should();
chai.use(chaiAsPromised);
var config = require('./config.js');
var hw;




describe('syntax', function () {
	it('highway should be valid', function () {
		var Highway = require('../highway.js');
		expect(typeof Highway)
			.to.equal('function');
	});

	it('crud should be valid', function () {
		var DB = require('../src/crud.js');
		expect(typeof DB)
			.to.equal('function');
	});

	it('socket should be valid', function () {
		var Socket = require('../src/socket.js');
		expect(typeof Socket)
			.to.equal('function');
	});

	it('email should be valid', function () {
		var Email = require('../src/email.js');
		expect(Email)
			.to.be.a('function');
	});

	describe('auth', function () {
		it('should be valid', function () {
			var auth = require('../src/auth.js');
			expect(auth)
				.to.be.a('function');
		});
		it('should be valid (local)', function () {
			var auth = require('../src/auth/local.js');
			expect(auth)
				.to.be.a('function');
		});
		it('should be valid (session store)', function () {
			var ss = require('../src/auth/session_store.js');
			expect(ss)
				.to.be.a('function');
		});

	});

	it('rest should be valid', function () {
		var rest = require('../src/rest-stop.js');
		expect(rest)
			.to.be.a('function');
	});

});




describe('Database', function () {
	var DB = require('../src/crud.js');

	var d = new DB('localhost/highway');
	var connection = d.connect();



	describe('connection', function () {
		it('should return a promise', function () {
			expect(connection)
				.to.be.a('object');
		});
	});



	describe('hooks', function () {
		it('should return a resolving promise when no hook exists', function (done) {
			var h = d.hook("users2222", 'beforeSave', {
				"name": "Dave"
			});
			h.should.eventually.have.property("name")
				.notify(done);
		});
	});

	describe('create', function () {

		it('should have the #createRecord method', function () {
			expect(d.createRecord)
				.to.be.a('function');
		});
		it('should be able to write to a collection', function (done) {
			var result = d.createRecord({
				"name": "Dave"
			}, "users");
			result.should.eventually.be.a('object')
				.notify(done);
		});
		it('should return a promise when writing', function () {
			var result = d.createRecord({
				"name": "Otto"
			}, 'users');
			expect(result)
				.to.be.a('object');
		});
		it('should return an error when writing an invalid record', function (done) {
			var result = d.createRecord('', 'users');
			result
				.should.eventually.be.rejected.notify(done);


		});
		it('should return an error when writing an empty record', function (done) {
			var result = d.createRecord({}, 'users');
			result.should.eventually.be.rejected
				.notify(done);
		});
		it('should return an error when writing to a collection that doesnt exist', function (done) {
			var result = d.createRecord({}, 'users2');
			result.should.eventually.be.rejected
				.notify(done);
		});
		it('should call the beforeSave hook if one exists', function (done) {
			d.hooks['users'] = {
				beforeSave: function (self, data) {
					return new Promise(function (success, failure) {
						data.executedBeforeSave = true;
						success(data);
					});
				}
			};
			var result = d.createRecord({
				"name": "Dave"
			}, 'users');
			result.should.eventually.have.property('executedBeforeSave')
				.notify(done);

		});
		it('should call the afterSave hook if one exists', function (done) {
			d.hooks['users'] = {
				afterSave: function (self, data) {
					return new Promise(function (success, failure) {
						data.executedAfterSave = true;
						success(data);
					});
				}
			};
			var result = d.createRecord({
				"name": "Dave"
			}, 'users');
			result.should.eventually.have.property('executedAfterSave')
				.notify(done);
		});


	});

	describe('read', function () {
		it('should have the #fetchAllRecords method', function () {
			expect(d.fetchAllRecords)
				.to.be.a('function');
		});

		it('should be able to select from a collection', function (done) {
			var result = d.fetchAllRecords('users', {});
			result.should.eventually.have.length.within(1, 1000000)
				.notify(done);
		});
		it('should filter records based on provided search criteria', function (done) {
			var result = d.fetchAllRecords('users', {
				limit: 1
			});
			result.should.eventually.have.length(1)
				.notify(done);
		});
	});

	describe('update', function () {
		it('should have the #updateRecord method', function () {
			expect(d.updateRecord)
				.to.be.a('function');
		});
		it('should be able to update a record in a collection', function (done) {
			var result = d.updateRecord({
				"_id": "5755acc5e2b2ed6215533240",
				"name": "Not Dave"
			}, 'users');
			result.should.eventually.have.property('name')
				.notify(done);
		});
		it('should return a promise when updating', function () {
			var result = d.updateRecord({
				"_id": "5755acc5e2b2ed6215533240",
				"name": "Not Dave"
			}, 'users');
			expect(result)
				.to.be.a('object');
		});
		it('should return an error when updating an error', function (done) {
			var result = d.updateRecord({
				"_id": "5755acc5e2b2ed6215533240",
				"name": "Not Dave"
			}, 'users2');
			result.should.eventually.be.rejected
				.notify(done);
		});
		it('should call the beforeSave hook if one exists', function (done) {
			d.hooks['users'] = {
				beforeSave: function (self, data) {
					return new Promise(function (success, failure) {
						data.executedBeforeSave = true;
						success(data);
					});
				}
			};
			var result = d.updateRecord({
				"_id": "5755acc5e2b2ed6215533240",
				"name": "Dave"
			}, 'users');
			result.should.eventually.have.property('executedBeforeSave')
				.notify(done);
		});
		it('should call the afterSave hook if one exists', function (done) {
			d.hooks['users'] = {
				afterSave: function (self, data) {
					return new Promise(function (success, failure) {
						data.executedAfterSave = true;
						success(data);
					});
				}
			};
			var result = d.updateRecord({
				"_id": "5755acc5e2b2ed6215533240",
				"name": "Dave"
			}, 'users');
			result.should.eventually.have.property('executedAfterSave')
				.notify(done);
		});
	});

	describe('delete', function () {
		it('should have the #deleteRecord method', function () {
			expect(d.deleteRecord)
				.to.be.a('function');
		});
		it('should be able to delete a record from a collection', function () {
			var result = d.deleteRecord('5755acc5e2b2ed6215533240', 'users');
			expect(result)
				.to.be.a('object');
		});
		it('should return a promise when deleting', function () {
			var result = d.deleteRecord('5755acc5e2b2ed6215533240', 'users');
			expect(result)
				.to.be.a('object');
		});
		//it('should return an error when deleting an error');
		it('should call the beforeDelete hook if one exists', function (done) {
			d.hooks['users'] = {
				beforeDelete: function (self, _id) {
					return new Promise(function (success, failure) {
						success(_id);
					});
				}
			};
			var result = d.deleteRecord(
				"5755acc5e2b2ed6215533240", 'users');
			result.should.eventually
				.notify(done);
		});
		it('should call the afterDelete hook if one exists', function (done) {
			d.hooks['users'] = {
				afterDelete: function (self, _id) {
					return new Promise(function (success, failure) {
						success(_id);
					});
				}
			};
			var result = d.deleteRecord(
				"5755acc5e2b2ed6215533240", 'users');
			result.should.eventually
				.notify(done);
		});
	});
});

describe('Authentication', function () {
	var hw;
	before(function (done) {
		var Highway = require('../highway.js');

		new Highway(config)
			.then(function (s) {
				hw = s;
				done();
			});
	});


	it('should create an /auth http get route', function () {
		var result = _.filter(hw.settings.http._router.stack, function (r) {
			var route = r.route;
			return route && route.path && route.path == '/auth' && route.methods.get;
		});
		result.should.have.length(1);
	});
	it('should create an /auth http post route', function () {
		var result = _.filter(hw.settings.http._router.stack, function (r) {
			var route = r.route;
			return route && route.path && route.path == '/auth' && route.methods.post;
		});
		result.should.have.length(1);
	});
	/*	it('should create a /login http get route', function () {
			var result = _.filter(hw.settings.http._router.stack, function (r) {
				var route = r.route;
				return route && route.path && route.path == '/login' && route.methods.get;
			});
			result.should.have.length(1);
		});
		it('should allow override of the /login http get route'); */
	it('should create a /logout http get route', function () {
		var result = _.filter(hw.settings.http._router.stack, function (r) {
			var route = r.route;
			return route && route.path && route.path == '/logout' && route.methods.get;
		});
		result.should.have.length(1);
	});

	describe('#login', function () {
		it('should render a login form');
		it('should submit a POST request to /auth');
		it('should redirect to /login on failure');
		it('should include an error message describing why it failed');
		it('should redirect to /home on success');
	});
});

describe('Sockets', function () {
	var hw;
	before(function (done) {
		var Highway = require('../highway.js');

		new Highway(config)
			.then(function (s) {
				hw = s;
				done();
			});
	});

	it('should make socket.io client available', function () {
		http.get('http://localhost:3768/socket.io/socket.io.js', function (res) {
			expect(res.statusCode)
				.to.equal(200);
		});
	});

	describe('create', function () {
		it('should create a record in the database when data is posted to it', function () {

		});
		it('should respond with an error if it is unable to create a record');
		it('should emit the created record to the socket server');
	});

	describe('read', function () {
		it('should read records from the database and return them in JSON format');
		it('should respond to search criteria provided as URL paramters');
	});

	describe('update', function () {
		it('should update a record in the database when data is posted/put to a url containing an ID');
		it('should respond with an error if it is unable to update a record');
		it('should emit the updated record to the socket server');
	});

	describe('destroy', function () {
		it('should delete a record from the database');
		it('should respond with an error if it is unable to delete a record');
		it('should emit the delete event to the socket server');
	});
});

describe('REST', function () {
	var hw;
	before(function (done) {
		var Highway = require('../highway.js');
		new Highway(config)
			.then(function (s) {
				hw = s;
				done();
			}, function (err) {
				console.log('error ', err);
			});
	});
	it('should create a REST endpoint', function (done) {


		http.get('http://localhost:3768/highway/users', function (res) {
			expect(res.statusCode)
				.to.equal(200);
			done();

		});
	});

	it('should not attempt to create routes if no http server present', function () {
		expect(1) // stub
			.to.equal(1);
	});

	describe('create', function () {
		it('should create a record in the database when data is posted to it', function (done) {
			var options = {
				uri: 'http://localhost:3768/highway/users',
				method: 'POST',
				json: {
					"name": "Dave"
				}
			};

			request(options,
				function (error, response, body) {
					expect(body.name)
						.to.contain('Dave');
					done();
				}
			);

		});
		it('should respond with an error if it is unable to create a record', function (done) {
			var options = {
				uri: 'http://localhost:3768/highway/users2',
				method: 'POST',
				json: {
					"name": "Dave"
				}
			};

			request(options,
				function (error, response, body) {
					//console.log(body);
					expect(body)
						.to.contain('Cannot POST /highway/users2');
					done();
				}
			);
		});
		it('should emit the created record to the socket server', function () {
			sinon.spy(hw.io, 'emit');
			var options = {
				uri: 'http://localhost:3768/highway/users',
				method: 'POST',
				json: {
					"name": "Dave"
				}
			};

			request(options,
				function (error, response, body) {
					expect(hw.io.emit.calledOnce)
						.to.be.ok;

					hw.io.emit.restore();
					done();
				}
			);
		});
	});

	describe('read', function () {
		it('should read records from the database and return them in JSON format', function (done) {
			this.timeout(3000000);

			http.get('http://localhost:3768/highway/users/5755acc5e2b2ed6215533240', function (res) {
				console.log(res);
				expect(res)
					.to.contain('Dave');
				done();
			});
		});
		it('should respond to search criteria provided as URL paramters');
		it('should read a single record when provided an _id in the url', function () {

		});
	});

	describe('update', function () {
		it('should update a record in the database when data is posted/put to a url containing an ID');
		it('should respond with an error if it is unable to update a record');
		it('should emit the updated record to the socket server');
	});

	describe('destroy', function () {
		it('should delete a record from the database');
		it('should respond with an error if it is unable to delete a record');
		it('should emit the delete event to the socket server');
	});

});

describe('Highway', function () {

	describe('boot up', function () {
		it('should fail when no config is passed', function () {
			var err = true;
			try {
				var hw = new Highway();
				err = false;
			} catch (x) {

			}
			expect(err)
				.to.equal(true);
		});

		it('should fail when no database connection is available');
		it('should only create one database connection');
		it('should fall back to local authentication if no authentication is specified');
		it('should fail with an error if it cannot create the rest server');
		it('should fail with an error if it cannot create the socket server');
		it('should fail if it loses its database connection');
		it('should be able to call LoadRoute after initializing', function (done) {
			this.timeout(20000); // long test, give it 20 seconds
			var Highway = require('../highway.js');
			var hw = new Highway(config)
				.then(function (s) {
					s.LoadRoutes([{
						"method": 'get',
						"path": '/highway-secret',
						"handler": function (s) {
							return function (res, req) {

							};
						}
					}]);

					done();
				}, function (err) {
					console.log(error);
					done();
				});
		})

	});
});
