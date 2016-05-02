var expect = require('expect.js');

var Highway = require( '../highway.js' );

describe('syntax', function(){
  it('should be valid',function(){
	  expect(typeof Highway).to.equal('function');
  })
});