/*

The ifvms.js VM definitions
===========================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

// Launcher. Will be run by jQuery.when(). jqXHR is args[2]
var ifvms_launcher = function( args )
{
	// De-blorbify
	var mystory = new parchment.lib.Story( args[2].responseArray, storyName );
	
	// Load it up!
	window.engine = new window[args[2].vm.Class]();
	window.runner = new Runner( engine, new StructIO( parchment.options.container ), mystory.zcode );
};

parchment.vms.zvm = {
	id: 'zvm',
	
	// File pattern
	match: /(z[58]|zlb|(z|zcode.+)(blorb|blb))(.js)?$/i,
	
	// Files to load
	files: [
			/* DEBUG */
				'../src/ifvms.js/src/zvm/intro.js',
				'../src/ifvms.js/src/common/util.js',
				'../src/ifvms.js/src/common/bytearray.js',
				'../src/ifvms.js/src/common/ast.js',
				'../src/ifvms.js/src/zvm/quetzal.js',
				'../src/ifvms.js/src/zvm/text.js',
				//'../src/ifvms.js/src/zvm/ui.js',
				'../src/ifvms.js/src/zvm/opcodes.js',
				'../src/ifvms.js/src/common/idioms.js',
				'../src/ifvms.js/src/zvm/disassembler.js',
				'../src/ifvms.js/src/zvm/runtime.js',
				'../src/ifvms.js/src/zvm/vm.js',
				'../src/ifvms.js/src/zvm/outro.js'
			/* ELSEDEBUG
				'zvm.min.js'
			/* ENDDEBUG */
		],
	
	Class: 'ZVM',
	
	launcher: ifvms_launcher
};
parchment.vms.push( parchment.vms.zvm );