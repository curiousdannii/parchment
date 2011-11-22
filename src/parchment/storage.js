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

*/

var storage = (function( window, $ ){

var storage = {},

// JSON compatibility
JSON_parse = JSON ? JSON.parse : $.parseJSON,

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
			return JSON_parse( localStorage[key] );
		},
		set: function( key, val )
		{
			localStorage[key] = JSON.stringify( val );
		}
	});
};

build_storage();

// We return the storage object now, but it will get filled in later
return storage;

})( this, jQuery );