/*

The ifvms.js VM definitions
===========================

Copyright (c) 2013 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

parchment.add_vm({
	id: 'zvm',
	
	// File pattern
	match: /(z[58]|zlb|(z|zcode.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: DEBUG ? [ 'zvm.debug.js' ] : [ 'zvm.min.js' ],
	
	engine: 'ZVM'
});