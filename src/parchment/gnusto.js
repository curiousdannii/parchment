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
	files: /* DEBUG */ [
			'../src/gnusto/engine/gnusto-engine.js',
			'../src/plugins/quetzal.js',
			'../src/gnusto/runner/runner.js',
			'../src/gnusto/runner/console.js',
			'../src/gnusto/runner/zui.js'
		] /* ELSEDEBUG [
			'gnusto.min.js',
			'zmachine.min.js'
		] /* ENDDEBUG */ ,
	
	// Launcher. Will be run by jQuery.when(). The story file's jqXHR will be the first argument
	launcher: function( story )
	{
		// Chrome is silly and doesn't let us simply reference console.log()
		// PLUS Only supports a single argument :(
		var logfunc = window.console && function( msg ) { console.log( msg ); } || function(){},
		jqXHR = story[2],

		engine = new GnustoEngine( logfunc ),
		zui = new parchment.lib.ZUI( jqXHR.library, engine, logfunc ),
		runner = new EngineRunner( engine, zui, logfunc ),

		mystory = new parchment.lib.Story( jqXHR.responseArray, storyName ),
		savefile = location.hash;
		
		logfunc( "Story type: " + mystory.filetype )
		mystory.load( engine );

		if ( savefile && savefile != '#' ) // IE will set location.hash for an empty fragment, FF won't
		{
			engine.loadSavedGame( file.base64_decode( savefile.slice(1)));
			logfunc( 'Loading savefile' );
		}

		runner.run();
	}
};
parchment.vms.push( parchment.vms.gnusto );