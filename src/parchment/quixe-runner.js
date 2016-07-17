/*

Quixe runner
============

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

// A Quixe runner
var QuixeRunner = Object.subClass({

	init: function( env, engine )
	{
		// GlkOte settings
		this.options = {
			inspacing: 0, // gap between windows
			outspacing: 0, // gap between windows and edge of gameport
			vm: Quixe, // default game engine
			//io: Glk, // default display layer
		};
		
		// Switch on the styles
		parchment.library.ui.stylesheet_switch( 'quixe', 1 );
		
		// Add the html Glkote needs
		jQuery( env.container ).html( '<div id="gameport"><div id="windowport"></div><div id="errorpane" style="display:none;"><div id="errorcontent">...</div></div><div id="layouttestpane">This should not be visible<div id="layouttest_grid" class="WindowFrame GridWindow"><div id="layouttest_gridline" class="GridLine"><span id="layouttest_gridspan" class="Style_normal">12345678</span></div><div id="layouttest_gridline2" class="GridLine"><span class="Style_normal">12345678</span></div></div><div id="layouttest_buffer" class="WindowFrame BufferWindow"><div id="layouttest_bufferline" class="BufferLine"><span id="layouttest_bufferspan" class="Style_normal">12345678</span></div><div id="layouttest_bufferline2" class="BufferLine"><span class="Style_normal">12345678</span></div></div></div></div>' );

	},
	
	// Handler for events from Parchment
	fromParchment: function( event )
	{
		var code = event.code;
		
		// Load the story file
		if ( code == 'load' )
		{
			Quixe.prepare( event.data, this.options );
		}

		// (Re)start the engine
		// For now ignore attempts to restore... GlkOte manages that itself
		if ( code == 'restart' || code == 'restore' )
		{
			Glk.init( this.options );
		}
	},

});
