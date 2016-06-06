var expect = require('expect.js');

var Highway = require('../highway.js');

describe('Instantiating', function () {

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

	it('should fail when not database connection is available');
	it('should only create one database connection');
	it('should fall back to local authentication if no authentication is specified');
});
