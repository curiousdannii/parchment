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
	return value << 16 >> 16;
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
},
	
// Perform some micro optimisations
optimise = function( code )
{
	return code
	
	// Sign conversions
	.replace( /(e\.)?U2S\(([^(]+?)\)/g, '(($2)<<16>>16)' )
	.replace( /(e\.)?S2U\(([^(]+?)\)/g, '(($2)&65535)' )
	
	// Bytearray
	.replace( /([\w.]+)\.getUint8\(([^(]+?)\)/g, '$1[$2]' )
	.replace( /([\w.]+)\.getUint16\(([^(]+?)\)/g, '($1[$2]<<8|$1[$2+1])' );
},
// Optimise some functions of an obj, compiling several at once
optimise_obj = function( obj, funcnames )
{
	var funcname, funcparts, newfuncs = [];
	for ( funcname in obj )
	{
		if ( funcnames.indexOf( funcname ) >= 0 )
		{
			funcparts = /function\s*\(([^(]*)\)\s*\{([\s\S]+)\}/.exec( '' + obj[funcname] );
			/* DEBUG */
				newfuncs.push( funcname + ':function ' + funcname + '(' + funcparts[1] + '){' + optimise( funcparts[2] ) + '}' );
			/* ELSEDEBUG
				newfuncs.push( funcname + ':function(' + funcparts[1] + '){' + optimise( funcparts[2] ) + '}' );
			/* ENDDEBUG */
		}
	}
	extend( obj, window['eval']( '({' + newfuncs.join() + '})' ) );
};

/* DEBUG */

// Debug flags
var debugflags = {},
get_debug_flags = function( data )
{
	data = data.split( ',' );
	var i = 0;
	while ( i < data.length )
	{
		debugflags[data[i++]] = 1; 
	}
};
if ( parchment && parchment.options && parchment.options.debug )
{
	get_debug_flags( parchment.options.debug );
}

/* ENDDEBUG */