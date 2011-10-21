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
		io.input = function( event ) { engine.inputEvent( event ); };
		engine.outputEvent = function( event ) { self.outputEvent( event ); };
		engine.inputEvent({
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
				engine.inputEvent({});
			}
		}
	}

});