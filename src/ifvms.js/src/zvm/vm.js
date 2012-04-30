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
	Is 'use strict' needed for JIT functions too, or do they inherit that status?
	Specifically handle saving?
	Try harder to find default colours
	
*/

// The VM itself!
/* DEBUG */
var ZVM_core = {
/* ENDDEBUG */
	
	init: function()
	{
		// Create this here so that it won't be cleared on restart
		this.jit = {};
		this.env = {
			width: 80 // Default width of 80 characters
		};
		
		// Optimise our own functions
		/* DEBUG */
		if ( !debugflags.nooptimise )
		/* ENDDEBUG */
			optimise_obj( this, ['find_prop'] );
	},
	
	// An input event, or some other event from the runner
	inputEvent: function( data )
	{
		var memory = this.m,
		code = data.code,
		response;
		
		// Update environment variables
		if ( data.env )
		{
			extend( this.env, data.env );
			
			/* DEBUG */
			if ( data.env.debug )
			{
				get_debug_flags( data.env.debug ); 
			}
			/* ENDDEBUG */
			
			// Also need to update the header
			
			// Stop if there's no code - we're being sent live updates
			if ( !code )
			{
				return;
			}
		}
		
		// Clear the list of orders
		this.orders = [];
		
		// Load the story file
		if ( code == 'load' )
		{
			this.data = data.data;
			return;
		}
		
		if ( code == 'restart' )
		{
			this.restart();
		}
		
		if ( code == 'save' )
		{
			// Set the result variable, assume success
			this.variable( data.storer, data.result || 1 );
		}
		
		if ( code == 'restore' )
		{
			// Restart the VM if we never have before
			if ( !this.m )
			{
				this.restart();
			}
			
			// Successful restore
			if ( data.data )
			{
				this.restore( data.data );
			}
			// Failed restore
			else
			{
				this.variable( data.storer, 0 );
			}
		}
		
		// Handle line input
		if ( code == 'read' )
		{
			// Store the terminating character
			this.variable( data.storer, data.terminator );
			
			// Echo the response (7.1.1.1)
			response = data.response;
			this.print( response + '\n' );
			
			// Convert the response to lower case and then to ZSCII
			response = this.text.text_to_zscii( response.toLowerCase() );
			
			// Check if the response is too long, and then set its length
			if ( response.length > data.len )
			{
				response = response.slice( 0, data.len );
			}
			memory.setUint8( data.buffer + 1, response.length );
			
			// Store the response in the buffer
			memory.setBuffer( data.buffer + 2, response );
			
			if ( data.parse )
			{
				// Tokenise the response
				this.text.tokenise( data.buffer, data.parse );
			}
		}
		
		// Handle character input
		if ( code == 'char' )
		{
			this.variable( data.storer, this.text.keyinput( data.response ) );
		}
		
		// Write the status window's cursor position
		if ( code == 'get_cursor' )
		{
			memory.setUint16( data.addr, data.pos[0] + 1 );
			memory.setUint16( data.addr + 2, data.pos[1] + 1 );
		}
		
		// Resume normal operation
		this.run();
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
			throw new Error( 'Unsupported Z-Machine version: ' + version );
		}
		
		// Preserve flags 2 - the fixed pitch bit is surely the lamest part of the Z-Machine spec!
		if ( this.m )
		{
			memory.setUint8( 0x11, this.m.getUint8( 0x11 ) );
		}
		
		extend( this, {
			
			// Memory, locals and stacks of various kinds
			m: memory,
			s: [],
			l: [],
			call_stack: [],
			undo: [],
			
			// IO stuff
			orders: [],
			streams: [ 1, 0, [], 0 ],
			
			// Get some header variables
			version: version,
			pc: memory.getUint16( 0x06 ),
			properties: property_defaults,
			objects: property_defaults + 112, // 126-14 - if we take this now then we won't need to always decrement the object number
			globals: memory.getUint16( 0x0C ),
			staticmem: memory.getUint16( 0x0E ),
			extension: extension,
			extension_count: extension ? memory.getUint16( extension ) : 0,
			
			// Routine and string multiplier
			addr_multipler: version == 5 ? 4 : 8
			
		});
		// These classes rely too much on the above, so add them after
		extend( this, {
			ui: new ZVMUI( this, memory.getUint8( 0x11 ) & 0x02 ),
			text: new Text( this )
		});
		
		// Update the header
		this.update_header();
	},
	
	// Update the header after restarting or restoring
	update_header: function()
	{
		var memory = this.m,
		fgcolour = this.env.fgcolour ? this.ui.convert_RGB( this.env.fgcolour ) : 0xFFFF,
		bgcolour = this.env.bgcolour ? this.ui.convert_RGB( this.env.bgcolour ) : 0xFFFF;
		
		// Reset the random state
		this.random_state = 0;
		
		// Flags 1: Set bits 0, 2, 3, 4: typographic styles are OK
		// Set bit 7 only if timed input is supported
		memory.setUint8( 0x01, 0x1D | ( this.env.timed ? 0x80 : 0 ) );
		// Flags 2: Clear bits 3, 5, 7: no character graphics, mouse or sound effects
		// This is really a word, but we only care about the lower byte
		memory.setUint8( 0x11, memory.getUint8( 0x11 ) & 0x57 );
		// Screen settings
		memory.setUint8( 0x20, 255 ); // Infinite height
		memory.setUint8( 0x21, this.env.width );
		memory.setUint16( 0x22, this.env.width );
		memory.setUint16( 0x24, 255 );
		memory.setUint16( 0x26, 0x0101 ); // Font height/width in "units"
		// Default colours
		// Math.abs will convert -1 (not found) to 1 (default) which is convenient
		memory.setUint8( 0x2C, Math.abs( this.ui.colours.indexOf( bgcolour ) ) );
		memory.setUint8( 0x2D, Math.abs( this.ui.colours.indexOf( fgcolour ) ) );
		// Z Machine Spec revision
		memory.setUint16( 0x32, 0x0102 );
		// Clear flags three, we don't support any of that stuff
		this.extension_table( 4, 0 );
		// Default true colours - assume that the 1.1 spec has a typo, it's silly to store the foreground colour twice!
		this.extension_table( 5, fgcolour );
		this.extension_table( 6, bgcolour );
	},
	
	// Run
	run: function()
	{
		var now = new Date,
		pc,
		count = 0;
		
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
			
			// Or if more than five seconds has passed, however only check every 50k times
			// What's the best time for this?
			if ( ++count % 50000 == 0 && ( (new Date) - now ) > 5000 )
			{
				this.act( 'tick' );
				return;
			}
		}
	},
	
	// Compile a JIT routine
	compile: function()
	{
		var context = disassemble( this );
		
		// Compile the routine with new Function()
		/* DEBUG */
			var code = '' + context;
			if ( !debugflags.nooptimise )
			{
				code = optimise( code );
			}
			if ( debugflags.jit )
			{
				console.log( code );
			}
			// We use eval because Firebug can't profile new Function
			// The 0, is to make IE8 work. h/t Secrets of the Javascript Ninja
			var func = eval( '(0,function JIT_' + context.pc + '(e){' + code + '})' );
			
			// Extra stuff for debugging
			func.context = context;
			func.code = code;
			if ( context.name )
			{
				func.name = context.name;
			}
			this.jit[context.pc] = func;
		/* ELSEDEBUG
			this.jit[context.pc] = new Function( 'e', optimise( '' + context ) );
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
		
		// Flush the status if we need to
		// Should instead it be the first order? Might be better for screen readers etc
		if ( this.ui.status.length )
		{
			this.orders.push({
				code: 'stream',
				to: 'status',
				data: this.ui.status
			});
			this.ui.status = [];
		}
		
		options.code = code;
		this.orders.push( options );
		this.stop = 1;
		this.outputEvent( this.orders );
	}

/* DEBUG */
};
/* ELSEDEBUG
});
/* ENDDEBUG */