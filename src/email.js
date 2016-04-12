var Email = function (options) {
    var self = this;
    self.options = options || {};

    return self;
}

Email.prototype.getOption = function(key){

}

Email.prototype.Send = function (message) {

  if(!self.options.transporter){
    console.log('No valid transporter provided, unable to send message');
    return false;
  }

	var nodemailer = require( 'nodemailer' );

	// create reusable transporter object using the default SMTP transport
	var transporter = nodemailer.createTransport( self.options.transporter );

	// setup e-mail data with unicode symbols
	var mailOptions = {
		from:     this.getOption('from'), // sender address
		to:       this.getOption('to'), // list of receivers
		subject:  this.getOption('subject'), // Subject line
		text:     this.getOption('text'), // plaintext body
		html:     this.getOption('html') // html body
	};

	// send mail with defined transport object
	transporter.sendMail( mailOptions, function ( error, info ) {
		if ( error ) {
			return console.log( error );
		}
		console.log( 'Message sent: ' + info.response );
	} );
}

module.exports = Email;
