/*

Gnusto runner
=============

Copyright (c) 2012 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

// A Gnusto runner
var GnustoRunner = Object.subClass({

	init: function( env, engine )
	{
		var self = this;
		engine = window.engine = this.e = new GnustoEngine( window.console && function() { console.log( msg ); } || function(){} );
		this.io = new StructIO( env );
		this.env = this.io.env;
		
		// Set the appropriate event handlers
		this.io.TextInput.callback = function( event ) { self.inputEvent( event ); };
	},
	
	// Handler for events from Parchment
	fromParchment: function( event )
	{
		var code = event.code,
		engine = this.e,
		run;
		
		// Load the story file
		if ( code == 'load' )
		{
			engine.loadStory( event.data );
		}

		// (Re)start the engine
		if ( code == 'restart' )
		{
			this.restart();
			run = 1;
		}
		
		// Save a savefile
		if ( code == 'save' )
		{
			engine.answer( 0, event.result || 1 );
			run = 1;
		}
		
		// Restore a savefile
		if ( code == 'restore' )
		{
			if ( !this.ui )
			{
				this.restart();
			}
			if ( event.data )
			{
				engine.loadSavedGame( event.data )
			}
			else
			{
				engine.answer( 0, 0 );
			}
			run = 1;
		}
		
		if ( run )
		{
			this.run();
		}
	},
	
	restart: function()
	{
		var engine = this.e,
		io = this.io;
		
		// Header variables
		engine.setByte( 255, 0x20 );
		engine.setByte( io.env.width, 0x21 );
		engine.setWord( io.env.width, 0x22 );
		engine.setWord( 255, 0x24 );
		
		// Set up the ifvms.js ZVMUI
		io.target = io.container.empty();
		this.orders = [];
		this.ui = new ZVMUI( this, engine.getByte( 0x11 ) & 0x02 );
		io.event( this.orders );
		this.orders = [];
	},
	
	// Handle Gnusto's non-StructIO friendly IO protocol
	run: function()
	{
		var engine = this.e,
		ui = this.ui,
		text,
		effect, effect1, effect2,
		stop,
		i;
		
		this.orders = [];
		
		while ( !stop )
		{
			engine.run();

			text = engine.consoleText();
			if ( text )
			{
				ui.buffer += text;
			}

			effect = '"' + engine.effect( 0 ) + '"';
			effect1 = engine.effect( 1 );
			effect2 = engine.effect( 2 );

			if ( effect == GNUSTO_EFFECT_INPUT )
			{
				stop = 1;
				ui.flush();
				this.orders.push({
					code: 'read',
					target: this.currentwin
				});
			}
			if ( effect == GNUSTO_EFFECT_INPUT_CHAR )
			{
				stop = 1;
				this.orders.push({
					code: 'char'
				});
			}
			if ( effect == GNUSTO_EFFECT_SAVE )
			{
				stop = 1;
				engine.saveGame();
				this.toParchment({
					code: 'save',
					data: engine.saveGameData()
				});
			}
			if ( effect == GNUSTO_EFFECT_RESTORE )
			{
				stop = 1;
				this.toParchment({ code: 'restore' });
			}
			if ( effect == GNUSTO_EFFECT_QUIT )
			{
				stop = 1;
			}
			if ( effect == GNUSTO_EFFECT_RESTART )
			{
				engine.resetStory();
				this.restart();
				ui = this.ui;
			}
			if ( effect == GNUSTO_EFFECT_FLAGS_CHANGED )
			{
				ui.flush();
				ui.mono = ( ui.mono & 0xFD ) | engine.m_printing_header_bits & 0x2;
			}
			if ( effect == GNUSTO_EFFECT_STYLE )
			{
				if ( effect1 < 0 )
				{
					ui.set_colour( effect2, engine.effect(3) );
				}
				else
				{
					ui.set_style( effect1 );
				}
			}
			if ( effect == GNUSTO_EFFECT_SPLITWINDOW )
			{
				ui.split_window( effect1 );
			}
			if ( effect == GNUSTO_EFFECT_SETWINDOW )
			{
				ui.set_window( effect1 );
			}
			if ( effect == GNUSTO_EFFECT_ERASEWINDOW )
			{
				ui.erase_window( effect1 );
			}
			if ( effect == GNUSTO_EFFECT_ERASELINE )
			{
				ui.erase_line( effect1 );
			}
			if ( effect == GNUSTO_EFFECT_SETCURSOR )
			{
				ui.set_cursor( effect1, effect2 );
			}
			if ( effect == GNUSTO_EFFECT_GETCURSOR )
			{
				stop = 1;
				ui.get_cursor( effect1 );
			}
			if ( effect == GNUSTO_EFFECT_PRINTTABLE )
			{
				for ( i = 0; i < effect1; i++ )
				{
					ui.buffer += '\n' + engine.effect( 2 + i );
				}
			}
		}
		
		// Flush the buffer
		ui.flush();
		
		// Flush the status if we need to
		// Should instead it be the first order? Might be better for screen readers etc
		if ( ui.status.length )
		{
			this.orders.push({
				code: 'stream',
				to: 'status',
				data: this.ui.status
			});
			ui.status = [];
		}
		
		// Process the orders
		this.io.event( this.orders );
    },
	
	// Handler for input events to send to the VM
	inputEvent: function( data )
	{
		var engine = this.e,
		code = data.code,
		response;
		
		// Handle line input
		if ( code == 'read' )
		{
			this.ui.buffer += data.response + '\n';
			engine.answer( 0, data.terminator );
			engine.answer( 1, data.response );
		}
		
		// Handle character input
		if ( code == 'char' )
		{
			engine.answer( 0, data.response );
		}
		
		// Write the status window's cursor position
		if ( code == 'get_cursor' )
		{
			engine.setWord( data.addr, data.pos[0] );
			engine.setWord( data.addr + 2, data.pos[1] );
		}
		
		// Resume normal operation
		this.run();
	},
	
	// Dummy func needed by get_cursor()
	act: function(){}

});
