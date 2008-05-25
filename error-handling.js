function FatalError(message) {
  this.message = message;
  this.onError(this);
}

FatalError.prototype = {
  onError: function(e) { }
}
