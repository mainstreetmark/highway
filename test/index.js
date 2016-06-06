var expect = require('expect.js');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.should();
chai.use(chaiAsPromised);
var config = require('./config.js');



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


var Highway = require('../highway.js');

describe('Database', function () {
	var DB = require('../src/crud.js');

	describe('connection', function () {
		it('should return a promise', function () {
			var d = new DB('localhost/highway');
			var result = d.connect();
			expect(result)
				.to.be.a('object');
		});
		it('should fail with an error', function () {
			var d = new DB('invalidhost/highway');
			d.connect()
				.then(function () {}, function (err) {
					expect(err)
						.to.not.equal({});
				});
		});
	});

	describe('hooks', function () {
		it('should return a resolving promise when no hook exists', function () {
			var d = new DB('localhost/highway');
			d.connect()
				.then(function () {
					d.db.hook();
				}, function (err) {

				});
		});
	});

	describe('create', function () {
		var d = new DB('localhost/highway');
		d.connect();
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
		it('should call the beforeSave hook if one exists');
		it('should call the afterSave hook if one exists');


	});

	describe('read', function () {
		it('should be able to select from a collection');
		it('should filter records based on provided search criteria');
		it('should throw an error when passed invalid search criteria');
	});

	describe('update', function () {
		it('should be able to update a record in a collection');
		it('should return a promise when updating');
		it('should return an error when updating an error');
		it('should call the beforeSave hook if one exists');
		it('should call the afterSave hook if one exists');
	});

	describe('delete', function () {
		it('should be able to delete a record from a collection');
		it('should return a promise when deleting');
		it('should return an error when deleting an error');
		it('should call the beforeDelete hook if one exists');
		it('should call the afterDelete hook if one exists');
	});

	describe('search', function () {
		it('should be able to search the database');
		it('should generate an error if search criteria doesnt make sense');
	});

});

describe('Authentication', function () {
	it('should allow for a default user');
});

describe('Sockets', function () {
	it('should generate a socket server');
	it('should make socket.io client available');

	describe('create', function () {
		it('should create a record in the database when data is posted to it');
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
	it('should create a REST endpoint');
	it('should generate an error if not http server present');
	it('should generate an error if no socket server present');

	describe('create', function () {
		it('should create a record in the database when data is posted to it');
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

	});
});
