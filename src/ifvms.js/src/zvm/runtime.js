/*

Z-Machine runtime functions
===========================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	
*/

var runtime = {
	
	// Call a routine
	call: function( addr, storer, next, args )
	{
		var i,
		locals_count,
		
		// Keep the number of provided args for @check_arg_count
		provided_args = args.length;
		
		// Get the number of locals and advance the pc
		this.pc = addr * this.packing_multipler;
		locals_count = this.m.getUint8( this.pc++ );
		
		// Add the locals
		// Trim args to the count if needed
		args = args.slice( 0, locals_count );
		// Add any extras
		for ( i = args.length; i < locals_count; i++ )
		{
			args.push(0);
		}
		// Prepend to the locals array
		this.l = args.concat( this.l );
		
		// Push the call stack (well unshift really)
		this.call_stack.unshift( [ next, storer, locals_count, this.s.length, provided_args ] );
	},
	
	// Object model functions
	get_prop: function( object, property )
	{
		var memory = this.m,
		
		// Try to find the property
		addr = this.get_prop_addr( object, property );
		
		// If we have the property
		if ( addr )
		{
			// Assume we're being called for a valid short property
			return ( memory.getUint8( addr - 1 ) & 0x40 ? memory.getUint16 : memory.getUint8 )( addr );
		}
		
		// Use the default properties table
		// Remember that properties are 1-indexed
		return memory.getUint16( this.property_defaults + 2 * ( property - 1 ) );
	},
	
	get_prop_addr: function( object, property )
	{
		var memory = this.m,
		
		this_property,
		
		// Get this property table
		properties = memory.getUint16( this.objects + 14 * ( object - 1 ) + 12 );
		properties += memory.getUint8( properties ) * 2 + 1;
		
		// Run through the properties
		while (1)
		{
			this_property = memory.getUint8( properties );
			
			// Found the property!
			if ( ( this_property & 0x3F ) == property )
			{
				// Must include the offset
				return properties + ( this_property & 0x80 ? 2 : 1 );
			}
			// Gone past the property
			if ( ( this_property & 0x3F ) < property )
			{
				return 0;
			}
			// Go to next property
			else
			{
				// Second size byte
				if ( this_property & 0x80 )
				{
					this_property = memory.getUint8( properties + 1 ) & 0x3F;
					properties += this_property ? this_property + 2 : 66;
				}
				else
				{
					properties += this_property & 0x40 ? 3 : 2;
				}
			}
		}
	},
	
	// Get the length of a property
	// This opcode expects the address of the property data, not a property block
	get_prop_len: function( addr )
	{
		// Spec 1.1
		if ( addr == 0 )
		{
			return 0;
		}
		
		var value = this.m.getUint8( addr - 1 );
		
		// Two size/number bytes
		if ( value & 0x80 )
		{
			value &= 0x3F;
			return value == 0 ? 64 : value;
		}
		// One byte size/number
		return value & 0x40 ? 2 : 1;
	},
	
	// Quick hack for @inc/@dec
	incdec: function( varnum, change )
	{
		if ( varnum == 0 )
		{
			this.s.push( this.s.pop() + change );
		}
		if ( varnum < 16 )
		{
			this.l[varnum - 1] += change;
		}
		else
		{
			var offset = this.globals + ( varnum - 16 ) * 2;
			this.m.setUint16( offset, this.m.setUint16( offset ) + change );
		}
	},
	
	// @jeq
	jeq: function()
	{	
		var i = 1, r;
		
		// Account for many arguments
		while ( i < arguments.length )
		{
			if ( arguments[i++] == arguments[0] )
			{
				r = 1;
			}
		}
		return r;
	},
	
	jin: function( child, parent )
	{
		return this.m.getUint16( this.objects + 14 * ( child - 1 ) + 6 ) == parent;
	},
	
	// Request line input
	read: function( text, parse, time, routine, storer )
	{
		// Check if not all operands were used
		if ( arguments.length == 3 )
		{
			storer = time;
			time = routine = 0;
		}
	
		// Add the order
		this.act( 'read', {
			text: text, // text-buffer
			parse: parse, // parse-buffer
			len: this.m.getUint8( text ),
			initiallen: this.m.getUint8( text + 1 ),
			time: time,
			routine: routine,
			storer: storer
		});
	},
	
	// Return from a routine
	ret: function( result )
	{
		var call_stack = this.call_stack.shift(),
		storer = call_stack[1];
		
		// Correct everything again
		this.pc = call_stack[0];
		this.l = this.l.slice( call_stack[2] );
		this.s.length = call_stack[3];
		
		// Store the result if there is one
		if ( storer >= 0 )
		{
			this.store( storer, result );
		}
	},
	
	// Store a variable
	store: function( variable, value )
	{
		if ( variable == 0 )
		{
			this.s.push( value );
		}
		else if ( variable < 16 )
		{
			this.l[variable - 1] = value;
		}
		else
		{
			this.m.setUint16( this.globals + ( variable - 16 ) * 2, value );
		}
	},
	
	test_attr: function( object, attribute )
	{
		return ( this.m.getUint8( this.objects + 14 * ( object - 1 ) + parseInt( attribute / 8 ) ) << ( attribute % 8 ) ) & 128;
	},
	
	// Utilities for signed arithmetic
	U2S: U2S,
	S2U: S2U
	
};
