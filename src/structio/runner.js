/*

StructIO runner
===============

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

Runners are Parchment's glue: they connect an engine to it's IO system and to the Library
Not all runners are subclassed from Runner - there might be too little common code to make that worthwhile
All runners do however need to support the same basic API:
	init( env, engine )
		env = parchment.options
		engine = the VM class's name, if given in the definition
	fromParchment( event )
		Needs to handle these events: load, restart, save, restore
	toParchment( event ) -> Will be added by the Parchment Library

TODO:
	Support Workers
	Support errors in the Worker-like protocol

*/

// A basic StructIO runner
var Runner = Object.subClass({

	init: function( env, engine )
	{
		var self = this;
		// engine is only a class name, so make an instance now
		engine = window.engine = this.e = new window[engine]();
		this.io = new StructIO( env );
		
		// Set the appropriate event handlers
		this.toEngine = this.io.TextInput.callback = function( event ) { engine.inputEvent( event ); };
		engine.outputEvent = function( event ) { self.fromEngine( event ); };
	},
	
	// Handler for events from Parchment
	fromParchment: function( event )
	{
		var code = event.code;
		
		// Load the story file
		if ( code == 'load' )
		{
			event.env = this.io.env;
		}

		// Restart, save, restore -> just return to the engine

		this.toEngine( event );
	},
	
	// Handler for output events from the VM
	fromEngine: function( orders )
	{
		var	engine = this.e,
		i = 0,
		order, code,
		sendevent;
		
		// Send the orders to StructIO
		this.io.event( orders );
		
		// Go through the orders for anything non-StructIO
		for ( ; i < orders.length; i++ )
		{
			order = orders[i];
			code = order.code;
			
			if ( code == 'quit' )
			{
				return;
			}
			
			if ( code == 'save' || code == 'restore' )
			{
				this.toParchment( order );
			}
			
			if ( code == 'restart' )
			{
				// Reset the IO structures
				this.io.target = this.io.container.empty();
				sendevent = 1;
			}
			
			// Tick - ie, do nothing
			if ( code == 'tick' )
			{
				sendevent = 1;
			}
		}
		
		if ( sendevent )
		{
			this.toEngine( order );
		}
	}

});