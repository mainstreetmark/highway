var Email = function (options) {
    var self = this;
    self.options = options || {};

    return self;
}

Email.prototype.getOption = function(key){
  return self.options[key] || '';
}

Email.prototype.bulidMessage = function(to, message, options){
  var out = {
    to: to,
    subject: ''
  };

  options = options || {};

  switch(typeof message){
    case 'string':
      if(self.settings.messages[message]){
        _.extend(out, self.settings.messages[message])
      } else {
        console.log('No message named '+ message +' exists. Exiting');
        return false;
      }
      break;
    case 'object':
      _.extend(out, message);
      break;
    case 'undefined':
    default:
      console.log('No message provided.');
      return false;;
    break;
  }

  if(out.template){
    out.html = _.template(require(out.template))(options);
    delete out.template;
  }

  return out;
}

Email.prototype.Send = function (to, message, options) {

  if(!self.options.transporter){
    console.log('No valid transporter provided, unable to send message');
    return false;
  }

	var nodemailer = require( 'nodemailer' );

	// create reusable transporter object using the default SMTP transport
	var transporter = nodemailer.createTransport( self.options.transporter );

	// send mail with defined transport object
	transporter.sendMail( this.buildMessage(to, message, options), function ( error, info ) {
		if ( error ) {
			return console.log( error );
		}
		console.log( 'Email message sent: ' + info.response );
	} );
}

module.exports = Email;
