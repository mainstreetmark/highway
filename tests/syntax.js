var Highway = require( '../highway.js' );

describe('homepage', function(){
  it('should respond to GET',function(){
    superagent
      .get('http://localhost:'+port)
      .end(function(res){
        expect(res.status).to.equal(200);
    })
  })
});