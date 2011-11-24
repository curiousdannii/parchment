/*

Storage system
==============

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Flash support: default for LOCAL, because loading extra files is no harm
		Offer to Undum developer when complete

*/

var storage = (function( window, $ ){

var storage = {},

// JSON compatibility
JSON_parse = JSON ? JSON.parse : $.parseJSON,
JSON_stringify = JSON ? JSON.stringify : function( value )
{
	var i = 0,
	partial = [],
	temp;
	
	// A crude implementation of JSON.stringify
	switch ( typeof value )
	{
		case 'string':
			return JSON_stringify_quote( value );
        case 'number':
        case 'boolean':
            return String( value );
		case 'object':
			if ( !value )
			{
				return 'null';
			}
			// Array
			if ( Object.prototype.toString.apply( value ) == '[object Array]' )
			{
				while( i < value.length )
				{
					partial.push( JSON_stringify( value[i++] ) || 'null' );
				}
				return '[' + partial.join() + ']';
			}
			// Object
			for ( i in value )
			{
				//if ( Object.hasOwnProperty.call(value, i) )
				//{
					if ( temp = JSON_stringify( value[i] ) )
					{
						partial.push( JSON_stringify_quote( i ) + ':' + temp );
					}
				//}
			}
			return '{' + partial.join() + '}';
	}
},
// Very crude quoter
JSON_stringify_quote = function( string )
{
	return '"' + string.replace( /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\uffff]/g, function( a ) {
		return '\\u' + ( '0000' + a.charCodeAt( 0 ).toString( 16 ) ).slice( -4 );
	} ) + '"';
},

// First get our potential storage objects
//indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB,
localStorage = window.localStorage,
persist,

request,

build_storage = function()
{
	// Firstly try IndexedDB
	/*if ( indexedDB )
	{
		// Open our DB
		try
		{
			request = indexedDB.open( 'p' );
		}
		catch (e)
		{
			indexedDB = 0;
			return build_storage();
		};
	}*/
	
	// Otherwise try localStorage
	if ( localStorage )
	{
		persist = !LOCAL || !$.browser.mozilla;
	}
	// Or just use an object
	else
	{
		localStorage = {};
	}
	
	// Set the API
	extend( storage, {
		persist: persist,
		
		get: function( key, callback )
		{
			//callback( JSON_parse( localStorage[key] ) );
			var data = localStorage['parchment' + key];
			return /^[[{]/.test( data ) ? JSON_parse( data ) : data;
		},
		set: function( key, val )
		{
			localStorage['parchment' + key] = typeof val == 'string' ? val : JSON_stringify( val );
		}
	});
};

build_storage();

// We return the storage object now, but it will get filled in later
return storage;

})( this, jQuery );