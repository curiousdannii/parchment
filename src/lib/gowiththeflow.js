/*

gowiththeflow.js
================

Copyright Jerome Etienne
MIT licenced
https://github.com/jeromeetienne/gowiththeflow.js

*/

// I have switched the error and result callbacks around

var Flow	= function(){
	var self, stack = [], timerId = setTimeout(function(){ self._next(); }, 0);
	return self = {
		par	: function(callback, isSeq){
			if(isSeq || !(stack[stack.length-1] instanceof Array)) stack.push([]);
			stack[stack.length-1].push(callback);
			return self;
		},seq	: function(callback){ return self.par(callback, true);	},
		_next	: function(result, err){
			var errors = [], results = [], callbacks = stack.shift(), nbReturn = callbacks.length, isSeq = nbReturn == 1;
			callbacks && callbacks.forEach(function(fct, index){
				fct(function(result, error){
					errors[index]	= error;
					results[index]	= result;		
					if(--nbReturn == 0)	self._next(isSeq?results[0]:results, isSeq?errors[0]:errors)
				}, result, err)
			})
		}
	}
};