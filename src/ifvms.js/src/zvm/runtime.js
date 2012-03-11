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
	Check when restoring that it's a savefile for this storyfile
	Save/restore: table, name, prompt support
	
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
		old_locals_count = this.l.length,
		
		// Keep the number of provided args for @check_arg_count
		provided_args = args.length;
		
		// Get the number of locals and advance the pc
		this.pc = addr * this.addr_multipler;
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
		this.call_stack.unshift( [ next, storer, locals_count, this.s.length, provided_args, old_locals_count ] );
	},
	
	clear_attr: function( object, attribute )
	{
		var addr = this.objects + 14 * object + parseInt( attribute / 8 );
		this.m.setUint8( addr, this.m.getUint8( addr ) & ~( 0x80 >> attribute % 8 ) );
	},
	
	copy_table: function( first, second, size )
	{
		size = U2S( size );
		var memory = this.m,
		i = 0,
		allowcorrupt = size < 0;
		size = Math.abs( size );
		
		// Simple case, zeroes
		if ( second == 0 )
		{
			while ( i < size )
			{
				memory.setUint8( first + i++, 0 );
			}
			return;
		}
		
		if ( allowcorrupt )
		{
			while ( i < size )
			{
				memory.setUint8( second + i, memory.getUint8( first + i++ ) );
			}
		}
		else
		{
			memory.setBuffer( second, memory.getBuffer( first, size ) );
		}
	},
	
	encode_text: function( zscii, length, from, target )
	{
		this.m.setBuffer( target, this.text.encode( this.m.getBuffer( zscii + from, length ) ) );
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
		
		// Run through the properties
		while (1)
		{
			this_property_byte = memory.getUint8( properties );
			this_property = this_property_byte & 0x3F;
		
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
		}
	},
	
	// 1.2 spec @gestalt
	gestalt: function( id, arg )
	{
		switch ( id )
		{
			case 1:
				return 0x0102;
			case 0x2000:
				return 1;
			// These aren't really applicable, but 2 is closer than 1
			case 0x2001:
			case 0x2002:
				return 2;
		}
		return 0;
	},
	
	// Get the first child of an object
	get_child: function( obj )
	{
		return this.m.getUint16( this.objects + 14 * obj + 10 );
	},
	
	get_sibling: function( obj )
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
			result = S2U( this.s.pop() + change );
			this.s.push( result );
			return result;
		}
		if ( varnum < 16 )
		{
			return this.l[varnum - 1] = S2U( this.l[varnum - 1] + change );
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
	
	// Manage output streams
	output_stream: function( stream, addr )
	{
		stream = U2S( stream );
		if ( stream == 1 )
		{
			this.streams[0] = 1;
		}
		if ( stream == -1 )
		{
			;;; console.info( 'Disabling stream one - it actually happened!' );
			this.streams[0] = 0;
		}
		if ( stream == 3 )
		{
			this.streams[2].unshift( [ addr, '' ] );
		}
		if ( stream == -3 )
		{
			var data = this.streams[2].shift(),
			text = this.text.text_to_zscii( data[1] );
			this.m.setUint16( data[0], text.length );
			this.m.setBuffer( data[0] + 2, text );
		}
	},
	
	// Print text!
	print: function( text )
	{
		// Stream 3 gets the text first
		if ( this.streams[2].length )
		{
			this.streams[2][0][1] += text;
		}
		// Don't print if stream 1 was switched off (why would you do that?!)
		else if ( this.streams[0] )
		{
			// Check if the monospace font bit has changed
			// Unfortunately, even now Inform changes this bit for the font statement, even though the 1.1 standard depreciated it :(
			var fontbit = this.m.getUint8( 0x11 ) & 0x02;
			if ( fontbit != ( this.ui.mono & 0x02 ) )
			{
				// Flush if we're actually changing font (ie, the other bits are off)
				if ( !( this.ui.mono & 0xFD ) )
				{
					this.ui.flush();
				}
				this.ui.mono ^= 0x02;
			}
			this.ui.buffer += text;
		}
	},
	
	print_obj: function( obj )
	{
		var proptable = this.m.getUint16( this.objects + 14 * obj + 12 );
		this.print( this.text.decode( proptable + 1, this.m.getUint8( proptable ) * 2 ) );
	},
	
	print_table: function( zscii, width, height, skip )
	{
		height = height || 1;
		skip = skip || 0;
		var i = 0;
		while ( i < height )
		{
			this.print( '\n' + this.text.zscii_to_text( this.m.getBuffer( zscii, width ) ) );
			zscii += width + skip;
			i++;
		}
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
		
		// Switch to a seeded RNG (or switch off if range == 0)
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
			buffer: text, // text-buffer
			parse: parse, // parse-buffer
			len: this.m.getUint8( text ),
			initiallen: this.m.getUint8( text + 1 ),
			time: time,
			routine: routine,
			storer: storer
		});
	},
	
	// Request character input
	read_char: function( one, time, routine, storer )
	{
		// Check if not all operands were used
		if ( arguments.length == 2 )
		{
			storer = time;
			time = routine = 0;
		}
	
		// Add the order
		this.act( 'char', {
			time: time,
			routine: routine,
			storer: storer
		});
	},
	
	remove_obj: function( obj )
	{
		var parent = this.get_parent( obj ),
		older_sibling,
		younger_sibling,
		temp_younger;
		
		// No parent, do nothing
		if ( parent == 0 )
		{
			return;
		}
		
		older_sibling = this.get_child( parent );
		younger_sibling = this.get_sibling( obj );
		
		// obj is first child
		if ( older_sibling == obj )
		{
			this.set_family( obj, 0, parent, younger_sibling );
		}
		// obj isn't first child, so fix the older sibling
		else
		{
			// Go through the tree until we find the older sibling
			while ( 1 )
			{
				temp_younger = this.get_sibling( older_sibling );
				if ( temp_younger == obj )
				{
					break;
				}
				older_sibling = temp_younger;
			}
			this.set_family( obj, 0, 0, 0, older_sibling, younger_sibling );
		}
	},
	
	restore: function( data )
	{
		var quetzal = new Quetzal( data ),
		qmem = quetzal.memory,
		qstacks = quetzal.stacks,
		pc = quetzal.pc,
		flags2 = this.m.getUint8( 0x11 ),
		temp,
		i = 0, j = 0,
		call_stack = [],
		newlocals = [],
		newstack;
		
		// Memory chunk
		this.m.setBuffer( 0, this.data.slice( 0, this.staticmem ) );
		if ( quetzal.compressed )
		{
			while ( i < qmem.length )
			{
				temp = qmem[i++];
				// Same memory
				if ( temp == 0 )
				{
					j += 1 + qmem[i++];
				}
				else
				{
					this.m.setUint8( j, temp ^ this.data[j++] );
				}
			}
		}
		else
		{
			this.m.setBuffer( 0, qmem );
		}
		// Preserve flags 1
		this.m.setUint8( 0x11, flags2 );
		
		// Stacks chunk
		i = 6;
		// Dummy call frame
		temp = qstacks[i++] << 8 | qstacks[i++];
		newstack = byte_to_word( qstacks.slice( i, temp ) );
		// Regular frames
		while ( i < qstacks.length )
		{
			call_stack.unshift( [
				qstacks[i++] << 16 | qstacks[i++] << 8 | qstacks[i++], // pc
				0, 0, newstack.length, 0, newlocals.length
			] );
			call_stack[0][1] = qstacks[i] & 0x10 ? -1 : qstacks[i + 1]; // storer
			call_stack[0][2] = qstacks[i] & 0x0F; // local count
			i += 2;
			temp = qstacks[i++];
			while ( temp )
			{
				call_stack[0][4]++; // provided_args - this is a stupid way to store it
				temp >>= 1;
			}
			temp = qstacks[i++] << 8 | qstacks[i++]; // "eval" stack length
			newlocals = byte_to_word( qstacks.slice( i, i + call_stack[0][2] ) ).concat( newlocals );
			i += call_stack[0][2] * 2;
			newstack = newstack.concat( byte_to_word( qstacks.slice( i, temp ) ) );
		}
		this.call_stack = call_stack;
		this.l = newlocals
		this.s = newstack;
		
		// Update the header
		this.update_header();
		
		// Set the storer
		this.variable( this.m.getUint8( pc++ ), 2 );
		this.pc = pc;
	},
	
	restore_undo: function()
	{
		if ( this.undo.length == 0 )
		{
			return 0;
		}
		var state = this.undo.pop();
		this.pc = state[0];
		// Preserve flags 2
		state[2][0x11] = this.m.getUint8( 0x11 );
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
		// With @throw we can now be skipping some call stack frames, so use the old locals length rather than this function's local count
		this.l = this.l.slice( this.l.length - call_stack[5] );
		this.s.length = call_stack[3];
		
		// Store the result if there is one
		if ( storer >= 0 )
		{
			this.variable( storer, result );
		}
	},
	
	// pc must be the address of the storer operand
	save: function( pc, storer )
	{
		var memory = this.m,
		stack = this.s,
		locals = this.l,
		quetzal = new Quetzal(),
		compressed_mem = [],
		i, j,
		abyte,
		zeroes = 0,
		call_stack = this.call_stack.reverse(),
		frame,
		stack_len,
		stacks = [ 0, 0, 0, 0, 0, 0 ]; // Dummy call frame
		
		// IFhd chunk
		quetzal.release = memory.getBuffer( 0x02, 2 );
		quetzal.serial = memory.getBuffer( 0x12, 6 );
		quetzal.checksum = memory.getBuffer( 0x1C, 2 );
		quetzal.pc = pc;
		
		// Memory chunk
		quetzal.compressed = 1;
		for ( i = 0; i < this.staticmem; i++ )
		{
			abyte = memory.getUint8( i ) ^ this.data[i];
			if ( abyte == 0 )
			{
				if ( ++zeroes == 256 )
				{
					compressed_mem.push( 0, 255 );
					zeroes = 0;
				}
			}
			else
			{
				if ( zeroes )
				{
					compressed_mem.push( 0, zeroes - 1 );
					zeroes = 0;
				}
				compressed_mem.push( abyte );
			}
		}
		quetzal.memory = compressed_mem;
		
		// Stacks
		// Finish the dummy call frame
		stacks.push( call_stack[0][3] >> 8, call_stack[0][3] & 0xFF );
		for ( j = 0; j < call_stack[0][3]; j++ )
		{
			stacks.push( stack[j] >> 8, stack[j] & 0xFF );
		}
		for ( i = 0; i < call_stack.length; i++ )
		{
			frame = call_stack[i];
			stack_len = ( call_stack[i + 1] ? call_stack[i + 1][3] : stack.length ) - frame[3];
			stacks.push(
				frame[0] >> 16, frame[0] >> 8 & 0xFF, frame[0] & 0xFF, // pc
				frame[2] | ( frame[1] < 0 ? 0x10 : 0 ), // locals count and flag for no storer
				frame[1] < 0 ? 0 : frame[1], // storer
				( 1 << frame[4] ) - 1, // provided args
				stack_len >> 8, stack_len & 0xFF // this frame's stack length
			);
			// Locals
			for ( j = locals.length - frame[5] - frame[2]; j < locals.length - frame[5]; j++ )
			{
				stacks.push( locals[j] >> 8, locals[j] & 0xFF );
			}
			// The stack
			for ( j = frame[3]; j < frame[3] + stack_len; j++ )
			{
				stacks.push( stack[j] >> 8, stack[j] & 0xFF );
			}
		}
		call_stack.reverse();
		quetzal.stacks = stacks;
		
		// Send the event
		this.act( 'save', {
			data: quetzal.write(),
			storer: storer
		} );
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
	
	scan_table: function( key, addr, length, form )
	{
		form = form || 0x82;
		var memoryfunc = form & 0x80 ? this.m.getUint16 : this.m.getUint8;
		form &= 0x7F;
		length = addr + length * form;
		
		while ( addr < length )
		{
			if ( memoryfunc( addr ) == key )
			{
				return addr;
			}
			addr += form;
		}
		return 0;
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