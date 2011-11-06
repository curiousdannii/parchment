/*

Gnusto definition
=================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

parchment.vms.gnusto = {
	id: 'gnusto',
	
	// File pattern
	match: /(z[1-8]|zlb|(z|zcode.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: [
		/* DEBUG */
			'../src/ifvms.js/src/zvm/quetzal.js',
			'../src/gnusto/remedial.js',
			'../src/gnusto/engine/gnusto-engine.js',
			'../src/gnusto/runner.js'
		/* ELSEDEBUG
			'gnusto.min.js'
		/* ENDDEBUG */
		],
	
	// Launcher. Will be run by jQuery.when(). The story file's jqXHR will be the first argument
	launcher: function( args )
	{
		// De-blorbify
		var mystory = new parchment.lib.Story( args[2].responseArray, storyName );
		
		// Load it up!
		window.engine = new GnustoEngine( window.console && function() { console.log( msg ); } || function(){} );
		window.runner = new GnustoRunner( engine, new StructIO( parchment.options.container ), mystory.zcode );
		
		/* savefile = location.hash
		if ( savefile && savefile != '#' ) // IE will set location.hash for an empty fragment, FF won't
		{
			engine.loadSavedGame( file.base64_decode( savefile.slice(1)));
			logfunc( 'Loading savefile' );
		}*/
	}
};
parchment.vms.push( parchment.vms.gnusto );