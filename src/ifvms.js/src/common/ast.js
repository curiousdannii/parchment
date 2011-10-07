/*

Abstract syntax trees for IF VMs
================================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*

All AST nodes must use these functions, even constants
(An exception is made for branch addresses and text literals which remain as primitives)
write() functions are used to generate JIT code

Aside from Variable is currently generic and could be used for Glulx too

TODO:
	Precalculate simple arith? Here? ZVM.compile?
	Combine print statements?
	Use strict mode for new Function()?
	
*/

// Find a routine's name
;;; var find_func_name = function( pc ) { while ( !vm_functions[pc] && pc > 0 ) { pc--; } return vm_functions[pc]; };

// Generic/constant operand
// Value is a constant
var Operand = Object.subClass({
	init: function( engine, value )
	{
		this.e = engine;
		this.v = value;
	},
	write: function()
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
	write: function( value )
	{
		var variable = this.v,
		havevalue = arguments.length,
		
		// We may have already evaluated the value's write(), for example in Storer.write()
		value = value && value.write ? value.write() : value,
		offset = this.e.globals + (variable - 16) * 2;
		
		// BrancherStorers need the value
		if ( this.returnval )
		{
			return 'e.variable(' + variable + ',' + value + ')';
		}
		
		// Stack
		if ( variable == 0 )
		{
			// If we've been passed a value we're setting a variable
			return havevalue ? 's.push(' + value + ')' : 's.pop()';
		}
		// Locals
		else if ( variable < 16 )
		{
			variable--;
			return 'l[' + variable + ']' + ( havevalue ? '=' + value : '' );
		}
		// Globals
		else
		{
			if ( havevalue )
			{
				return 'm.setUint16(' + offset + ',' + value + ')';
			}
			else
			{
				return 'm.getUint16(' + offset + ')';
			}
		}
	},
	
	// Convert an Operand into a signed operand
	U2S: function()
	{
		return 'e.U2S(' + this.write() + ')';
	}
}),

// Generic opcode
// .func() must be set, which returns what .write() will actually return; it is passed the operands as its arguments
Opcode = Object.subClass({
	init: function( engine, context, code, pc, next, operands )
	{
		this.e = engine;
		this.context = context;
		this.code = code;
		this.pc = pc;
		this.next = next;
		this.operands = operands;
		
		// Post-init function (so that they don't all have to call _super)
		if ( this.post )
		{
			this.post();
		}
	},
	
	// Write out the opcode, passing .operands to .func(), with a JS comment of the pc/opcode
	write: function()
	{
		return this.label() + ( this.func ? this.func.apply( this, this.operands ) : '' );
	},
	
	// Return a string of the operands separated by commas
	args: function( joiner )
	{
		var i = 0,
		new_array = [];
		
		while ( i < this.operands.length )
		{
			new_array.push( this.operands[i++].write() );
		}
		return new_array.join( joiner );
	},
	
	// Generate a comment of the pc and code
	label: function()
	{
		return '/* ' + this.pc + '/' + this.code + ' */ ';
	}
}),

// Stopping opcodes
Stopper = Opcode.subClass({
	stopper: 1
}),

// Branching opcodes
Brancher = Opcode.subClass({
	// Flag for the disassembler
	brancher: 1,
	
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
		if ( offset == 0 || offset == 1 )
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
		
		this.result = result + '; return';
		this.offset = offset;
		this.ops = [];
		this.labels = [];
		
		// Compare with previous statement
		if ( this.context.ops.length )
		{
			prev = this.context.ops.pop();
			// As long as no other opcodes have an offset property we can skip the instanceof check
			if ( /* prev instanceof Brancher && */ prev.offset == offset )
			{
				// Goes to same offset so reuse the Brancher arrays
				this.ops = prev.ops;
				this.labels = prev.labels;
			}
			else
			{
				this.context.ops.push( prev );
			}
		}
		
		// Push this op and label
		this.ops.push( this );
		this.labels.push( this.pc + '/' + this.code );
	},
	
	// Write out the brancher
	write: function()
	{
		var i = 0,
		op,
		result = this.result;
		
		// Account for Contexts
		if ( result instanceof Context )
		{
			// Update the context to be a child of this context
			;;; result.context = this.context;
			
			result = result.write() + ( result.stopper ? '; return' : '' );
			
			// Extra line breaks for multi-op results
			if ( this.result.ops.length > 1 )
			{
				result = '\n' + result + '\n';
				;;; result += this.context.spacer;
			}
		}
		
		// Acount for many possible conditions
		while ( i < this.ops.length )
		{
			op = this.ops[i];
			this.ops[i++] = ( op.iftrue ? '' : '!(' ) + op.func.apply( op, op.operands ) + ( op.iftrue ? '' : ')' );
		}
		
		// Print out a label for all included branches and the branch itself
		return '/* ' + this.labels.join() + ' */ ' + ( this.invert ? 'if (!(' : 'if (' ) +
			this.ops.join( '||' ) + ( this.invert ? ')) {' : ') {' ) + result + '}';
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
	write: function()
	{
		var data = this._super();
		
		// If we still have a storer operand, use it
		// Otherwise (if it's been removed due to optimisations) just return func()
		return this.storer ? this.storer.write( data ) : data;
	}
}),

// Routine calling opcodes
Caller = Stopper.subClass({
	post: function()
	{
		// Fake a result variable
		this.result = { v: -1 };
	},

	// Write out the opcode
	write: function()
	{
		// Get the address to call
		var addr = this.operands.shift();
		
		// Code generate
		// Debug: include label if possible
		/* DEBUG */
			addr = addr.write();
			var targetname = window.vm_functions && parseInt( addr ) ? ' /* ' + find_func_name( addr * 4 ) + '() */' : '';
			return this.label() + 'e.call(' + addr + ',' + this.result.v + ',' + this.next + ',[' + this.args() + '])' + targetname;
		/* ENDDEBUG */
		return this.label() + 'e.call(' + addr.write() + ',' + this.result.v + ',' + this.next + ',[' + this.args() + '])';
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
Context = Object.subClass({
	init: function( engine, pc )
	{
		this.e = engine;
		this.pc = pc;
		this.ops = [];
		this.targets = []; // Branch targets
		;;; this.spacer = '';
	},
	
	write: function()
	{
		var ops = this.ops,
		compiled_ops = [],
		i = 0;
		
		// Indent the spacer further if needed
		;;; if ( this.context ) { this.spacer = this.context.spacer + '  '; }
		
		// Write out the individual lines
		while ( i < ops.length )
		{
			compiled_ops.push( ops[i++].write() );
		}
		
		// Return the code
		// DEBUG: Pretty print!
		;;; return ( ops.length > 1 ? this.spacer : '' ) + compiled_ops.join( ';\n' + this.spacer );
		return compiled_ops.join( ';' );
	}
}),

// A routine body
RoutineContext = Context.subClass({
	write: function()
	{
		// Add in some extra vars and return
		// Debug: If we have routine names, find this one's name
		/* DEBUG */
			this.name = window.vm_functions && find_func_name( this.pc );
			var funcname = this.name ? '/* ' + this.name + ' */\n' : '';
			return funcname + 'var l=e.l,m=e.m,s=e.s;\n' + this._super();
		/* ENDDEBUG */
		return 'var l=e.l,m=e.m,s=e.s;\n' + this._super();
	}
}),

// Opcode builder
// Easily build a new opcode from a class
opcode_builder = function( Class, func, flags )
{
	var flags = flags || {};
	if ( func )
	{
		flags.func = func;
	}
	return Class.subClass( flags );
};