function FatalError(message) {
  this.message = message;
  this.traceback = this._makeTraceback(arguments.callee);
  this.onError(this);
}

FatalError.prototype = {
  onError: function(e) { },

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
