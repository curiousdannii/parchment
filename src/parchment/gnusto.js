/*

Gnusto definition
=================

Copyright (c) 2013 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

parchment.add_vm({
	id: 'gnusto',
	
	// File pattern
	match: /(z[1-8]|zlb|(z|zcode.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: DEBUG ? [ 'gnusto.debug.js' ] : [ 'gnusto.min.js' ],
	
	runner: 'GnustoRunner'
});