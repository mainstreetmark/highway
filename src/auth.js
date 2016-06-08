// This is the main auth module for highway
//
function Auth(self) {


	var strategy;
	var out;
	for (var i in self.settings.auth) {
		strategy = self.settings.auth[i];

		switch (strategy.strategy) {
		case 'local':
			var LocalStrategy = require('./auth/local.js');
			out = new LocalStrategy(strategy, self);
			break;
		default:
			console.log('No strategy provided, aborting auth');
			break;
		}

	}

	return out;


}

module.exports = Auth;
