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
	
	art_shift: function( number, places )
	{
		return places > 0 ? number << places : number >> -places;
	},
	
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
	// It would be possible to do this with AST nodes but it would be very messy
	incdec: function( varnum, change )
	{
		var result, offset;
		if ( varnum == 0 )
		{
			result = this.S2U( this.s.pop() + change );
			this.s.push( result );
			return result;
		}
		if ( varnum < 16 )
		{
			return this.l[varnum - 1] = this.S2U( this.l[varnum - 1] + change );
		}
		else
		{
			offset = this.globals + ( varnum - 16 ) * 2;
			return this.m.setUint16( offset, this.m.getUint16( offset ) + change );
		}
	},
	
	// Indirect variables
	indirect: function( variable, value )
	{
		if ( variable == 0 )
		{
			if ( arguments.length > 1 )
			{
				return this.s[this.s.length - 1] = value;
			}
			else
			{
				return this.s[this.s.length - 1];
			}
		}
		return this.variable( variable, value );
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
	
	log_shift: function( number, places )
	{
		return places > 0 ? number << places : number >>> -places;
	},
	
	// Print text
	// Is this function needed? Replace with a direct call to ui.print()?
	print: function( text )
	{
		this.ui.print( text );
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

	restore_undo: function()
	{
		if ( this.undo.length == 0 )
		{
			return 0;
		}
		var state = this.undo.pop();
		this.pc = state[0];
		this.m.setBuffer( 0, state[2], 1 );
		this.l = state[3];
		this.s = state[4];
		this.call_stack = state[5];
		this.variable( state[1], 2 );
		return 1;
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
			this.variable( storer, result );
		}
	},
	
	save_undo: function( pc, variable )
	{
		this.undo.push( [
			pc,
			variable,
			this.m.getBuffer( 0, this.staticmem ),
			this.l.slice(),
			this.s.slice(),
			this.call_stack.slice()
		] );
		return 1;
	},
	
	test: function( bitmap, flag )
	{
		return bitmap & flag == flag;
	},
	
	test_attr: function( object, attribute )
	{
		return ( this.m.getUint8( this.objects + 14 * ( object - 1 ) + parseInt( attribute / 8 ) ) << ( attribute % 8 ) ) & 128;
	},
	
	// Read or write a variable
	variable: function( variable, value )
	{
		var havevalue = value !== undefined;
		if ( variable == 0 )
		{
			if ( havevalue )
			{
				this.s.push( value );
			}
			else
			{
				return this.s.pop();
			}
		}
		else if ( variable < 16 )
		{
			if ( havevalue )
			{
				this.l[variable - 1] = value;
			}
			else
			{
				return this.l[variable - 1];
			}
		}
		else
		{
			if ( havevalue )
			{
				this.m.setUint16( this.globals + ( variable - 16 ) * 2, value );
			}
			else
			{
				this.m.getUint16( this.globals + ( variable - 16 ) * 2 );
			}
		}
	},
	
	// Utilities for signed arithmetic
	U2S: U2S,
	S2U: S2U
	
};