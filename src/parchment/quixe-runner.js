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
		/*// GlkOte settings
		this.options = {
			inspacing: 0, // gap between windows
			outspacing: 0, // gap between windows and edge of gameport
			vm: Quixe, // default game engine
			//io: Glk, // default display layer
		};*/
		
		// Add the html Glkote needs
		jQuery( env.container ).html( '<div id="gameport"><div id="windowport"></div><div id="errorpane" style="display:none;"><div id="errorcontent">...</div></div></div>' );

	},
	
	// Handler for events from Parchment
	fromParchment: function( event )
	{
		var code = event.code;
		
		// Load the story file
		if ( code == 'load' )
		{
			//Quixe.prepare( event.data, this.options );
			GiLoad.load_run( { set_page_title: true }, event.data, 'array' );
		}

		// (Re)start the engine
		// For now ignore attempts to restore... GlkOte manages that itself
		if ( code == 'restart' || code == 'restore' )
		{
			//Glk.init( this.options );
		}
	},

});
