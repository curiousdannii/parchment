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
toString() functions are used to generate JIT code

Aside from Variable is currently generic and could be used for Glulx too

TODO:
	Use strict mode for new Function()?
	When we can run through a whole game, test whether using common_func is faster (if its slower then not worth the file size saving)
	Can we eliminate the Operand class?
	Subclass Operand/Variable from Number?
	Replace calls to args() with arguments.join()?
	
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
		if ( variable == 0 )
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
		if ( variable == 0 )
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
Opcode = Object.subClass({
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
BrancherLogic = Object.subClass({
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
				op.func
					? ( op.iftrue ? '' : '!(' ) + op.func.apply( op, op.operands ) + ( op.iftrue ? '' : ')' )
					: op
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
		this.cond = new BrancherLogic( [this] );
		
		/* DEBUG */
		// Stop if we must
		if ( debugflags.noidioms )
		{
			return;
		}
		/* ENDDEBUG */
			
		// Compare with previous statement
		if ( this.context.ops.length )
		{
			prev = this.context.ops.pop();
			// As long as no other opcodes have an offset property we can skip the instanceof check
			if ( /* prev instanceof Brancher && */ prev.offset == offset )
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
		var i = 0,
		result = this.result;
		
		// Account for Contexts
		if ( result instanceof Context )
		{
			// Update the context to be a child of this context
			;;; result.context = this.context;
			
			result = result + ( result.stopper ? '; return' : '' );
			
			// Extra line breaks for multi-op results
			if ( this.result.ops.length > 1 )
			{
				result = '\n' + result + '\n';
				;;; result += this.context.spacer;
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
		// Debug: include label if possible
		/* DEBUG */
			var addr = '' + this.operands.shift(),
			targetname = window.vm_functions && parseInt( addr ) ? ' /* ' + find_func_name( addr * 4 ) + '() */' : '';
			return this.label() + 'e.call(' + addr + ',' + this.result.v + ',' + this.next + ',[' + this.args() + '])' + targetname;
		/* ENDDEBUG */
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
Context = Object.subClass({
	init: function( engine, pc )
	{
		this.e = engine;
		this.pc = pc;
		this.pre = [];
		this.ops = [];
		this.post = [];
		this.targets = []; // Branch targets
		;;; this.spacer = '';
	},
	
	toString: function()
	{
		// Indent the spacer further if needed
		;;; if ( this.context ) { this.spacer = this.context.spacer + '  '; }
		// DEBUG: Pretty print!
		;;; return this.pre.join( '' ) + ( this.ops.length > 1 ? this.spacer : '' ) + this.ops.join( ';\n' + this.spacer ) + this.post.join( '' );
		
		// Return the code
		return this.pre.join( '' ) + this.ops.join( ';' ) + this.post.join( '' );
	}
}),

// A routine body
RoutineContext = Context.subClass({
	toString: function()
	{
		// Debug: If we have routine names, find this one's name
		/* DEBUG */
			var name = window.vm_functions && find_func_name( this.pc );
			if ( name ) { this.pre.unshift( '/* ' + name + ' */\n' ); }
		/* ENDDEBUG */
		
		// Add in some extra vars and return
		this.pre.unshift( 'var l=e.l,m=e.m,s=e.s;\n' );
		return this._super();
	}
}),

// Opcode builder
// Easily build a new opcode from a class
opcode_builder = function( Class, func, flags )
{
	var flags = flags || {};
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
};

// A common for opcodes which basically just need to provide texts
/*common_func = function()
{
	var texts = this.str;
	if ( texts.length == 2 )
	{
		return texts[0] + this.args() + texts[1];
	}
};*/