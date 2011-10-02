/*

ZVM intro - various functions and compatibility fixes
=====================================================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	Use a bind function to eliminate needless closures
	Make class.js smarter to eliminate function layers
	Maybe use a custom OBJECT so that any other instance of class.js won't interfere - we would then include it in the compile zvm.js
	
*/
 
// Wrap all of ZVM in a closure/namespace, and enable strict mode
(function( window ){ 'use strict';

// In debug mode close the closure now
;;; })();

;;; var ZVM = 1, GVM = 0;

// Array.indexOf compatibility
// Note: the fromIndex parameter is not supported
var indexOf = function( array, obj )
{
	if ( [].indexOf )
	{
		return array.indexOf( obj );
	}
	
	for ( var i = 0, l = array.length; i < l; i++ )
	{
		if ( array[i] == obj )
		{
			return i;
		}
	}
	return -1;
},

// Utility to extend objects
extend = function( old, add )
{
	for ( name in add )
	{
		old[name] = add[name];
	}
	return old;
},

// Utility to bind!
// Instead emulate Function.prototype.bind?
bind = Function.prototype.bind ? function( obj, func )
{
	return func.bind( obj );
} :
function( obj, func )
{
	return function() {
		func.apply( obj, arguments );
	};
},

// Log wrapper
log = window.console ? function(){ console.log.apply( console, arguments ); } : function(){},

// Short cuts
//fromCharCode = String.fromCharCode,

// Utilities for 16-bit signed arithmetic
U2S = function( value )
{
	return ( (value & 0x8000) ? ~0xFFFF : 0 ) | value;
},
S2U = function( value )
{
	return value & 0xFFFF;
},

PARCHMENT_SECURITY_OVERRIDE = window.PARCHMENT_SECURITY_OVERRIDE;
