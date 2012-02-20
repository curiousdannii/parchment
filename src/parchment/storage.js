/*

A simple key/value storage system using
IndexedDB, LocalStorage and Flash Shared Objects
================================================

Copyright (c) 2011-2012 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Flash support: default for LOCAL, because loading extra files is no harm
		Offer to Undum developer when complete

*/

var storage_factory = (function(){

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,
localStorage = window.localStorage,

// IndexedDB class
IndexedDBClass = Object.subClass({
	persist: 1,
	init: function( db, callback )
	{
		var self = this;
		this.db = db;
		// Error handler?
		
		// Set the version
		if ( db.version == '1' )
		{
			callback( this );
		}
		else
		{
			db.setVersion( '1' ).onsuccess = function()
			{
				// Add our object store
				db.createObjectStore( 'data' );
				callback( self );
			};
		}
	},
	get: function( key, callback, keyprefix )
	{
		var transaction = this.db.transaction( 'data' ),
		objectStore = transaction.objectStore( 'data' ),
		data = {},
		i = 0;
		
		// Get several keys at once
		if ( keyprefix != undefined )
		{
			// Run the callback once all the data has been retrieved
			transaction.oncomplete = function()
			{
				callback( data );
			}
			// Make a request for each key
			while ( i < key.length )
			{
				(function( key ) {
					objectStore.get( keyprefix + key ).onsuccess = function( event )
					{
						data[key] = event.target.result;
					};
				})( key[i++] );
			}
		}
		// Or just one
		else
		{
			objectStore.get( key ).onsuccess = function( event )
			{
				callback( event.target.result );
			};
		}
	},
	set: function( key, value )
	{
		this.db
			.transaction( 'data', 1 /* IDBTransaction.READ_WRITE */ )
			.objectStore( 'data' )
			.put( value, key );
	}
}),

// LocalStorage/fake storage class
LocalStorageClass = Object.subClass({
	init: function( name )
	{
		this.name = name;
		// If we don't have localStorage then fake it, but mark us as non-persistant
		this.storage = localStorage || {};
		this.persist = !!localStorage;
	},
	get: function( key, callback, keyprefix )
	{
		var rJSON = /^[[{]/,
		data,
		dataobj = {},
		i = 0;
		
		// Get several keys at once
		if ( keyprefix != undefined )
		{
			// Make a request for each key
			while ( i < key.length )
			{
				data = this.storage[this.name + keyprefix + key[i]];
				dataobj[key[i++]] = rJSON.test( data ) ? JSON.parse( data ) : data;
			}
			callback( dataobj );
		}
		// Or just one
		else
		{
			data = this.storage[this.name + key];
			callback( rJSON.test( data ) ? JSON.parse( data ) : data );
		}
	},
	set: function( key, value )
	{
		this.storage[this.name + key] = typeof value == 'string' ? value : JSON.stringify( value );
	}
}),

storage_factory = function( dbname, callback )
{
	// Use Flash if we have to
	// Nothing cool works from file: :(
	if ( LOCAL || ( !indexedDB && !localStorage ) )
	{
	}
	// Try IndexedDB
	else if ( indexedDB )
	{
		var request = indexedDB.open( dbname );
		
		// Success! Create the storage object
		request.onsuccess = function()
		{
			new IndexedDBClass( request.result, callback );
		};
		// No luck, so kill our IndexedDB reference
		request.onerror = function()
		{
			indexedDB = undefined;
			storage_factory( dbname, callback );
		};
	}
	// LocalStorage/Fake
	else
	{
		callback( new LocalStorageClass( dbname ) );
	}
};

return storage_factory;

})();