/*

A simple Model and ORM system
=============================

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

After exploring some JS MVC options I've decided to try writing my own. I'm not opposed to using another, and might consider more options again in the future, if this proves insufficient.

TODO:
	Do we ever save(1)? If not, then remove propagate option

*/

// Models are simple schema-less objects
var Model = Object.subClass({
	// Add properties to the object
	init: function( props )
	{
		extend( this, props );
		
		// Relational mapping
		var has = this._has,
		Class;
		if ( has )
		{
			for ( Class in has )
			{
				this[Class] = new Collection( Model.models[Class], this );
				this[Class].fetch( has[Class] );
			}
		}
		
		if ( this._init_data )
		{
			this.data();
		}
		
		this._id = this._id || this._id_prop && this[this._id_prop] || Model.id++
	},
	
	// Save an instance to localStorage
	save: function( propagate )
	{
		var data = {},
		itemid,
		has = this._has,
		hasdata = {},
		savehas;
		
		for ( itemid in this )
		{
			// Don't save undefined props, _ props, Collections or functions!
			if ( this[itemid] != undefined && itemid.charAt(0) != '_' && !Model.models[itemid] && typeof this[itemid] != 'function' )
			{
				data[itemid] = this[itemid];
			}
		}
		
		// Save related models
		if ( has )
		{
			for ( itemid in has )
			{
				if ( this[itemid].length )
				{
					hasdata[itemid] = this[itemid].save( propagate );
					savehas = 1;
				}
			}
			data._has = savehas && hasdata;
		}
		storage.set( this._Class + this._id, data );
	},
	
	// Set a property - please run this so that we will stay up to date
	set: function( prop, value )
	{
		this[prop] = value;
		this.save();
	},
	
	// Access associated data
	data: function( data )
	{
		var datastring = 'DATA' + this._Class + this._id;
		if ( data != undefined )
		{
			storage.set( datastring, data );
		}
		else
		{
			return this._data = this._data || storage.get( datastring );
		}
	}
}),

// Collections are Object groups of Model instances
Collection = Object.subClass.call( Array, {
	init: function( Class, parent )
	{
		this.Class = Class;
		this._parent = parent;
	},
	
	// Get the collection index from localStorage
	// note: will first empty the collection
	fetch: function( index )
	{
		var itemid, item,
		i = this.length = 0;
		index = index || storage.get( 'INDEX' + this.Class.Class );
		if ( index )
		{
			while ( i < index.length )
			{
				itemid = index[i++];
				item = storage.get( this.Class.Class + itemid );
				if ( item )
				{
					item._id = itemid;
					this.add( new this.Class( item ) );
				}
			}
		}
	},
	
	// Save the Collection back to localStorage
	save: function( propagate )
	{
		var data = [],
		i = 0,
		item;
		
		while ( i < this.length )
		{
			item = this[i++];
			data.push( item._id );
			if ( propagate )
			{
				item.save();
			}
		}
		if ( this._parent )
		{
			return data;
		}
		storage.set( 'INDEX' + this.Class.Class, data );
	},
	
	add: function( instance )
	{
		this.push( instance );
		instance._parent = this;
		instance.save();
		( this._parent || this ).save();
	},
	
	// Find instances that match a property
	find: function( prop, value )
	{
		var newcollection = new Collection( this.Class, this._parent ),
		itemid, item,
		i = 0;
		while ( i < this.length )
		{
			item = this[i++];
			if ( item[prop] == value )
			{
				newcollection.push( item );
			}
		}
		return newcollection;
	}
});

extend( Model, {
	// Provide class names when subclassing Models
	subClass: function( Class, props )
	{
		props = props || {};
		props._Class = Class;
		var newmodel = Object.subClass.call( this, props );
		extend( newmodel, {
			Class: Class,
			subClass: Model.subClass
		});
		Model.models[Class] = newmodel;
		return newmodel;
	},
	
	// A list of models
	models: {},
	
	// Default ID
	id: ( new Date() ).getTime(),
});