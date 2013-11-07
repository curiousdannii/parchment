/*

ZVM - the ifvms.js Z-Machine (versions 5 and 8)
===============================================

Built: 2013-11-07

Copyright (c) 2011-2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*

ZVM willfully ignores the standard in these ways:
	Non-buffered output is not supported
	Output streams 2 and 4 and input stream 1 are not supported
	Saving tables is not supported (yet?)
	No interpreter number or version is set

Any other non-standard behaviour should be considered a bug
	
*/
 
// Define our DEBUG constants
if ( typeof DEBUG === 'undefined' )
{
	DEBUG = true;
}
if ( DEBUG )
{
	ZVM = true;
	GVM = false;
}
 
// Wrap all of ZVM in a closure/namespace, and enable strict mode
var ZVM = (function(){ 'use strict';


/*

Simple JavaScript Inheritance
=============================

By John Resig
Released into the public domain?
http://ejohn.org/blog/simple-javascript-inheritance/

Changes from Dannii: support toString in IE8

*/

/*

TODO:
	Try copying properties
	Stop using _super
	
*/

var Class = (function(){

var initializing = 0;

// Determine if functions can be serialized
var fnTest = /\b_super\b/;

var Class = function(){};

// Check whether for in will iterate toString
var iterate_toString, name;
for ( name in { toString: 1 } ) { iterate_toString = 1; }

// Create a new Class that inherits from this class
Class.subClass = function( prop )
{
	var _super = this.prototype,
	proto,
	name,
	Klass;
	var prop_toString = !/native code/.test( '' + prop.toString ) && prop.toString;
	
	// Make the magical _super() function work
	var make_super = function( name, fn )
	{
		return function()
		{
			var tmp = this._super,
			ret;

			// Add a new ._super() method that is the same method
			// but on the super-class
			this._super = _super[name];

			// The method only need to be bound temporarily, so we
			// remove it when we're done executing
			ret = fn.apply( this, arguments );       
			this._super = tmp;

			return ret;
		};
	};
	
	// Instantiate a base class (but only create the instance,
	// don't run the init constructor)
	initializing = 1;
	/* jshint newcap:false */ // require classes to begin with a capital
	proto = new this();
	/* jshint newcap:true */
	initializing = 0;

	// Copy the properties over onto the new prototype
	for ( name in prop )
	{
		// Check if we're overwriting an existing function
		proto[name] = typeof prop[name] === "function" && typeof _super[name] === "function" && fnTest.test( prop[name] ) ?
			make_super( name, prop[name] ) :
			prop[name];
	}
	// Handle toString in IE8
	if ( !iterate_toString && prop_toString )
	{
		proto.toString = fnTest.test( prop_toString ) ? make_super( 'toString', prop_toString ) : prop_toString;
	}

	// The dummy class constructor
	Klass = proto.init ? function()
	{
		// All construction is actually done in the init method
		if ( !initializing )
		{
			this.init.apply( this, arguments );
		}
	} : function(){};

	// Populate our constructed prototype object
	Klass.prototype = proto;

	// Enforce the constructor to be what we expect
	Klass.constructor = Klass;

	// And make this class extendable
	Klass.subClass = Class.subClass;

	return Klass;
};

return Class;

})();
/*

Interchange File Format library
===============================

Copyright (c) 2008-2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js
(Originally in Parchment)

*/

// Get a 32 bit number from a byte array, and vice versa
function num_from(s, offset)
{
	return s[offset] << 24 | s[offset + 1] << 16 | s[offset + 2] << 8 | s[offset + 3];
}

function num_to_word(n)
{
	return [(n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF];
}

// Get a 4 byte string ID from a byte array, and vice versa
function text_from(s, offset)
{
	return String.fromCharCode( s[offset], s[offset + 1], s[offset + 2], s[offset + 3] );
}

function text_to_word(t)
{
	return [t.charCodeAt(0), t.charCodeAt(1), t.charCodeAt(2), t.charCodeAt(3)];
}

// IFF file class
// Parses an IFF file stored in a byte array
var IFF = Class.subClass({
	// Parse a byte array or construct an empty IFF file
	init: function parse_iff(data)
	{
		this.type = '';
		this.chunks = [];
		if (data)
		{
			// Check this is an IFF file
			if (text_from(data, 0) !== 'FORM')
			{
				throw new Error("Not an IFF file");
			}

			// Parse the file
			this.type = text_from(data, 8);

			var i = 12, l = data.length;
			while (i < l)
			{
				var chunk_length = num_from(data, i + 4);
				if (chunk_length < 0 || (chunk_length + i) > l)
				{
					// FIXME: do something sensible here
					throw new Error("IFF: Chunk out of range");
				}

				this.chunks.push({
					type: text_from(data, i),
					offset: i,
					data: data.slice(i + 8, i + 8 + chunk_length)
				});

				i += 8 + chunk_length;
				if (chunk_length % 2) 
				{
					i++;
				}
			}
		}
	},

	// Write out the IFF into a byte array
	write: function write_iff()
	{
		// Start with the IFF type
		var out = text_to_word(this.type);

		// Go through the chunks and write them out
		for (var i = 0, l = this.chunks.length; i < l; i++)
		{
			var chunk = this.chunks[i], data = chunk.data, len = data.length;
			out = out.concat(text_to_word(chunk.type), num_to_word(len), data);
			if (len % 2)
			{
				out.push(0);
			}
		}

		// Add the header and return
		return text_to_word('FORM').concat(num_to_word(out.length), out);
	}
});

// Expose the class and helper functions
IFF.num_from = num_from;
IFF.num_to_word = num_to_word;
IFF.text_from = text_from;
IFF.text_to_word = text_to_word;
/*

Common untility functions
=================================================

Copyright (c) 2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

// Array.indexOf compatibility (Support: IE8)
if ( ![].indexOf )
{
	Array.prototype.indexOf = function( obj, fromIndex )
	{
		for ( var i = fromIndex || 0, l = this.length; i < l; i++ )
		{
			if ( this[i] === obj )
			{
				return i;
			}
		}
		return -1;
	};
}

// Bind, with compatiblity (Support: IE8)
function bind( func, obj )
{
	if ( Function.prototype.bind )
	{
		return func.bind( obj );
	}
	else
	{
		return function()
		{
			func.apply( obj, [].slice.call( arguments ) );
		};
	}
}

// Utility to extend objects
function extend( old, add )
{
	for ( var name in add )
	{
		old[name] = add[name];
	}
	return old;
}

// Console dummy funcs
var console = typeof console !== 'undefined' ? console : {
	log: function(){},
	info: function(){},
	warn: function(){}
};

// Utilities for 16-bit signed arithmetic
function U2S( value )
{
	return value << 16 >> 16;
}
function S2U( value )
{
	return value & 0xFFFF;
}

// Utility to convert from byte arrays to word arrays
function byte_to_word( array )
{
	var i = 0, l = array.length,
	result = [];
	while ( i < l )
	{
		result[i / 2] = array[i++] << 8 | array[i++];
	}
	return result;
}
	
// Perform some micro optimisations
function optimise( code )
{
	return code
	
	// Sign conversions
	.replace( /(e\.)?U2S\(([^(]+?)\)/g, '(($2)<<16>>16)' )
	.replace( /(e\.)?S2U\(([^(]+?)\)/g, '(($2)&65535)' )
	
	// Bytearray
	.replace( /([\w.]+)\.getUint8\(([^(]+?)\)/g, '$1[$2]' )
	.replace( /([\w.]+)\.getUint16\(([^(]+?)\)/g, '($1[$2]<<8|$1[$2+1])' );
}
// Optimise some functions of an obj, compiling several at once
function optimise_obj( obj, funcnames )
{
	var funcname, funcparts, newfuncs = [];
	for ( funcname in obj )
	{
		if ( funcnames.indexOf( funcname ) >= 0 )
		{
			funcparts = /function\s*\(([^(]*)\)\s*\{([\s\S]+)\}/.exec( '' + obj[funcname] );
			if ( DEBUG )
			{
				newfuncs.push( funcname + ':function ' + funcname + '(' + funcparts[1] + '){' + optimise( funcparts[2] ) + '}' );
			}
			else
			{
				newfuncs.push( funcname + ':function(' + funcparts[1] + '){' + optimise( funcparts[2] ) + '}' );
			}
		}
	}
	extend( obj, eval( '({' + newfuncs.join() + '})' ) );
}

if ( DEBUG ) {

	// Debug flags
	var debugflags = {},
	get_debug_flags = function( data )
	{
		data = data.split( ',' );
		var i = 0;
		while ( i < data.length )
		{
			debugflags[data[i++]] = 1; 
		}
	};
	if ( typeof parchment !== 'undefined' && parchment.options && parchment.options.debug )
	{
		get_debug_flags( parchment.options.debug );
	}

} // ENDDEBUG
/*

ByteArray classes, using Typed Arrays if possible
=================================================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/
 
/*

Todo:
	consider whether direct array access would help (what did i mean by this???)
	is signed access needed?
	add a system for guards, to run callbacks if certain addresses were written to
		Needed for: @storew, @storeb, @output_stream?, @encode_text, @copy_table, @restore, @restore_undo
	check whether returning the set values is bad for perf
	consider generic funcs for set/get: get=Uint8(0), set=Uint8(0,0)

*/

if ( DEBUG )
{
	console.log( 'bytearray.js: ' + ( typeof DataView !== 'undefined' ? 'Native DataView' : 'Emulating DataView' ) );
}

//var native_bytearrays = DataView,
var native_bytearrays = 0,

ByteArray = native_bytearrays ?
	// Converts the data to a buffer and then initiates a DataView on it
	function( data )
	{
		var buffer = new ArrayBuffer( data );
		data = new DataView( buffer );
		data.buffer = buffer;
		return data;
	} :
	
	// Emulate DataView
	function( data )
	{
		// Copy the passed in array
		data = data.slice();
		
		if ( ZVM )
		{
			return extend( data, {
				data: data,
				getUint8: function( index ) { return data[index]; },
				getUint16: function( index ) { return data[index] << 8 | data[index + 1]; },
				getBuffer: function( start, length ) { return data.slice( start, start + length ); },
				getBuffer16: function( start, length ) { return byte_to_word( data.slice( start, start + length * 2 ) ); },
				setUint8: function( index, value ) { return data[index] = value & 0xFF; },
				setUint16: function( index, value ) { data[index] = (value >> 8) & 0xFF; data[index + 1] = value & 0xFF; return value & 0xFFFF; },
				setBuffer: function( index, buffer )
				{
					var i = 0, l = buffer.length;
					while ( i < l )
					{
						data[i + index] = buffer[i++];
					}
				}
			} );
		} 
		else if ( GVM )
		{
		}
	};
/*

Abstract syntax trees for IF VMs
================================

Copyright (c) 2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*

All AST nodes must use these functions, even constants
(An exception is made for branch addresses and text literals which remain as primitives)
toString() functions are used to generate JIT code

Aside from Variable is currently generic and could be used for Glulx too

TODO:
	Use strict mode for new Function()?
	When we can run through a whole game, test whether using common_func is faster (if its slower then not worth the file size saving)
	Can we eliminate the Operand class?
	Subclass Operand/Variable from Number?
	Replace calls to args() with arguments.join()?
	
*/

// Generic/constant operand
// Value is a constant
var Operand = Class.subClass({
	init: function( engine, value )
	{
		this.e = engine;
		this.v = value;
	},
	toString: function()
	{
		return this.v;
	},
	
	// Convert an Operand into a signed operand
	U2S: function()
	{
		return U2S( this.v );
	}
}),

// Variable operand
// Value is the variable number
// TODO: unrolling is needed -> retain immediate returns if optimisations are disabled
Variable = Operand.subClass({
	// Get a value
	toString: function()
	{
		var variable = this.v;
		
		// Indirect
		if ( this.indirect )
		{
			return 'e.indirect(' + variable + ')';
		}
		
		// Stack
		if ( variable === 0 )
		{
			// If we've been passed a value we're setting a variable
			return 's.pop()';
		}
		// Locals
		if ( --variable < 15 )
		{
			return 'l[' + variable + ']';
		}
		// Globals
		return 'm.getUint16(' + ( this.e.globals + ( variable - 15 ) * 2 ) + ')';
	},
	
	// Store a value
	store: function( value )
	{
		var variable = this.v;
		
		// Indirect variable
		if ( this.indirect )
		{
			return 'e.indirect(' + variable + ',' + value + ')';
		}
		
		// BrancherStorers need the value
		if ( this.returnval )
		{
			return 'e.variable(' + variable + ',' + value + ')';
		}
		
		// Stack
		if ( variable === 0 )
		{
			// If we've been passed a value we're setting a variable
			return 's.push(' + value + ')';
		}
		// Locals
		if ( --variable < 15 )
		{
			return 'l[' + variable + ']=' + value;
		}
		// Globals
		return 'm.setUint16(' + ( this.e.globals + ( variable - 15 ) * 2 ) + ',' + value + ')';
	},
	
	// Convert an Operand into a signed operand
	U2S: function()
	{
		return 'e.U2S(' + this + ')';
	}
}),

// Generic opcode
// .func() must be set, which returns what .write() will actually return; it is passed the operands as its arguments
Opcode = Class.subClass({
	init: function( engine, context, code, pc, next, operands )
	{
		this.e = engine;
		this.context = context;
		this.code = code;
		this.pc = pc;
		this.labels = [ this.pc + '/' + this.code ];
		this.next = next;
		this.operands = operands;
		
		// Post-init function (so that they don't all have to call _super)
		if ( this.post )
		{
			this.post();
		}
	},
	
	// Write out the opcode, passing .operands to .func(), with a JS comment of the pc/opcode
	toString: function()
	{
		return this.label() + ( this.func ? this.func.apply( this, this.operands ) : '' );
	},
	
	// Return a string of the operands separated by commas
	args: function( joiner )
	{
		return this.operands.join( joiner );
	},
	
	// Generate a comment of the pc and code, possibly for more than one opcode
	label: function()
	{
		return '/* ' + this.labels.join() + ' */ ';
	}
}),

// Stopping opcodes
Stopper = Opcode.subClass({
	stopper: 1
}),

// Pausing opcodes (ie, set the pc at the end of the context)
Pauser = Stopper.subClass({
	storer: 1,
	
	post: function()
	{
		this.storer = this.operands.pop();
		this.origfunc = this.func;
		this.func = this.newfunc;
	},
	
	newfunc: function()
	{
		return 'e.pc=' + this.next + ';' + this.origfunc.apply( this, arguments );
	}
}),

// Join multiple branchers together with varying logic conditions
BrancherLogic = Class.subClass({
	init: function( ops, code )
	{
		this.ops = ops || [];
		this.code = code || '||';
	},
	
	toString: function()
	{
		var i = 0,
		ops = [],
		op;
		while ( i < this.ops.length )
		{
			op = this.ops[i++];
			// Accept either Opcodes or further BrancherLogics
			ops.push(
				op.func ?
					( op.iftrue ? '' : '!(' ) + op.func.apply( op, op.operands ) + ( op.iftrue ? '' : ')' ) :
					op
			);
		}
		return ( this.invert ? '(!(' : '(' ) + ops.join( this.code ) + ( this.invert ? '))' : ')' );
	}
}),

// Branching opcodes
Brancher = Opcode.subClass({
	// Flag for the disassembler
	brancher: 1,
	
	keyword: 'if',
	
	// Process the branch result now
	post: function()
	{
		var result,
		prev,
		
		// Calculate the offset
		brancher = this.operands.pop(),
		offset = brancher[1];
		this.iftrue = brancher[0];
		
		// Process the offset
		if ( offset === 0 || offset === 1 )
		{
			result = 'e.ret(' + offset + ')';
		}
		else
		{
			offset += this.next - 2;
			
			// Add this target to this context's list
			this.context.targets.push( offset );
			result = 'e.pc=' + offset;
		}
		
		this.result = result + ';return';
		this.offset = offset;
		this.cond = new BrancherLogic( [this] );
		
		if ( DEBUG )
		{
			// Stop if we must
			if ( debugflags.noidioms )
			{
				return;
			}
		}
			
		// Compare with previous statement
		if ( this.context.ops.length )
		{
			prev = this.context.ops.pop();
			// As long as no other opcodes have an offset property we can skip the instanceof check
			if ( /* prev instanceof Brancher && */ prev.offset === offset )
			{
				// Goes to same offset so reuse the Brancher arrays
				this.cond.ops.unshift( prev.cond );
				this.labels = prev.labels;
				this.labels.push( this.pc + '/' + this.code );
			}
			else
			{
				this.context.ops.push( prev );
			}
		}
	},
	
	// Write out the brancher
	toString: function()
	{
		var result = this.result;
		
		// Account for Contexts
		if ( result instanceof Context )
		{
			// Update the context to be a child of this context
			if ( DEBUG )
			{
				result.context = this.context;
			}
			
			result = result + ( result.stopper ? '; return' : '' );
			
			// Extra line breaks for multi-op results
			if ( this.result.ops.length > 1 )
			{
				result = '\n' + result + '\n';
				if ( DEBUG )
				{
					result += this.context.spacer;
				}
			}
		}
		
		// Print out a label for all included branches and the branch itself
		return this.label() + this.keyword + this.cond + ' {' + result + '}';
	}
}),

// Brancher + Storer
BrancherStorer = Brancher.subClass({
	storer: 1,
	
	// Set aside the storer operand
	post: function()
	{
		this._super();
		this.storer = this.operands.pop();
		this.storer.returnval = 1;
		
		// Replace the func
		this.origfunc = this.func;
		this.func = this.newfunc;
	},
	
	newfunc: function()
	{
		return this.storer.store( this.origfunc.apply( this, arguments ) );
	}
}),

// Storing opcodes
Storer = Opcode.subClass({
	// Flag for the disassembler
	storer: 1,
	
	// Set aside the storer operand
	post: function()
	{
		this.storer = this.operands.pop();
	},
	
	// Write out the opcode, passing it to the storer (if there still is one)
	toString: function()
	{
		var data = this._super();
		
		// If we still have a storer operand, use it
		// Otherwise (if it's been removed due to optimisations) just return func()
		return this.storer ? this.storer.store( data ) : data;
	}
}),

// Routine calling opcodes
Caller = Stopper.subClass({
	// Fake a result variable
	result: { v: -1 },

	// Write out the opcode
	toString: function()
	{
		// TODO: Debug: include label if possible
		return this.label() + 'e.call(' + this.operands.shift() + ',' + this.result.v + ',' + this.next + ',[' + this.args() + '])';
	}
}),

// Routine calling opcodes, storing the result
CallerStorer = Caller.subClass({
	// Flag for the disassembler
	storer: 1,
	
	post: function()
	{
		// We can't let the storer be optimised away here
		this.result = this.operands.pop();
	}
}),

// A generic context (a routine, loop body etc)
Context = Class.subClass({
	init: function( engine, pc )
	{
		this.e = engine;
		this.pc = pc;
		this.pre = [];
		this.ops = [];
		this.post = [];
		this.targets = []; // Branch targets
		if ( DEBUG )
		{
			this.spacer = '';
		}
	},
	
	toString: function()
	{
		if ( DEBUG )
		{
			// Indent the spacer further if needed
			if ( this.context ) { this.spacer = this.context.spacer + '  '; }
			// DEBUG: Pretty print!
			return this.pre.join( '' ) + ( this.ops.length > 1 ? this.spacer : '' ) + this.ops.join( ';\n' + this.spacer ) + this.post.join( '' );
			
		}
		else
		{
			// Return the code
			return this.pre.join( '' ) + this.ops.join( ';' ) + this.post.join( '' );
		}
	}
}),

// A routine body
RoutineContext = Context.subClass({
	toString: function()
	{
		// TODO: Debug: If we have routine names, find this one's name
		
		// Add in some extra vars and return
		this.pre.unshift( 'var l=e.l,m=e.m,s=e.s;\n' );
		return this._super();
	}
});

// Opcode builder
// Easily build a new opcode from a class
function opcode_builder( Class, func, flags )
{
	flags = flags || {};
	if ( func )
	{
		/*if ( func.pop )
		{
			flags.str = func;
			flags.func = common_func;
		}
		else
		{*/
			flags.func = func;
		//}
	}
	return Class.subClass( flags );
}

// A common for opcodes which basically just need to provide texts
/*common_func = function()
{
	var texts = this.str;
	if ( texts.length == 2 )
	{
		return texts[0] + this.args() + texts[1];
	}
};*/
/*

Inform idioms
=============

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js
 
*/

/*
	
TODO:
	loops
		doesn't work yet because of storers before the branch
		Need loops where the condition is at the end -> do {} while ()
	break (& continue?)
	when opcodes are removed, if debug then add a comment
	The @jump check isn't VM independant
	
*/

// Block if statements / while loops
function idiom_if_block( context, pc )
{
	var i = 0,
	subcontext,
	sublen,
	brancher,
	lastop,
	secondlastop;
	
	// This is only needed for pretty printing
	if ( DEBUG )
	{
		// Update the contexts of new contexts
		var update_contexts = function( ops, context )
		{
			for ( var i = 0; i < ops.length; i++ )
			{
				ops[i].context = context;
			}
		};
	}
	
	// First, find the branch opcode
	// (-1 because we don't want to catch the very last opcode, not that it should ever branch to the following statement)
	while ( i < context.ops.length - 1 )
	{
		// As long as no other opcodes have an offset property we can skip the instanceof check
		if ( /* context.ops[i] instanceof Brancher && */ context.ops[i].offset === pc )
		{
			// Sometimes Inform makes complex branches, where the only subcontext opcode would be a brancher itself
			// Join the two branches into one
			if ( context.ops.length - i === 2 /* && context.ops[i + 1] instanceof Brancher */ && context.ops[i + 1].offset )
			{
				lastop = context.ops.pop();
				secondlastop = context.ops.pop();
				// The first brancher must be inverted
				secondlastop.cond.invert = !secondlastop.cond.invert;
				// Make a new BrancherLogic to AND the old branchers together
				lastop.cond = new BrancherLogic( [secondlastop.cond, lastop.cond], '&&' );
				// Fix the labels and return the last opcode to the opcodes array
				lastop.labels = secondlastop.labels.concat( lastop.labels );
				context.ops.push( lastop );
				return 1;
			}
			
			// Make a new Context to contain all of the following opcodes
			subcontext = new Context( context.e, context.ops[i + 1].pc );
			subcontext.ops = context.ops.slice( i + 1 );
			sublen = subcontext.ops.length - 1;
			context.ops.length = i + 1;
			// This is only needed for pretty printing
			if ( DEBUG )
			{
				update_contexts( subcontext.ops, subcontext );
			}
			
			// Set that Context as the branch's target, and invert its condition
			brancher = context.ops[i];
			brancher.result = subcontext;
			brancher.cond.invert = !brancher.cond.invert;
			
			// Check if this is actually a loop
			lastop = subcontext.ops[sublen];
			if ( lastop.code === 140 && ( U2S( lastop.operands[0].v ) + lastop.next - 2 ) === brancher.pc )
			{
				brancher.keyword = 'while';
				subcontext.ops.pop();
			}
			else
			{
				// Mark this subcontext as a stopper if its last opcode is
				subcontext.stopper = lastop.stopper;
			}
			
			if ( DEBUG )
			{
				// Check whether this could be a very complex condition
				var allbranches = 1;
				for ( i = 0; i < sublen + 1; i++ )
				{
					if ( !( subcontext.ops[i] instanceof Brancher ) )
					{
						allbranches = 0;
					}
				}
				if ( allbranches === 1 )
				{
					console.info( 'Potential complex condition in ' + context.pc + ' at ' + brancher.pc );
				}
			}
			
			// Return 1 to signal that we can continue past the stopper
			return 1;
		}
		i++;
	}
}

/*idiom_do_while = function( context )
{
};*/
/*

Quetzal Common Save-File Format
===============================

Copyright (c) 2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

// A savefile
var Quetzal = IFF.subClass({
	// Parse a Quetzal savefile, or make a blank one
	init: function(bytes)
	{
		this._super(bytes);
		if (bytes)
		{
			// Check this is a Quetzal savefile
			if (this.type !== 'IFZS')
			{
				throw new Error('Not a Quetzal savefile');
			}

			// Go through the chunks and extract the useful ones
			for (var i = 0, l = this.chunks.length; i < l; i++)
			{
				var type = this.chunks[i].type, data = this.chunks[i].data;

				// Memory and stack chunks. Overwrites existing data if more than one of each is present!
				if (type === 'CMem' || type === 'UMem')
				{
					this.memory = data;
					this.compressed = (type === 'CMem');
				}
				else if (type === 'Stks')
				{
					this.stacks = data;
				}

				// Story file data
				else if (type === 'IFhd')
				{
					this.release = data.slice(0, 2);
					this.serial = data.slice(2, 8);
					// The checksum isn't used, but if we throw it away we can't round-trip
					this.checksum = data.slice(8, 10);
					this.pc = data[10] << 16 | data[11] << 8 | data[12];
				}
			}
		}
	},

	// Write out a savefile
	write: function()
	{
		// Reset the IFF type
		this.type = 'IFZS';

		// Format the IFhd chunk correctly
		var pc = this.pc,
		ifhd = this.release.concat(
			this.serial,
			this.checksum,
			(pc >> 16) & 0xFF, (pc >> 8) & 0xFF, pc & 0xFF
		);

		// Add the chunks
		this.chunks = [
			{type: 'IFhd', data: ifhd},
			{type: (this.compressed ? 'CMem' : 'UMem'), data: this.memory},
			{type: 'Stks', data: this.stacks}
		];

		// Return the byte array
		return this._super();
	}
});

/*

Z-Machine UI
============

Copyright (c) 2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*

Note: is used by both ZVM and Gnusto. In the case of Gnusto the engine is actually GnustoRunner.
	The engine must have a StructIO modified env
	
*/

var ZVMUI = Class.subClass({
		
	init: function( engine, headerbit )
	{
		this.e = engine;
		this.buffer = '';
		
		// Use the requested formatter (classes is default)
		extend( this, this.formatters[engine.env.formatter] || {} );
		
		if ( DEBUG )
		{
			this.reverse = 0;
			this.bold = 0;
			this.italic = 0;
			this.fg = undefined;
			this.bg = undefined;
		}
		// Bit 0 is for @set_style, bit 1 for the header, and bit 2 for @set_font
		this.mono = headerbit;
		
		this.process_colours();
		
		// Upper window stuff
		this.currentwin = 0;
		this.status = []; // Status window orders
		
		// Construct the basic windows
		engine.orders.push(
			{
				code: 'stream',
				name: 'status'
			},
			{
				code: 'stream',
				name: 'main'
			},
			{
				code: 'find',
				name: 'main'
			}
		);
	},
	
	// Clear the lower window
	clear_window: function()
	{
		this.e.orders.push({
			code: 'clear',
			name: 'main',
			bg: this.bg
		});
	},

	erase_line: function( value )
	{
		if ( value === 1 )
		{
			this.flush();
			this.status.push( { code: "eraseline" } );
		}
	},
	
	erase_window: function( window )
	{
		this.flush();
		if ( window < 1 )
		{
			this.clear_window();
		}
		if ( window === -1 )
		{
			this.split_window( 0 );
		}
		if ( window === -2 || window === 1 )
		{
			this.status.push( { code: "clear" } );
		}
	},
	
	// Flush the buffer to the orders
	flush: function()
	{
		// If we have a buffer transfer it to the orders
		if ( this.buffer !== '' )
		{
			var order = {
				code: 'stream',
				text: this.buffer,
				props: this.format()
			};
			
			( this.currentwin ? this.status : this.e.orders ).push( order );
			this.buffer = '';
		}
	},
	
	format: function()
	{
		var props = {},
		temp,
		classes = [],
		fg = this.fg,
		bg = this.bg;
		
		if ( this.bold )
		{
			classes.push( 'zvm-bold' );
		}
		if ( this.italic )
		{
			classes.push( 'zvm-italic' );
		}
		if ( this.mono )
		{
			classes.push( 'zvm-mono' );
		}
		if ( this.reverse )
		{
			temp = fg;
			fg = bg || this.env.bg;
			bg = temp || this.env.fg;
		}
		if ( typeof fg !== 'undefined' )
		{
			if ( isNaN( fg ) )
			{
				props.css = { color: fg };
			}
			else
			{
				classes.push( 'zvm-fg-' + fg );
			}
		}
		if ( typeof bg !== 'undefined' )
		{
			if ( isNaN( bg ) )
			{
				if ( !props.css )
				{
					props.css = {};
				}
				props.css['background-color'] = bg;
			}
			else
			{
				classes.push( 'zvm-bg-' + bg );
			}
		}
		if ( classes.length )
		{
			props['class'] = classes.join( ' ' );
		}
		return props;
	},
	
	get_cursor: function( array )
	{
		// act() will flush
		this.status.push({
			code: 'get_cursor',
			addr: array
		});
		this.e.act();
	},
	
	// Process CSS default colours
	process_colours: function()
	{
		// Convert RGB to a Z-Machine true colour
		// RGB is a css colour code. rgb(), #000000 and #000 formats are supported.
		function convert_RGB( code )
		{
			var round = Math.round,
			data = /(\d+),\s*(\d+),\s*(\d+)|#(\w{1,2})(\w{1,2})(\w{1,2})/.exec( code ),
			result;
			
			// Nice rgb() code
			if ( data[1] )
			{
				result =  [ data[1], data[2], data[3] ];
			}
			else
			{
				// Messy CSS colour code
				result = [ parseInt( data[4], 16 ), parseInt( data[5], 16 ), parseInt( data[6], 16 ) ];
				// Stretch out compact #000 codes to their full size
				if ( code.length === 4 )
				{
					result = [ result[0] << 4 | result[0], result[1] << 4 | result[1], result[2] << 4 | result[2] ];
				}
			}
			
			// Convert to a 15bit colour
			return round( result[2] / 8.226 ) << 10 | round( result[1] / 8.226 ) << 5 | round( result[0] / 8.226 );
		}
		
		// Standard colours
		var colours = [
			0xFFFE, // Current
			0xFFFF, // Default
			0x0000, // Black
			0x001D, // Red
			0x0340, // Green
			0x03BD, // Yellow
			0x59A0, // Blue
			0x7C1F, // Magenta
			0x77A0, // Cyan
			0x7FFF, // White
			0x5AD6, // Light grey
			0x4631, // Medium grey
			0x2D6B  // Dark grey
		],
		
		// Start with CSS colours provided by the runner
		fg_css = this.e.env.fgcolour,
		bg_css = this.e.env.bgcolour,
		// Convert to true colour for storing in the header
		fg_true = fg_css ? convert_RGB( fg_css ) : 0xFFFF,
		bg_true = bg_css ? convert_RGB( bg_css ) : 0xFFFF,
		// Search the list of standard colours
		fg = colours.indexOf( fg_true ),
		bg = colours.indexOf( bg_true );
		// ZVMUI must have colours for reversing text, even if we don't write them to the header
		// So use the given colours or assume black on white
		if ( fg < 2 )
		{
			fg = fg_css || 2;
		}
		if ( bg < 2 )
		{
			bg = bg_css || 9;
		}
		
		this.env = {
			fg: fg,
			bg: bg,
			fg_true: fg_true,
			bg_true: bg_true
		};
	},
	
	set_colour: function( foreground, background )
	{
		this.flush();
		if ( foreground === 1 )
		{
			this.fg = undefined;
		}
		if ( foreground > 1 && foreground < 13 )
		{
			this.fg = foreground;
		}
		if ( background === 1 )
		{
			this.bg = undefined;
		}
		if ( background > 1 && background < 13 )
		{
			this.bg = background;
		}
	},
	
	set_cursor: function( row, col )
	{
		this.flush();
		this.status.push({
			code: 'cursor',
			to: [row - 1, col - 1]
		});
	},
	
	set_font: function( font )
	{
		// We only support fonts 1 and 4
		if ( font !== 1 && font !== 4 )
		{
			return 0;
		}
		var returnval = this.mono & 0x04 ? 4 : 1;
		if ( font !== returnval )
		{
			this.flush();
			this.mono ^= 0x04;
		}
		return returnval;
	},
			
	// Set styles
	set_style: function( stylebyte )
	{
		this.flush();
		
		// Setting the style to Roman will clear the others
		if ( stylebyte === 0 )
		{
			this.reverse = this.bold = this.italic = 0;
			this.mono &= 0xFE;
		}
		if ( stylebyte & 0x01 )
		{
			this.reverse = 1;
		}
		if ( stylebyte & 0x02 )
		{
			this.bold = 1;
		}
		if ( stylebyte & 0x04 )
		{
			this.italic = 1;
		}
		if ( stylebyte & 0x08 )
		{
			this.mono |= 0x01;
		}
	},
	
	// Set true colours
	set_true_colour: function( foreground, background )
	{
		// Convert a 15 bit colour to RGB
		function convert_true_colour( colour )
		{
			// Stretch the five bits per colour out to 8 bits
			var newcolour = Math.round( ( colour & 0x1F ) * 8.226 ) << 16
				| Math.round( ( ( colour & 0x03E0 ) >> 5 ) * 8.226 ) << 8
				| Math.round( ( ( colour & 0x7C00 ) >> 10 ) * 8.226 );
			newcolour = newcolour.toString( 16 );
			// Ensure the colour is 6 bytes long
			while ( newcolour.length < 6 )
			{
				newcolour = '0' + newcolour;
			}
			return '#' + newcolour;
		}
		
		this.flush();
		
		if ( foreground === 0xFFFF )
		{
			this.fg = undefined;
		}
		else if ( foreground < 0x8000 )
		{
			this.fg = convert_true_colour( foreground );
		}
		
		if ( background === 0xFFFF )
		{
			this.bg = undefined;
		}
		else if ( background < 0x8000 )
		{
			this.bg = convert_true_colour( background );
		}
	},
	
	set_window: function( window )
	{
		this.flush();
		this.currentwin = window;
		this.e.orders.push({
			code: 'find',
			name: window ? 'status' : 'main'
		});
		if ( window )
		{
			this.status.push({
				code: 'cursor',
				to: [0, 0]
			});
		}
	},
	
	split_window: function( lines )
	{
		this.flush();
		this.status.push({
			code: "height",
			lines: lines
		});
	},
	
	// Update ZVM's header with correct colour information
	// If colours weren't provided then the default colour will be used for both
	update_header: function()
	{
		var memory = this.e.m;
		memory.setUint8( 0x2C, isNaN( this.env.bg ) ? 1 : this.env.bg );
		memory.setUint8( 0x2D, isNaN( this.env.fg ) ? 1 : this.env.fg );
		this.e.extension_table( 5, this.env.fg_true );
		this.e.extension_table( 6, this.env.bg_true );
	},
	
	// Formatters allow you to change how styles are marked
	// The desired formatter should be passed in through env
	formatters: {}
});
/*

Z-Machine opcodes
=================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	Abstract out the signed conversions such that they can be eliminated if possible
	don't access memory directly
	
*/

// Common functions
function simple_func( a ) { return '' + a; }

// Common opcodes
var alwaysbranch = opcode_builder( Brancher, function() { return 1; } ),

// Indirect storer opcodes - rather non-generic I'm afraid
// Not used for inc/dec
// @load (variable) -> (result)
// @pull (variable)
// @store (variable) value
Indirect = Storer.subClass({
	storer: 0,
	
	post: function()
	{
		var operands = this.operands,
		op0 = operands[0],
		op0isVar = op0 instanceof Variable;
		
		// Replace the indirect operand with a Variable, and set .indirect if needed
		operands[0] = new Variable( this.e, op0isVar ? op0 : op0.v );
		if ( op0isVar || op0.v === 0 )
		{
			operands[0].indirect = 1;
		}
		
		// Get the storer
		this.storer = this.code === 142 ? operands.pop() : operands.shift();
		
		// @pull needs an added stack. If for some reason it was compiled with two operands this will break!
		if ( operands.length === 0 )
		{
			operands.push( new Variable( this.e, 0 ) );
		}
	},
	
	func: simple_func
}),

Incdec = Opcode.subClass({
	func: function( variable )
	{
		var varnum = variable.v - 1,
		operator = this.code % 2 ? 1 : -1;
		
		// Fallback to the runtime function if our variable is a variable operand itself
		// Or, if it's a global
		if ( variable instanceof Variable || varnum > 14 )
		{
			return 'e.incdec(' + variable + ',' + operator + ')';
		}
		
		return ( varnum < 0 ? 'e.s[e.s.length-1]=e.S2U(e.s[e.s.length-1]+' : ( 'e.l[' + varnum + ']=e.S2U(e.l[' + varnum + ']+' ) ) + operator + ')';
	}
}),

opcodes = {
	
/* je */ 1: opcode_builder( Brancher, function() { return arguments.length === 2 ? this.args( '===' ) : 'e.jeq(' + this.args() + ')'; } ),
/* jl */ 2: opcode_builder( Brancher, function( a, b ) { return a.U2S() + '<' + b.U2S(); } ),
/* jg */ 3: opcode_builder( Brancher, function( a, b ) { return a.U2S() + '>' + b.U2S(); } ),
// Too many U2S/S2U for these...
/* dec_chk */ 4: opcode_builder( Brancher, function( variable, value ) { return 'e.U2S(e.incdec(' + variable + ',-1))<' + value.U2S(); } ),
/* inc_chk */ 5: opcode_builder( Brancher, function( variable, value ) { return 'e.U2S(e.incdec(' + variable + ',1))>' + value.U2S(); } ),
/* jin */ 6: opcode_builder( Brancher, function() { return 'e.jin(' + this.args() + ')'; } ),
/* test */ 7: opcode_builder( Brancher, function() { return 'e.test(' + this.args() + ')'; } ),
/* or */ 8: opcode_builder( Storer, function() { return this.args( '|' ); } ),
/* and */ 9: opcode_builder( Storer, function() { return this.args( '&' ); } ),
/* test_attr */ 10: opcode_builder( Brancher, function() { return 'e.test_attr(' + this.args() + ')'; } ),
/* set_attr */ 11: opcode_builder( Opcode, function() { return 'e.set_attr(' + this.args() + ')'; } ),
/* clear_attr */ 12: opcode_builder( Opcode, function() { return 'e.clear_attr(' + this.args() + ')'; } ),
/* store */ 13: Indirect,
/* insert_obj */ 14: opcode_builder( Opcode, function() { return 'e.insert_obj(' + this.args() + ')'; } ),
/* loadw */ 15: opcode_builder( Storer, function( array, index ) { return 'm.getUint16(e.S2U(' + array + '+2*' + index.U2S() + '))'; } ),
/* loadb */ 16: opcode_builder( Storer, function( array, index ) { return 'm.getUint8(e.S2U(' + array + '+' + index.U2S() + '))'; } ),
/* get_prop */ 17: opcode_builder( Storer, function() { return 'e.get_prop(' + this.args() + ')'; } ),
/* get_prop_addr */ 18: opcode_builder( Storer, function() { return 'e.find_prop(' + this.args() + ')'; } ),
/* get_next_prop */ 19: opcode_builder( Storer, function() { return 'e.find_prop(' + this.args( ',0,' ) + ')'; } ),
/* add */ 20: opcode_builder( Storer, function() { return 'e.S2U(' + this.args( '+' ) + ')'; } ),
/* sub */ 21: opcode_builder( Storer, function() { return 'e.S2U(' + this.args( '-' ) + ')'; } ),
/* mul */ 22: opcode_builder( Storer, function() { return 'e.S2U(' + this.args( '*' ) + ')'; } ),
/* div */ 23: opcode_builder( Storer, function( a, b ) { return 'e.S2U(parseInt(' + a.U2S() + '/' + b.U2S() + '))'; } ),
/* mod */ 24: opcode_builder( Storer, function( a, b ) { return 'e.S2U(' + a.U2S() + '%' + b.U2S() + ')'; } ),
/* call_2s */ 25: CallerStorer,
/* call_2n */ 26: Caller,
/* set_colour */ 27: opcode_builder( Opcode, function() { return 'e.ui.set_colour(' + this.args() + ')'; } ),
/* throw */ 28: opcode_builder( Stopper, function( value, cookie ) { return 'while(e.call_stack.length>' + cookie + '){e.call_stack.shift()}return ' + value; } ),
/* jz */ 128: opcode_builder( Brancher, function( a ) { return a + '===0'; } ),
/* get_sibling */ 129: opcode_builder( BrancherStorer, function( obj ) { return 'e.get_sibling(' + obj + ')'; } ),
/* get_child */ 130: opcode_builder( BrancherStorer, function( obj ) { return 'e.get_child(' + obj + ')'; } ),
/* get_parent */ 131: opcode_builder( Storer, function( obj ) { return 'e.get_parent(' + obj + ')'; } ),
/* get_prop_length */ 132: opcode_builder( Storer, function( a ) { return 'e.get_prop_len(' + a + ')'; } ),
/* inc */ 133: Incdec,
/* dec */ 134: Incdec,
/* print_addr */ 135: opcode_builder( Opcode, function( addr ) { return 'e.print(2,' + addr + ')'; } ),
/* call_1s */ 136: CallerStorer,
/* remove_obj */ 137: opcode_builder( Opcode, function( obj ) { return 'e.remove_obj(' + obj + ')'; } ),
/* print_obj */ 138: opcode_builder( Opcode, function( obj ) { return 'e.print(3,' + obj + ')'; } ),
/* ret */ 139: opcode_builder( Stopper, function( a ) { return 'return ' + a; } ),
/* jump */ 140: opcode_builder( Stopper, function( a ) { return 'e.pc=' + a.U2S() + '+' + ( this.next - 2 ); } ),
/* print_paddr */ 141: opcode_builder( Opcode, function( addr ) { return 'e.print(2,' + addr + '*' + this.e.addr_multipler + ')'; } ),
/* load */ 142: Indirect.subClass( { storer: 1 } ),
/* call_1n */ 143: Caller,
/* rtrue */ 176: opcode_builder( Stopper, function() { return 'return 1'; } ),
/* rfalse */ 177: opcode_builder( Stopper, function() { return 'return 0'; } ),
// Reconsider a generalised class for @print/@print_ret?
/* print */ 178: opcode_builder( Opcode, function( text ) { return 'e.print(2,' + text + ')'; }, { printer: 1 } ),
/* print_ret */ 179: opcode_builder( Stopper, function( text ) { return 'e.print(2,' + text + ');e.print(1,13);return 1'; }, { printer: 1 } ),
/* nop */ 180: Opcode,
/* restart */ 183: opcode_builder( Stopper, function() { return 'e.act(183)'; } ),
/* ret_popped */ 184: opcode_builder( Stopper, function( a ) { return 'return ' + a; }, { post: function() { this.operands.push( new Variable( this.e, 0 ) ); } } ),
/* catch */ 185: opcode_builder( Storer, function() { return 'e.call_stack.length'; } ),
/* quit */ 186: opcode_builder( Stopper, function() { return 'e.act(186)'; } ),
/* new_line */ 187: opcode_builder( Opcode, function() { return 'e.print(1,13)'; } ),
/* verify */ 189: alwaysbranch, // Actually check??
/* piracy */ 191: alwaysbranch,
/* call_vs */ 224: CallerStorer,
/* storew */ 225: opcode_builder( Opcode, function( array, index, value ) { return 'm.setUint16(e.S2U(' + array + '+2*' + index.U2S() + '),' + value + ')'; } ),
/* storeb */ 226: opcode_builder( Opcode, function( array, index, value ) { return 'm.setUint8(e.S2U(' + array + '+' + index.U2S() + '),' + value + ')'; } ),
/* put_prop */ 227: opcode_builder( Opcode, function() { return 'e.put_prop(' + this.args() + ')'; } ),
/* aread */ 228: opcode_builder( Pauser, function() { return 'e.read(' + this.args() + ',' + this.storer.v + ')'; } ),
/* print_char */ 229: opcode_builder( Opcode, function( a ) { return 'e.print(4,' + a + ')'; } ),
/* print_num */ 230: opcode_builder( Opcode, function( a ) { return 'e.print(0,' + a.U2S() + ')'; } ),
/* random */ 231: opcode_builder( Storer, function( a ) { return 'e.random(' + a.U2S() + ')'; } ),
/* push */ 232: opcode_builder( Storer, simple_func, { post: function() { this.storer = new Variable( this.e, 0 ); }, storer: 0 } ),
/* pull */ 233: Indirect,
/* split_window */ 234: opcode_builder( Opcode, function( lines ) { return 'e.ui.split_window(' + lines + ')'; } ),
/* set_window */ 235: opcode_builder( Opcode, function( wind ) { return 'e.ui.set_window(' + wind + ')'; } ),
/* call_vs2 */ 236: CallerStorer,
/* erase_window */ 237: opcode_builder( Opcode, function( win ) { return 'e.ui.erase_window(' + win.U2S() + ')'; } ),
/* erase_line */ 238: opcode_builder( Opcode, function( a ) { return 'e.ui.erase_line(' + a + ')'; } ),
/* set_cursor */ 239: opcode_builder( Opcode, function() { return 'e.ui.set_cursor(' + this.args() + ')'; } ),
/* get_cursor */ 240: opcode_builder( Pauser, function( addr ) { return 'e.ui.get_cursor(' + addr + ')'; } ),
/* set_text_style */ 241: opcode_builder( Opcode, function( stylebyte ) { return 'e.ui.set_style(' + stylebyte + ')'; } ),
/* buffer_mode */ 242: Opcode, // We don't support non-buffered output
/* output_stream */ 243: opcode_builder( Opcode, function() { return 'e.output_stream(' + this.args() + ')'; } ),
/* input_stream */ 244: Opcode, // We don't support changing the input stream
/* sound_effect */ 245: Opcode, // We don't support sounds
/* read_char */ 246: opcode_builder( Pauser, function() { return 'e.read_char(' + ( this.args() || '1' ) + ',' + this.storer.v + ')'; } ),
/* scan_table */ 247: opcode_builder( BrancherStorer, function() { return 'e.scan_table(' + this.args() + ')'; } ),
/* not */ 248: opcode_builder( Storer, function( a ) { return 'e.S2U(~' + a + ')'; } ),
/* call_vn */ 249: Caller,
/* call_vn2 */ 250: Caller,
/* tokenise */ 251: opcode_builder( Opcode, function() { return 'e.tokenise(' + this.args() + ')'; } ),
/* encode_text */ 252: opcode_builder( Opcode, function() { return 'e.encode_text(' + this.args() + ')'; } ),
/* copy_table */ 253: opcode_builder( Opcode, function() { return 'e.copy_table(' + this.args() + ')'; } ),
/* print_table */ 254: opcode_builder( Opcode, function() { return 'e.print_table(' + this.args() + ')'; } ),
/* check_arg_count */ 255: opcode_builder( Brancher, function( arg ) { return arg + '<=e.call_stack[0][4]'; } ),
/* save */ 1000: opcode_builder( Pauser, function() { return 'e.save(' + ( this.next - 1 ) + ',' + this.storer.v + ')'; } ),
/* restore */ 1001: opcode_builder( Pauser, function() { return 'e.act(1001,' + this.storer.v + ')'; } ),
/* log_shift */ 1002: opcode_builder( Storer, function( a, b ) { return 'e.S2U(e.log_shift(' + a + ',' + b.U2S() + '))'; } ),
/* art_shift */ 1003: opcode_builder( Storer, function( a, b ) { return 'e.S2U(e.art_shift(' + a.U2S() + ',' + b.U2S() + '))'; } ),
/* set_font */ 1004: opcode_builder( Storer, function( font ) { return 'e.ui.set_font(' + font + ')'; } ),
/* save_undo */ 1009: opcode_builder( Storer, function() { return 'e.save_undo(' + this.next + ',' + this.storer.v + ')'; } ),
// As the standard says calling this without a save point is illegal, we don't need to actually store anything (but it must still be disassembled)
/* restore_undo */ 1010: opcode_builder( Opcode, function() { return 'if(e.restore_undo())return'; }, { storer: 1 } ),
/* print_unicode */ 1011: opcode_builder( Opcode, function( a ) { return 'e.print(1,' + a + ')'; } ),
// Assume we can print and read all unicode characters rather than actually testing
/* check_unicode */ 1012: opcode_builder( Storer, function() { return 3; } ),
/* set_true_colour */ 1013: opcode_builder( Opcode, function() { return 'e.ui.set_true_colour(' + this.args() + ')'; } ),
/* sound_data */ 1014: Opcode.subClass( { brancher: 1 } ), // We don't support sounds (but disassemble the branch address)
/* gestalt */ 1030: opcode_builder( Storer, function() { return 'e.gestalt(' + this.args() + ')'; } )
/* parchment */ //1031: opcode_builder( Storer, function() { return 'e.op_parchment(' + this.args() + ')'; } )
	
};

/*

ZVM's public API
================

Copyright (c) 2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*

This file represents the public API of the ZVM class.
It is designed to be compatible with Web Workers, with everything passing through inputEvent() and outputEvent() (which must be provided by the user).
	
TODO:
	Specifically handle saving?
	Try harder to find default colours
	
*/

var VM = Class.subClass({
	
	/*

Z-Machine runtime functions
===========================

Copyright (c) 2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	Add a seeded RNG
	Check when restoring that it's a savefile for this storyfile
	Save/restore: table, name, prompt support
	
*/

// These functions will be added to the object literal in api.js

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
		var addr = this.objects + 14 * object + ( attribute / 8 ) | 0;
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
		if ( second === 0 )
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
		this.m.setBuffer( target, this.encode( this.m.getBuffer( zscii + from, length ) ) );
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
		if ( value === undefined )
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
			if ( last_property === prev )
			{
				return this_property;
			}
			// Found the property! Return it's address
			if ( this_property === property )
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
	gestalt: function( id /*, arg*/ )
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
		if ( addr === 0 )
		{
			return 0;
		}
		
		var value = this.m.getUint8( addr - 1 );
		
		// Two size/number bytes
		if ( value & 0x80 )
		{
			value &= 0x3F;
			return value === 0 ? 64 : value;
		}
		// One byte size/number
		return value & 0x40 ? 2 : 1;
	},
	
	// Quick hack for @inc/@dec/@inc_chk/@dec_chk
	incdec: function( varnum, change )
	{
		var result, offset;
		if ( varnum === 0 )
		{
			result = S2U( this.s.pop() + change );
			this.s.push( result );
			return result;
		}
		if ( --varnum < 15 )
		{
			return this.l[varnum] = S2U( this.l[varnum] + change );
		}
		else
		{
			offset = this.globals + ( varnum - 15 ) * 2;
			return this.m.setUint16( offset, this.m.getUint16( offset ) + change );
		}
	},
	
	// Indirect variables
	indirect: function( variable, value )
	{
		if ( variable === 0 )
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
		var i = 1;
		
		// Account for many arguments
		while ( i < arguments.length )
		{
			if ( arguments[i++] === arguments[0] )
			{
				return 1;
			}
		}
	},
	
	jin: function( child, parent )
	{
		return this.get_parent( child ) === parent;
	},
	
	log_shift: function( number, places )
	{
		return places > 0 ? number << places : number >>> -places;
	},
	
	// Manage output streams
	output_stream: function( stream, addr )
	{
		stream = U2S( stream );
		if ( stream === 1 )
		{
			this.streams[0] = 1;
		}
		if ( stream === -1 )
		{
			if ( DEBUG )
			{
				console.info( 'Disabling stream one - it actually happened!' );
			}
			this.streams[0] = 0;
		}
		if ( stream === 3 )
		{
			this.streams[2].unshift( [ addr, '' ] );
		}
		if ( stream === -3 )
		{
			var data = this.streams[2].shift(),
			text = this.text_to_zscii( data[1] );
			this.m.setUint16( data[0], text.length );
			this.m.setBuffer( data[0] + 2, text );
		}
	},
	
	// Print text!
	_print: function( text )
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
			if ( fontbit !== ( this.ui.mono & 0x02 ) )
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
	
	// Print many things
	print: function( type, val )
	{
		// Number
		if ( type === 0 )
		{
			val = '' + val;
		}
		// Unicode
		if ( type === 1 )
		{
			val = String.fromCharCode( val );
		}
		// Text from address
		if ( type === 2 )
		{
			val = this.jit[ val ] || this.decode( val );
		}
		// Object
		if ( type === 3 )
		{
			var proptable = this.m.getUint16( this.objects + 14 * val + 12 );
			val = this.decode( proptable + 1, this.m.getUint8( proptable ) * 2 );
		}
		// ZSCII
		if ( type === 4 )
		{
			if ( !this.unicode_table[ val ] )
			{
				return;
			}
			val = this.unicode_table[ val ];
		}
		this._print( val );
	},
	
	print_table: function( zscii, width, height, skip )
	{
		height = height || 1;
		skip = skip || 0;
		var i = 0;
		while ( i++ < height )
		{
			this._print( this.zscii_to_text( this.m.getBuffer( zscii, width ) ) + ( i < height ? '\r' : '' ) );
			zscii += width + skip;
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
		// Switch to a seeded RNG (or switch off if range == 0)
		if ( range < 1 )
		{
			this.random_state = Math.abs( range );
			this.random_seq = 0;
			return 0;
		}
		
		// Pure randomness
		if ( this.random_state === 0 )
		{
			return 1 + ( Math.random() * range ) | 0;
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
		if ( arguments.length === 3 )
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
		if ( arguments.length === 2 )
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
		if ( parent === 0 )
		{
			return;
		}
		
		older_sibling = this.get_child( parent );
		younger_sibling = this.get_sibling( obj );
		
		// obj is first child
		if ( older_sibling === obj )
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
				if ( temp_younger === obj )
				{
					break;
				}
				older_sibling = temp_younger;
			}
			this.set_family( obj, 0, 0, 0, older_sibling, younger_sibling );
		}
	},
	
	// (Re)start the VM
	restart: function()
	{
		// Set up the memory
		var memory = ByteArray( this.data ),
		
		version = memory.getUint8( 0x00 ),
		addr_multipler = version === 5 ? 4 : 8,
		property_defaults = memory.getUint16( 0x0A ),
		extension = memory.getUint16( 0x36 );
		
		// Check if the version is supported
		if ( version !== 5 && version !== 8 )
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
			eof: ( memory.getUint16( 0x1A ) || 65536 ) * addr_multipler,
			extension: extension,
			extension_count: extension ? memory.getUint16( extension ) : 0,
			
			// Routine and string multiplier
			addr_multipler: addr_multipler
			
		});

		this.ui = new ZVMUI( this, memory.getUint8( 0x11 ) & 0x02 );
		this.init_text();
		
		// Update the header
		this.update_header();
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
				if ( temp === 0 )
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
		this.l = newlocals;
		this.s = newstack;
		
		// Update the header
		this.update_header();
		
		// Set the storer
		this.variable( this.m.getUint8( pc++ ), 2 );
		this.pc = pc;
	},
	
	restore_undo: function()
	{
		if ( this.undo.length === 0 )
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
			if ( abyte === 0 )
			{
				if ( ++zeroes === 256 )
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
			if ( memoryfunc( addr ) === key )
			{
				return addr;
			}
			addr += form;
		}
		return 0;
	},
	
	set_attr: function( object, attribute )
	{
		var addr = this.objects + 14 * object + ( attribute / 8 ) | 0;
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
		return bitmap & flag === flag;
	},
	
	test_attr: function( object, attribute )
	{
		return ( this.m.getUint8( this.objects + 14 * object + ( attribute / 8 ) | 0 ) << attribute % 8 ) & 0x80;
	},
	
	// Update the header after restarting or restoring
	update_header: function()
	{
		var memory = this.m;
		
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
		// Z Machine Spec revision
		memory.setUint16( 0x32, 0x0102 );
		// Clear flags three, we don't support any of that stuff
		this.extension_table( 4, 0 );
		
		this.ui.update_header();
	},
	
	// Read or write a variable
	variable: function( variable, value )
	{
		var havevalue = value !== undefined,
		offset;
		if ( variable === 0 )
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
		else if ( --variable < 15 )
		{
			if ( havevalue )
			{
				this.l[variable] = value;
			}
			else
			{
				return this.l[variable];
			}
		}
		else
		{
			offset = this.globals + ( variable - 15 ) * 2;
			if ( havevalue )
			{
				this.m.setUint16( offset, value );
			}
			else
			{
				return this.m.getUint16( offset );
			}
		}
		return value;
	},
	
	// Utilities for signed arithmetic
	U2S: U2S,
	S2U: S2U,
	
	/*

Z-Machine text functions
========================

Copyright (c) 2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	Consider quote suggestions from 1.1 spec
	
*/

// These functions will be added to the object literal in api.js

	init_text: function()
	{
		var self = this,
		memory = this.m,
		
		alphabet_addr = memory.getUint16( 0x34 ),
		unicode_addr = this.extension_table( 3 ),
		unicode_len = unicode_addr && memory.getUint8( unicode_addr++ );
		
		
		// Generate alphabets
		function make_alphabet( data )
		{
			var alphabets = [[], [], []],
			i = 0;
			while ( i < 78 )
			{
				alphabets[( i / 26 ) | 0][i % 26] = data[ i++ ];
			}
			// A2->7 is always a newline
			alphabets[2][1] = 13;
			self.alphabets = alphabets;
		}
		
		// Make the unicode tables
		function make_unicode( data )
		{
			var table = { 13: '\r' }, // New line conversion
			reverse = { 13: 13 },
			i = 0;
			while ( i < data.length )
			{
				table[155 + i] = String.fromCharCode( data[i] );
				reverse[data[i]] = 155 + i++;
			}
			i = 32;
			while ( i < 127 )
			{
				table[i] = String.fromCharCode( i );
				reverse[i] = i++;
			}
			self.unicode_table = table;
			self.reverse_unicode_table = reverse;
		}
		
		// Check for custom alphabets
		make_alphabet( alphabet_addr ? memory.getBuffer( alphabet_addr, 78 )
			// Or use the standard alphabet
			: this.text_to_zscii( 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ \r0123456789.,!?_#\'"/\\-:()', 1 ) );
		
		// Check for a custom unicode table
		make_unicode( unicode_addr ? memory.getBuffer16( unicode_addr, unicode_len )
			// Or use the default
			: this.text_to_zscii( unescape( '%E4%F6%FC%C4%D6%DC%DF%BB%AB%EB%EF%FF%CB%CF%E1%E9%ED%F3%FA%FD%C1%C9%CD%D3%DA%DD%E0%E8%EC%F2%F9%C0%C8%CC%D2%D9%E2%EA%EE%F4%FB%C2%CA%CE%D4%DB%E5%C5%F8%D8%E3%F1%F5%C3%D1%D5%E6%C6%E7%C7%FE%F0%DE%D0%A3%u0153%u0152%A1%BF' ), 1 ) );
		
		// Parse the standard dictionary
		this.dictionaries = {};
		this.dict = memory.getUint16( 0x08 );
		this.parse_dict( this.dict );
		
		// Optimise our own functions
		/*if ( DEBUG )
		{
			if ( !debugflags.nooptimise )
			optimise_obj( this, 'TEXT' );
		}*/
	},
	
	// Decode Z-chars into ZSCII and then Unicode
	decode: function( addr, length )
	{
		var memory = this.m,
		
		start_addr = addr,
		temp,
		buffer = [],
		i = 0,
		zchar,
		alphabet = 0,
		result = [],
		resulttexts = [],
		usesabbr,
		tenbit,
		unicodecount = 0;
		
		// Check if this one's been cached already
		if ( this.jit[addr] )
		{
			return this.jit[addr];
		}
		
		// If we've been given a length, then use it as the finaladdr,
		// Otherwise don't go past the end of the file
		length = length ? length + addr : this.eof;
		
		// Go through until we've reached the end of the text or a stop bit
		while ( addr < length )
		{
			temp = memory.getUint16( addr );
			addr += 2;
			
			buffer.push( temp >> 10 & 0x1F, temp >> 5 & 0x1F, temp & 0x1F );
			
			// Stop bit
			if ( temp & 0x8000 )
			{
				break;
			}
		}
		
		// Process the Z-chars
		while ( i < buffer.length )
		{
			zchar = buffer[i++];
			
			// Special chars
			// Space
			if ( zchar === 0 )
			{
				result.push( 32 );
			}
			// Abbreviations
			else if ( zchar < 4 )
			{
				usesabbr = 1;
				result.push( -1 );
				resulttexts.push( '\uE000+this.abbr(' + ( 32 * ( zchar - 1 ) + buffer[i++] ) + ')+\uE000' );
			}
			// Shift characters
			else if ( zchar < 6 )
			{
				alphabet = zchar;
			}
			// Check for a 10 bit ZSCII character
			else if ( alphabet === 2 && zchar === 6 )
			{
				// Check we have enough Z-chars left.
				if ( i + 1 < buffer.length )
				{
					tenbit = buffer[i++] << 5 | buffer[i++];
					// A regular character
					if ( tenbit < 768 )
					{
						result.push( tenbit );
					}
					// 1.1 spec Unicode strings - not the most efficient code, but then noone uses this
					else
					{
						tenbit -= 767;
						unicodecount += tenbit;
						temp = i;
						i = ( i % 3 ) + 3;
						while ( tenbit-- )
						{
							result.push( -1 );
							resulttexts.push( String.fromCharCode( buffer[i] << 10 | buffer[i + 1] << 5 | buffer[i + 2] ) );
							// Set those characters so they won't be decoded again
							buffer[i++] = buffer[i++] = buffer[i++] = 0x20;
						}
						i = temp;
					}
				}
			}
			// Regular characters
			else if ( zchar < 0x20 )
			{
				result.push( this.alphabets[alphabet][ zchar - 6 ] );
			}
			
			// Reset the alphabet
			alphabet = alphabet < 4 ? 0 : alphabet - 3;
			
			// Add to the index if we've had raw unicode
			if ( ( i % 3 ) === 0 )
			{
				i += unicodecount;
				unicodecount = 0;
			}
		}
		
		result = this.zscii_to_text( result, resulttexts );
		// Abbreviations must be extracted at run time, so return a function instead
		if ( usesabbr )
		{
			result = {
				toString: bind( Function( 'return"' + result.replace( /\\/g, '\\\\' ).replace( /"/g, '\\"' ).replace( /\r/g, '\\r' ).replace( /\uE000/g, '"' ) + '"' ), this )
			};
		}
		// Cache and return
		if ( start_addr >= this.staticmem )
		{
			this.jit[start_addr] = result;
		}
		return result;
	},
	
	// Encode ZSCII into Z-chars
	encode: function( zscii )
	{
		var alphabets = this.alphabets,
		zchars = [],
		i = 0,
		achar,
		temp,
		result = [];
		
		// Encode the Z-chars
		while ( zchars.length < 9 )
		{
			achar = zscii[i++];
			// Space
			if ( achar === 32 )
			{
				zchars.push( 0 );
			}
			// Alphabets
			else if ( ( temp = alphabets[0].indexOf( achar ) ) >= 0 )
			{
				zchars.push( temp + 6 );
			}
			else if ( ( temp = alphabets[1].indexOf( achar ) ) >= 0 )
			{
				zchars.push( 4, temp + 6 );
			}
			else if ( ( temp = alphabets[2].indexOf( achar ) ) >= 0 )
			{
				zchars.push( 5, temp + 6 );
			}
			// 10-bit ZSCII / Unicode table
			else if ( temp = this.reverse_unicode_table[achar] )
			{
				zchars.push( 5, 6, temp >> 5, temp & 0x1F );
			}
			// Pad character
			else if ( achar === undefined )
			{
				zchars.push( 5 );
			}
		}
		zchars.length = 9;
		
		// Encode to bytes
		i = 0;
		while ( i < 9 )
		{
			result.push( zchars[i++] << 2 | zchars[i] >> 3, ( zchars[i++] & 0x07 ) << 5 | zchars[i++] );
		}
		result[4] |= 0x80;
		return result;
	},
	
	// In these two functions zscii means an array of ZSCII codes and text means a regular Javascript unicode string
	zscii_to_text: function( zscii, texts )
	{
		var i = 0, l = zscii.length,
		charr,
		j = 0,
		result = '';
		
		while ( i < l )
		{
			charr = zscii[i++];
			// Text substitution from abbreviations or 1.1 unicode
			if ( charr === -1 )
			{
				result += texts[j++];
			}
			// Regular characters
			if ( charr = this.unicode_table[charr] )
			{
				result += charr;
			}
		}
		return result;
	},
	
	// If the second argument is set then don't use the unicode table
	text_to_zscii: function( text, notable )
	{
		var array = [], i = 0, l = text.length, charr;
		while ( i < l )
		{
			charr = text.charCodeAt( i++ );
			// Check the unicode table
			if ( !notable )
			{
				charr = this.reverse_unicode_table[charr] || 63;
			}
			array.push( charr );
		}
		return array;
	},
	
	// Parse and cache a dictionary
	parse_dict: function( addr )
	{
		var memory = this.m,
		
		addr_start = addr,
		dict = {},
		entry_len,
		endaddr,
		
		// Get the word separators
		seperators_len = memory.getUint8( addr++ );
		dict.separators = memory.getBuffer( addr, seperators_len );
		addr += seperators_len;
		
		// Go through the dictionary and cache its entries
		entry_len = memory.getUint8( addr++ );
		endaddr = addr + 2 + entry_len * memory.getUint16( addr );
		addr += 2;
		while ( addr < endaddr )
		{
			dict['' + memory.getBuffer( addr, 6 )] = addr;
			addr += entry_len;
		}
		this.dictionaries[addr_start] = dict;
		
		return dict;
	},
	
	// Print an abbreviation
	abbr: function( abbrnum )
	{
		var memory = this.m;
		return this.decode( memory.getUint16( memory.getUint16( 0x18 ) + 2 * abbrnum ) * 2 );
	},
	
	// Tokenise a text
	tokenise: function( text, buffer, dictionary, flag )
	{
		// Use the default dictionary if one wasn't provided
		dictionary = dictionary || this.dict;
		
		// Parse the dictionary if needed
		dictionary = this.dictionaries[dictionary] || this.parse_dict( dictionary );
		
		var memory = this.m,
		
		i = 2,
		textend = i + memory.getUint8( text + 1 ),
		letter,
		separators = dictionary.separators,
		word = [],
		words = [],
		wordstart = i,
		max_words,
		wordcount = 0;
		
		// Find the words, separated by the separators, but as well as the separators themselves
		while ( i < textend )
		{
			letter = memory.getUint8( text + i++ );
			if ( letter === 32 || separators.indexOf( letter ) >= 0 )
			{
				if ( word.length )
				{
					words.push( [word, wordstart] );
					wordstart += word.length;
					word = [];
				}
				if ( letter !== 32 )
				{
					words.push( [[letter], wordstart] );
				}
				wordstart++;
			}
			else
			{
				word.push( letter );
			}
		}
		if ( word.length )
		{
			words.push( [word, wordstart] );
		}
		
		// Go through the text until we either have reached the max number of words, or we're out of words
		max_words = Math.min( words.length, memory.getUint8( buffer ) );
		while ( wordcount < max_words )
		{
			word = dictionary['' + this.encode( words[wordcount][0] )];
			
			// If the flag is set then don't overwrite words which weren't found
			if ( !flag || word )
			{
				// Fill out the buffer
				memory.setUint16( buffer + 2 + wordcount * 4, word || 0 );
				memory.setUint8( buffer + 4 + wordcount * 4, words[wordcount][0].length );
				memory.setUint8( buffer + 5 + wordcount * 4, words[wordcount][1] );
			}
			wordcount++;
		}
		
		// Update the number of found words
		memory.setUint8( buffer + 1, wordcount );
	},
	
	// Handle key input
	keyinput: function( data )
	{
		var charCode = data.charCode,
		keyCode = data.keyCode,
		
		// Key codes accepted by the Z-Machine
		ZSCII_keyCodes = (function(){
			var keycodes = {
				8: 8, // delete/backspace
				13: 13, // enter
				27: 27, // escape
				37: 131, 38: 129, 39: 132, 40: 130 // arrow keys
			},
			i = 96;
			while ( i < 106 )
			{
				keycodes[i] = 49 + i++; // keypad
			}
			i = 112;
			while ( i < 124 )
			{
				keycodes[i] = 21 + i++; // function keys
			}
			return keycodes;
		})();
		
		// Handle keyCodes first
		if ( ZSCII_keyCodes[keyCode] )
		{
			return ZSCII_keyCodes[keyCode];
		}
		
		// Check the character table or return a '?'
		return this.reverse_unicode_table[charCode] || 63;
	},
	
	/*

Z-Machine disassembler - disassembles zcode into an AST
=======================================================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*

Note:
	Nothing is done to check whether an instruction actually has a valid number of operands. Extras will usually be ignored while missing operands may throw errors at either the code building stage or when the JIT code is called.

TODO:
	If we diassessemble part of what we already have before, can we just copy/slice the context?
	
*/

// The disassembler will be added to the object literal in api.js

disassemble: function()
{
	var pc, offset, // Set in the loop below
	memory = this.m,
	temp,
	code,
	opcode_class,
	operands_type, // The types of the operands, or -1 for var instructions
	operands,
	
	// Create the context for this code fragment
	context = new RoutineContext( this, this.pc );
		
	// Utility function to unpack the variable form operand types byte
	function get_var_operand_types( operands_byte, operands_type )
	{
		for ( var i = 0; i < 4; i++ )
		{
			operands_type.push( (operands_byte & 0xC0) >> 6 );
			operands_byte <<= 2;
		}
	}
	
	// Set the context's root context to be itself, and add it to the list of subcontexts
	//context.root = context;
	//context.contexts[0] = context;
	
	// Run through until we can no more
	while (1)
	{		
		// This instruction
		offset = pc = this.pc;
		code = memory.getUint8( pc++ );
		
		// Extended instructions
		if ( code === 190 )
		{
			operands_type = -1;
			code = memory.getUint8( pc++ ) + 1000;
		}
		
		else if ( code & 0x80 )
		{
			// Variable form instructions
			if ( code & 0x40 )
			{
				operands_type = -1;
				// 2OP instruction with VAR parameters
				if ( !(code & 0x20) )
				{
					code &= 0x1F;
				}
			}
			
			// Short form instructions
			else
			{
				operands_type = [ (code & 0x30) >> 4 ];
				// Clear the operand type if 1OP, keep for 0OPs
				if ( operands_type[0] < 3 )
				{
					code &= 0xCF;
				}
			}
		}
		
		// Long form instructions
		else
		{
			operands_type = [ code & 0x40 ? 2 : 1, code & 0x20 ? 2 : 1 ];
			code &= 0x1F;
		}
		
		// Check for missing opcodes
		if ( !opcodes[code] )
		{
			if ( DEBUG )
			{
				console.log( '' + context );
			}
			this.stop = 1;
			throw new Error( 'Unknown opcode #' + code + ' at pc=' + offset );
		}
		
		// Variable for quicker access to the opcode flags
		opcode_class = opcodes[code].prototype;
		
		// Variable form operand types
		if ( operands_type === -1 )
		{
			operands_type = [];
			get_var_operand_types( memory.getUint8(pc++), operands_type );
			
			// VAR_LONG opcodes have two operand type bytes
			if ( code === 236 || code === 250 )
			{
				get_var_operand_types( memory.getUint8(pc++), operands_type );
			}
		}
		
		// Load the operands
		operands = [];
		temp = 0;
		while ( temp < operands_type.length )
		{
			// Large constant
			if ( operands_type[temp] === 0 )
			{
				operands.push( new Operand( this, memory.getUint16(pc) ) );
				pc += 2;
			}
			
			// Small constant
			if ( operands_type[temp] === 1 )
			{
				operands.push( new Operand( this, memory.getUint8(pc++) ) );
			}
			
			// Variable operand
			if ( operands_type[temp++] === 2 )
			{
				operands.push( new Variable( this, memory.getUint8(pc++) ) );
			}
		}
		
		// Check for a store variable
		if ( opcode_class.storer )
		{
			operands.push( new Variable( this, memory.getUint8(pc++) ) );
		}
		
		// Check for a branch address
		// If we don't calculate the offset now we won't be able to tell the difference between 0x40 and 0x0040
		if ( opcode_class.brancher )
		{
			temp = memory.getUint8( pc++ );
			operands.push( [
				temp & 0x80, // iftrue
				temp & 0x40 ?
					// single byte address
					temp & 0x3F :
					// word address, but first get the second byte of it
					( temp << 8 | memory.getUint8( pc++ ) ) << 18 >> 18
			] );
		}
		
		// Check for a text literal
		if ( opcode_class.printer )
		{
			// Just use the address as an operand, the text will be decoded at run time
			operands.push( pc );
			
			// Continue until we reach the stop bit
			// (or the end of the file, which will stop memory access errors, even though it must be a malformed storyfile)
			while ( pc < this.eof )
			{
				temp = memory.getUint8( pc );
				pc += 2;
				
				// Stop bit
				if ( temp & 0x80 )
				{
					break;
				}
			}
		}
		
		// Update the engine's pc
		this.pc = pc;
		
		// Create the instruction
		context.ops.push( new opcodes[code]( this, context, code, offset, pc, operands ) );
		
		// Check for the end of a large if block
		temp = 0;
		if ( context.targets.indexOf( pc ) >= 0 )
		{
			if ( DEBUG )
			{
				// Skip if we must
				if ( !debugflags.noidioms )
				{
					temp = idiom_if_block( context, pc );
				}
			}
			else
			{
				temp = idiom_if_block( context, pc );
			}
		}
		
		// We can't go any further if we have a final stopper :(
		if ( opcode_class.stopper && !temp )
		{
			break;
		}
	}
	
	return context;
},
	
	init: function()
	{
		// Create this here so that it won't be cleared on restart
		this.jit = {};
		this.env = {
			width: 80 // Default width of 80 characters
		};
		
		// Optimise our own functions
		if ( DEBUG )
		{
			// Skip if we must
			if ( !debugflags.nooptimise )
			{
				optimise_obj( this, ['find_prop'] );
			}
		}
		else
		{
			optimise_obj( this, ['find_prop'] );
		}
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
			
			if ( DEBUG )
			{
				if ( data.env.debug )
				{
					get_debug_flags( data.env.debug ); 
				}
			}
			
			// Also need to update the header
			
			// Stop if there's no code - we're being sent live updates
			if ( !code )
			{
				return;
			}
		}
		
		// Load the story file
		if ( code === 'load' )
		{
			this.data = data.data;
			return;
		}
		
		// Clear the list of orders
		this.orders = [];
		
		if ( code === 'restart' )
		{
			this.restart();
		}
		
		if ( code === 'save' )
		{
			// Set the result variable, assume success
			this.variable( data.storer, data.result || 1 );
		}
		
		if ( code === 'restore' )
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
		if ( code === 'read' )
		{
			// Store the terminating character, or 13 if not provided
			this.variable( data.storer, isNaN( data.terminator ) ? 13 : data.terminator );
			
			// Echo the response (7.1.1.1)
			response = data.response;
			this._print( response + '\r' );
			
			// Convert the response to lower case and then to ZSCII
			response = this.text_to_zscii( response.toLowerCase() );
			
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
				this.tokenise( data.buffer, data.parse );
			}
		}
		
		// Handle character input
		if ( code === 'char' )
		{
			this.variable( data.storer, this.keyinput( data.response ) );
		}
		
		// Write the status window's cursor position
		if ( code === 'get_cursor' )
		{
			memory.setUint16( data.addr, data.pos[0] + 1 );
			memory.setUint16( data.addr + 2, data.pos[1] + 1 );
		}
		
		// Resume normal operation
		this.run();
	},
	
	// Run
	run: function()
	{
		var now = new Date(),
		pc,
		result,
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
			result = this.jit[pc]( this );
			
			// Return from a VM func if the JIT function returned a result
			if ( !isNaN( result ) )
			{
				this.ret( result );
			}
			
			// Or if more than five seconds has passed, however only check every 50k times
			// What's the best time for this?
			if ( ++count % 50000 === 0 && ( (new Date()) - now ) > 5000 )
			{
				this.act( 'tick' );
				return;
			}
		}
	},
	
	// Compile a JIT routine
	compile: function()
	{
		var context = this.disassemble();
		
		// Compile the routine with new Function()
		if ( DEBUG )
		{
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
		}
		else // DEBUG
		{
			this.jit[context.pc] = new Function( 'e', optimise( '' + context ) );
		}
		if ( context.pc < this.staticmem )
		{
			console.warn( 'Caching a JIT function in dynamic memory: ' + context.pc );
		}
	},
	
	// Return control to the ZVM runner to perform some action
	act: function( code, options )
	{
		options = options || {};
		
		// Handle numerical codes from jit-code - these codes are opcode numbers
		if ( code === 183 )
		{
			code = 'restart';
		}
		if ( code === 186 )
		{
			code = 'quit';
		}
		if ( code === 1001 )
		{
			code = 'restore';
			options = { storer: options };
		}
		
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
		if ( this.outputEvent )
		{
			this.outputEvent( this.orders );
		}
	}
	
});

VM.ZVMUI = ZVMUI;
/*

VM outro (generic!)
===================

Copyright (c) 2013 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

// Export the VM in node.js
if ( typeof module === "object" && typeof module.exports === "object" )
{
	module.exports = VM;
}

// TODO: Support Web Workers

return VM;

})();