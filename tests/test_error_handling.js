load("error-handling.js");

// Make sure creating a FatalError works.
var e = new FatalError();
e = new FatalError("this is an error message");

// Make sure overriding onError works.
var lastError;

FatalError.prototype.onError = function(e) {
  lastError = e.message;
}

e = new FatalError("hello!");

if (lastError != "hello!") throw 1;
