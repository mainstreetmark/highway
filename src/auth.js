// This is the main auth module for highway
//
function Auth( self ) {
	var strategy;
	for ( var i in self.settings.auth ) {
		strategy = self.settings.auth[ i ];

		switch ( strategy.strategy ) {
		case 'local':
			var LocalStrategy = require( './src/auth/local.js' );
			var local = new LocalStrategy( strategy );
			break;
		default:

			SetUpLocalAuthentication( strategy );
			break;
		}

	}


}

module.exports = Auth;
