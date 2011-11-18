/*

Gnusto definition
=================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

parchment.add_vm({
	id: 'gnusto',
	
	// File pattern
	match: /(z[1-8]|zlb|(z|zcode.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: [
		/* DEBUG */
			'../src/ifvms.js/src/zvm/quetzal.js',
			'../src/gnusto/remedial.js',
			'../src/gnusto/engine/gnusto-engine.js',
			'../src/ifvms.js/src/zvm/ui.js',
			'../src/gnusto/runner.js'
		/* ELSEDEBUG
			'gnusto.min.js'
		/* ENDDEBUG */
	],
	
	runner: 'GnustoRunner'
});