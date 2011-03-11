/*

Quixe definition
================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

parchment.vms.quixe = {
	id: 'quixe',
	
	// File pattern
	match: /(ulx|glb|(g|glulx.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: [
			'quixe.min.js',
			'../src/quixe/media/i7-glkote.css',
			'../src/quixe/media/dialog.css'
		],
	
	// Launcher. Will be run by jQuery.when(). The story file's jqXHR will be the first argument
	launcher: function( story )
	{
		var jqXHR = story[2],
		library = jqXHR.library;
		
		// Switch on the styles
		library.ui.stylesheet_switch( 'quixe', 1 );
		
		// Eventually stop loading gi_load.js and do this ourselves
		jQuery( '#parchment' ).html( '<div id="gameport"><div id="windowport"></div><div id="errorpane" style="display:none;"><div id="errorcontent">...</div></div><div id="layouttestpane">This should not be visible<div id="layouttest_grid" class="WindowFrame GridWindow"><div id="layouttest_gridline" class="GridLine"><span id="layouttest_gridspan" class="Style_normal">12345678</span></div><div id="layouttest_gridline2" class="GridLine"><span class="Style_normal">12345678</span></div></div><div id="layouttest_buffer" class="WindowFrame BufferWindow"><div id="layouttest_bufferline" class="BufferLine"><span id="layouttest_bufferspan" class="Style_normal">12345678</span></div><div id="layouttest_bufferline2" class="BufferLine"><span class="Style_normal">12345678</span></div></div></div></div>' );
		
		// Hide load indicator
		if ( jQuery('.load').length > 0 )
		{
			jQuery('.load').detach();
		}
		
		GiLoad.load_run( {
			inspacing: 0,     // gap between windows
			outspacing: 0     // gap between windows and edge of gameport
		}, jqXHR.responseArray, 'array' );
	}
};
parchment.vms.push( parchment.vms.quixe );