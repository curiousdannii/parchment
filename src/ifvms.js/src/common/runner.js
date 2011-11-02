/*

ifvms.js VM runner
==================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

// A basic ifvms.js runner
var Runner = Object.subClass({

	init: function( engine, io, data )
	{
		var self = this;
		this.e = engine;
		this.io = io;
		
		// Set the appropriate event handlers
		this.inputEvent = function( event ) { engine.inputEvent( event ); };
		io.input = this.inputEvent;
		engine.outputEvent = function( event ) { self.outputEvent( event ); };
		
		// Start it up
		this.inputEvent({
			code: 'load',
			data: data
		});
		this.inputEvent({
			code: 'restart',
			env: io.env
		});
	},

	// Handler for output events from the VM
	outputEvent: function( orders )
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
			
			if ( code == 'save' )
			{
				// For now just store the save file here
				// Later we'll want to talk to the Library
				this.savefile = order.data;
				sendevent = 1;
			}
			
			if ( code == 'restart' )
			{
				// Reset the IO structures
				this.io.target = this.io.container.empty();
				sendevent = 1;
			}
			
			if ( code == 'restore' )
			{
				order.data = this.savefile;
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
			this.inputEvent( order );
		}
	}

});