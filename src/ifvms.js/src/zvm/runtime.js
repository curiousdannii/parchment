/*

Z-Machine runtime functions
===========================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	Add a seeded RNG
	
*/

// When building just create the class directly from runtime.js and vm.js, no need for these vars
/* DEBUG */
var runtime = {
/* ELSEDEBUG
window.ZVM = Object.subClass( {
/* ENDDEBUG */
	
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
	clear_attr: function( object, attribute )
	{
		var addr = this.objects + 14 * object + parseInt( attribute / 8 );
		this.m.setUint8( addr, this.m.getUint8( addr ) & ~( 0x80 >> attribute % 8 ) );
	},
	
	// Access the extension table
	extension_table: function( word, value )
	{
		var addr = this.extension;
		if ( !addr || word > this.extension_count )
		{
			return 0;
		}
		addr += 2 * word;
		if ( value == undefined )
		{
			return this.m.getUint16( addr );
		}
		this.e.setUint16( addr, value );
	},
	
	// Find the address of a property, or given the previous property, the number of the next
	find_prop: function( object, property, prev )
	{
		var memory = this.m,
		
		this_property_byte, this_property,
		last_property = 0,
		
		// Get this property table
		properties = memory.getUint16( this.objects + 14 * object + 12 );
		properties += memory.getUint8( properties ) * 2 + 1;
		
		this_property_byte = memory.getUint8( properties );
		this_property = this_property_byte & 0x3F;
		
		// Simple case: find the first property
		if ( prev == 0 )
		{
			return this_property;
		}
		
		// Run through the properties
		while (1)
		{
			// Found the previous property, so return this one's number
			if ( last_property == prev )
			{
				return this_property;
			}
			// Found the property! Return it's address
			if ( this_property == property )
			{
				// Must include the offset
				return properties + ( this_property_byte & 0x80 ? 2 : 1 );
			}
			// Gone past the property
			if ( this_property < property )
			{
				return 0;
			}
			
			// Go to next property
			last_property = this_property;
			
			// Second size byte
			if ( this_property_byte & 0x80 )
			{
				this_property = memory.getUint8( properties + 1 ) & 0x3F;
				properties += this_property ? this_property + 2 : 66;
			}
			else
			{
				properties += this_property_byte & 0x40 ? 3 : 2;
			}
			
			this_property_byte = memory.getUint8( properties );
			this_property = this_property_byte & 0x3F;
		}
	},
	
	// Get the bigger sister object of an object (the one before it in the tree)
	get_bigsis: function( obj )
	{
		var older = this.get_child( this.get_parent( obj ) ),
		younger;
		// Simple case: the object is the first child already
		if ( older == obj )
		{
			return 0;
		}
		while (1)
		{
			younger = this.get_lilsis( older );
			if ( younger == obj )
			{
				return older;
			}
		}
	},
	
	get_child: function( obj )
	{
		return this.m.getUint16( this.objects + 14 * obj + 10 );
	},
	
	get_family: function( obj )
	{
		var parent = this.get_parent( obj );
		return parent ? [ parent, this.get_child( parent ), this.get_lilsis( obj ), this.get_bigsis( obj ) ] : [0];
	},
	
	// I.e., get the sibling of this object
	get_lilsis: function( obj )
	{
		return this.m.getUint16( this.objects + 14 * obj + 8 );
	},
	
	get_parent: function( obj )
	{
		return this.m.getUint16( this.objects + 14 * obj + 6 );
	},
	
	get_prop: function( object, property )
	{
		var memory = this.m,
		
		// Try to find the property
		addr = this.find_prop( object, property );
		
		// If we have the property
		if ( addr )
		{
			// Assume we're being called for a valid short property
			return ( memory.getUint8( addr - 1 ) & 0x40 ? memory.getUint16 : memory.getUint8 )( addr );
		}
		
		// Use the default properties table
		// Remember that properties are 1-indexed
		return memory.getUint16( this.properties + 2 * ( property - 1 ) );
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
	
	insert_obj: function( obj, dest )
	{
		// First remove the obj from wherever it was
		this.remove_obj( obj );
		// Now add it to the destination
		this.set_family( obj, dest, dest, obj, obj, this.get_child( dest ) );
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
		return this.get_parent( child ) == parent;
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
	
	put_prop: function( object, property, value )
	{
		var memory = this.m,
		
		// Try to find the property
		addr = this.find_prop( object, property );
		
		( memory.getUint8( addr - 1 ) & 0x40 ? memory.setUint16 : memory.setUint8 )( addr, value );
	},
	
	random: function( range )
	{
		var rand;
		
		if ( range < 1 )
		{
			this.random_state = Math.abs( range );
			this.random_seq = 0;
			return 0;
		}
		
		// Pure randomness
		if ( this.random_state == 0 )
		{
			return parseInt( Math.random() * range ) + 1;
		}
		// How can we best seed the RNG?
		
		// Predictable seed algorithm from the standard's remarks
		else
		{
			this.random_seq++;
			if ( this.random_seq > this.random_state )
			{
				this.random_seq = 1;
			}
			return this.random_seq % range;
		}
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
	
	remove_obj: function( obj )
	{
		var family = this.get_family( obj );
		
		// No parent, do nothing
		if ( family[0] == 0 )
		{
			return;
		}
		
		// obj is first child
		if ( family[1] == obj )
		{
			this.set_family( obj, 0, family[0], family[2] );
		}
		// obj isn't first child, so fix the bigsis
		else
		{
			this.set_family( obj, 0, 0, 0, family[3], family[2] );
		}
	},
	
	restore_undo: function()
	{
		if ( this.undo.length == 0 )
		{
			return 0;
		}
		var state = this.undo.pop();
		this.pc = state[0];
		this.m.setBuffer( 0, state[2] );
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
	
	set_attr: function( object, attribute )
	{
		var addr = this.objects + 14 * object + parseInt( attribute / 8 );
		this.m.setUint8( addr, this.m.getUint8( addr ) | 0x80 >> attribute % 8 );
	},
	
	set_family: function( obj, newparent, parent, child, bigsis, lilsis )
	{
		// Set the new parent of the obj
		this.m.setUint16( this.objects + 14 * obj + 6, newparent );
		// Update the a parent's first child if needed
		if ( parent )
		{
			this.m.setUint16( this.objects + 14 * parent + 10, child );
		}
		// Update the little sister of a big sister
		if ( bigsis )
		{
			this.m.setUint16( this.objects + 14 * bigsis + 8, lilsis );
		}
	},
	
	test: function( bitmap, flag )
	{
		return bitmap & flag == flag;
	},
	
	test_attr: function( object, attribute )
	{
		return ( this.m.getUint8( this.objects + 14 * object + parseInt( attribute / 8 ) ) << attribute % 8 ) & 0x80;
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
		return value;
	},
	
	// Utilities for signed arithmetic
	U2S: U2S,
	S2U: S2U

/* DEBUG */
};
/* ELSEDEBUG
,
/* ENDDEBUG */