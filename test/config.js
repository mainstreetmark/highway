var config = {
	uri: 'localhost',
	database: 'highway',
	auth: [{
		defaultUser: '56fea5cc54d49c036c802e53',
		strategy: 'local',
		forceRootAuth: false,
		routes: {
			login: '/#login',
			passwordReset: '/password-reset'
		}
	}],

	onComplete: function (self, _, ObjectId) {

	},
	hooks: {
		revisions: require('../modules/revisions/server.js')
	}
};

module.exports = config;
