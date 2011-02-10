/*

Z-Machine definition (Gnusto)
=============================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

parchment.vms.push({
	// Files to load
	files: /* DEBUG:IF */ [
			'../src/gnusto/gnusto-engine.js',
			'../src/plugins/quetzal.js',
			'../src/zmachine/runner.js',
			'../src/zmachine/console.js',
			'../src/zmachine/zui.js'
		] /* DEBUG:ELSE [
			'gnusto.min.js',
			'zmachine.min.js'
		] /* DEBUG:END */ ,
	
	// Launcher. Will be run by jQuery.when(). The story file's jqXHR will be the first argument
	launcher: function( story )
	{
		var logfunc = window.console && window.console.log || function(){},
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
});