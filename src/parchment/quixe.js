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
	files: DEBUG ? [
		'../src/quixe/prototype-1.6.1.js',
		'glkote.debug.js',
		'quixe.debug.js',
		'glkote.debug.css'
	] : [
		'prototype.min.js',
		'glkote.min.js',
		'quixe.min.js',
		'glkote.min.css'
	],
	
	runner: 'QuixeRunner'
});