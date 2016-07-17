/*

Quixe definition
================

Copyright (c) 2013 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

parchment.add_vm({
	id: 'quixe',
	
	// File pattern
	match: /(ulx|glb|(g|glulx.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: [
		'glkote.min.js',
		'quixe.min.js',
		DEBUG ? 'glkote.debug.css' : 'glkote.min.css'
	],
	
	runner: 'QuixeRunner'
});