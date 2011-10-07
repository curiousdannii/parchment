/*
 * Simple JavaScript Inheritance
 * http://ejohn.org/blog/simple-javascript-inheritance/
 *
 * By John Resig
 * Released into the public domain?
 *
 * Inspired by base2 and Prototype
 */
(function(){'use strict';
  var initializing = false,
  // Determine if functions can be serialized
  fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
  // Create a new Class that inherits from this class
  Object.subClass = function(prop) {
    var _super = this.prototype,
	proto = _super,
	name,
	Class;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
	initializing = true;
	proto = new this();
	initializing = false;
   
    // Copy the properties over onto the new prototype
    for (name in prop) {
      // Check if we're overwriting an existing function
      proto[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super,
			ret;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            ret = fn.apply(this, arguments);       
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    Class = proto.init ? function() {
      // All construction is actually done in the init method
      if ( !initializing )
        this.init.apply(this, arguments);
    } : function(){};
   
    // Populate our constructed prototype object
    Class.prototype = proto;
   
    // Enforce the constructor to be what we expect
    Class.constructor = Class;

    // And make this class extendable
    Class.subClass = Object.subClass;
   
    return Class;
  };
})();