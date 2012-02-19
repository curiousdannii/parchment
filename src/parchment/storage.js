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

//IndexedDB class
IndexedDBClass = Object.subClass({
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

storage_factory = function( dbname, callback )
{
	// Nothing cool works from file: :(
	if ( LOCAL )
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
};

return storage_factory;

})();