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
	},

	// Handler for output events from the VM
	outputEvent: function( data )
	{
		var	engine = this.e,
		i,
		orders = data;
		
		// Send the orders to StructIO
		this.io.event( orders );
		
		// Go through the orders for anything non-StructIO
		for ( i = 0; i < orders.length; i++ )
		{
			// Quit
			if ( orders[i].code == 'quit' )
			{
				return;
			}
			
			// Tick
			if ( orders[i].code == 'tick' )
			{
				this.inputEvent({});
			}
		}
	}

});