/*

The Z-Machine VM for versions 5 and 8
=====================================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*

This file represents the public API of the ZVM class, while runtime.js contains most other class functions
	
TODO:
	
*/

// The VM itself!
/* DEBUG */
var ZVM_core = {
/* ENDDEBUG */
	
	init: function()
	{
		// Create this here so that it won't be cleared on restart
		this.jit = {};
	},
	
	load: function( data )
	{
		this.data = data;
	},
	
	// (Re)start the VM
	restart: function()
	{
		// Set up the memory
		var memory = ByteArray( this.data ),
		
		version = memory.getUint8( 0x00 ),
		property_defaults = memory.getUint16( 0x0A ),
		extension = memory.getUint16( 0x36 );
		
		// Check if the version is supported
		if ( version != 5 && version != 8 )
		{
			throw new Error( 'Unsupported Z-Machine version: ' + data[0] );
		}
		
		extend( this, {
			
			// Memory, locals and stacks of various kinds
			m: memory,
			s: [],
			l: [],
			call_stack: [],
			undo: [],
			
			random_state: 0,
			
			// IO stuff
			orders: [],
			
			// Get some header variables
			version: version,
			pc: memory.getUint16( 0x06 ),
			properties: property_defaults,
			objects: property_defaults + 112, // 126-14 - if we take this now then we won't need to always decrement the object number
			globals: memory.getUint16( 0x0C ),
			staticmem: memory.getUint16( 0x0E ),
			extension: extension,
			extension_count: extension ? memory.getUint16( extension ) : 0,
			
			// Routine and string packing multiplier
			packing_multipler: version == 5 ? 4 : 8
			
		});
		// These classes rely too much on the above, so add them after
		extend( this, {
			ui: new UI( this ),
			text: new Text( this )
		});
		
		// Set some other header variables
		// Flags 1: Set bits 0, 2, 3, 4: typographic styles are OK
		memory.setUint8( 0x01, 0x1D );
		// Flags 2: Clear bits 3, 5, 7: no character graphics, mouse or sound effects
		memory.setUint8( 0x10, memory.getUint8( 0x10 ) & 0x57 );
		// Z Machine Spec revision
		// For now only set 1.2 if PARCHMENT_SECURITY_OVERRIDE is set, still need to finish 1.1 support!
		memory.setUint8( 0x32, 1 );
		memory.setUint8( 0x33, PARCHMENT_SECURITY_OVERRIDE ? 2 : 0 );
	},
	
	// Run
	run: function()
	{
		var now = Date.now(),
		pc;
		
		// Clear the list of orders
		this.orders = [];
		
		// Stop when ordered to
		this.stop = 0;
		while ( !this.stop )
		{
			pc = this.pc;
			if ( !this.jit[pc] )
			{
				this.compile();
			}
			this.jit[pc]( this );
			
			// Or if more than five seconds has passed
			// What's the best time for this?
			// Or maybe count iterations instead?
			if ( (Date.now() - now) > 5000 )
			{
				this.act( 'tick' );
				return;
			}
		}
	},
	
	// Compile a JIT routine
	compile: function()
	{
		var context = disassemble( this ),
		code = context.write();
		
		// Compile the routine with new Function()
		/* DEBUG */
			log( code );
			this.jit[context.pc] = eval( '(function(e){' + code + '})' );
			
			// Extra stuff for debugging
			;;; this.jit[context.pc].context = context;
			;;; this.jit[context.pc].code = code;
			;;; if ( context.name ) { this.jit[context.pc].name = context.name; }
		/* ELSEDEBUG
			this.jit[context.pc] = new Function( 'e', code );
		/* ENDDEBUG */
		if ( context.pc < this.staticmem )
		{
			console.warn( 'Caching a JIT function in dynamic memory: ' + context.pc );
		}
	},
	
	// Return control to the ZVM runner to perform some action
	act: function( code, options )
	{
		var options = options || {};
		
		// Flush the buffer
		this.ui.flush();
		
		options.code = code;
		this.orders.push( options );
		this.stop = 1;
	},
	
	// Handler for events passed back from the ZVM runner
	event: function( data )
	{
		var memory = this.m,
		response;
		
		// Handle line input
		if ( data.code == 'read' )
		{
			// Store the terminating character
			this.variable( data.storer, data.terminator );
			
			// Check if the response is too long, and then set its length
			response = data.response;
			if ( response.length > data.len )
			{
				response = response.slice( 0, data.len );
			}
			memory.setUint8( data.text + 1, response.length );
			
			// Store the response in the buffer
			memory.setBuffer( data.text + 2, this.text.text_to_zscii( response ) );
			
			if ( data.parse )
			{
				// Tokenise the response
				this.text.tokenise( response, data.parse );
			}
			
			// Echo the response (7.1.1.1)
			this.print( response + '\n' );
		}
	}
/* DEBUG */
};
/* ELSEDEBUG
});
/* ENDDEBUG */