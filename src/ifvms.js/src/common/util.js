/*

Common untility functions
=================================================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

// Array.indexOf compatibility
if ( ![].indexOf )
{
	Array.prototype.indexOf = function( obj, fromIndex )
	{
		for ( var i = fromIndex || 0, l = this.length; i < l; i++ )
		{
			if ( this[i] == obj )
			{
				return i;
			}
		}
		return -1;
	};
}

// Utility to extend objects
var extend = function( old, add )
{
	for ( var name in add )
	{
		old[name] = add[name];
	}
	return old;
},

// Console dummy funcs
console = window.console || {
	log: function(){},
	info: function(){},
	warn: function(){}
},

// Utilities for 16-bit signed arithmetic
U2S = function( value )
{
	return ( (value & 0x8000) ? ~0xFFFF : 0 ) | value;
},
S2U = function( value )
{
	return value & 0xFFFF;
},

// Utility to convert from byte arrays to word arrays
byte_to_word = function( array )
{
	var i = 0, l = array.length,
	result = [];
	while ( i < l )
	{
		result[i / 2] = array[i++] << 8 | array[i++];
	}
	return result;
};