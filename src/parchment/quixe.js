/*

Quixe definition
================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

parchment.add_vm({
	id: 'quixe',
	
	// File pattern
	match: /(ulx|glb|(g|glulx.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: [
			/* DEBUG */
				'../src/quixe/prototype-1.6.1.js',
				'../src/quixe/glkote/glkote.js',
				'../src/quixe/glkote/dialog.js',
				'../src/quixe/glkote/glkapi.js',
				'../src/quixe/quixe/quixe.js',
				'../src/quixe/quixe/gi_dispa.js',
				'../src/quixe/media/i7-glkote.css',
				'../src/quixe/media/dialog.css',
				'../src/quixe/runner.js'
			/* ELSEDEBUG
				'prototype.min.js',
				'glkote.min.js',
				'quixe.min.js',
				'glkote.min.css'
			/* ENDDEBUG */
		],
	
	runner: 'QuixeRunner'
});