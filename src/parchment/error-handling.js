(function($){

window.FatalError = function(message) {
  this.message = message;
  this.traceback = this._makeTraceback(arguments.callee);
  this.onError(this);
  
	// Hide load indicator
	if ( $('.load').length > 0 )
	{
		//self.hidden_load_indicator = 1;
		//self.library.load_indicator.detach();
		$('.load').detach();
	}
};

FatalError.prototype = {
  onError: function(e) {
  var message = e.message;
  //if (typeof e.message == "string")
  //  message = message.entityify();
  $( '#parchment' ).append('<div class="error">An error occurred:<br/>' +
                       '<pre>' + message + '\n\n' + e.traceback +
                       '</pre></div>');
	if ( window.console )
	{
		console.error( message );
	}
},

  _makeTraceback: function(procs) {
    // This function was taken from gnusto-engine.js and modified.
    var procstring = '';

    var loop_count = 0;
    var loop_max = 100;

    while (procs != null && loop_count < loop_max) {
      var name = procs.toString();

      if (!name) {
	procstring = '\n  (anonymous function)'+procstring;
      } else {
	var r = name.match(/function (\w*)/);

	if (!r || !r[1]) {
	  procstring = '\n  (anonymous function)' + procstring;
	} else {
          procstring = '\n  ' + r[1] + procstring;
	}
      }

      try {
        procs = procs.caller;
      } catch (e) {
        // A permission denied error may have just been raised,
        // perhaps because the caller is a chrome function that we
        // can't have access to.
        procs = null;
      }
      loop_count++;
    }

    if (loop_count==loop_max) {
      procstring = '...' + procstring;
    }

    return "Traceback (most recent call last):\n" + procstring;
  }
};

})(jQuery);
