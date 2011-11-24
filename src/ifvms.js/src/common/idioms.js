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
	
*/

// Block if statements / while loops
var idiom_if_block = function( context, pc )
{
	var i = 0,
	subcontext,
	brancher,
	lastop,
	secondlastop,
	ops = context.ops;
	
	// First, find the branch opcode
	// (-1 because we don't want to catch the very last opcode, not that it should ever branch to the following statement)
	while ( i < ops.length - 1 )
	{
		// As long as no other opcodes have an offset property we can skip the instanceof check
		if ( /* ops[i] instanceof Brancher && */ ops[i].offset && ops[i].offset == pc )
		{
			// Sometimes Inform makes complex branches, where the only subcontext opcode would be a brancher itself
			// Join the two branches into one
			if ( ops.length - i == 2 /* && ops[i + 1] instanceof Brancher */ && ops[i + 1].offset )
			{
				lastop = ops.pop();
				secondlastop = ops.pop();
				// The first brancher must be inverted
				secondlastop.cond.invert = !secondlastop.cond.invert;
				// Make a new BrancherLogic to AND the old branchers together
				lastop.cond = new BrancherLogic( [secondlastop.cond, lastop.cond], '&&' );
				// Fix the labels and return the last opcode to the opcodes array
				lastop.labels = secondlastop.labels.concat( lastop.labels );
				ops.push( lastop );
				return 1;
			}
			
			// Make a new Context to contain all of the following opcodes
			subcontext = new Context( context.e, ops[i + 1].pc );
			subcontext.ops = ops.slice( i + 1 );
			ops.length = i + 1;
			// This is only needed for pretty printing
			;;; update_contexts( subcontext.ops, subcontext );
			
			// Set that Context as the branch's target, and invert its condition
			brancher = ops[i];
			brancher.result = subcontext;
			brancher.cond.invert = !brancher.cond.invert;
			
			// Check if this is actually a loop
			lastop = subcontext.ops[subcontext.ops.length - 1];
			if ( lastop.jumper && ( U2S( lastop.operands[0].v ) + lastop.next - 2 ) == brancher.pc )
			{
				brancher.keyword = 'while';
				/* DEBUG */
					lastop.toString = function() { return this.label() + '/* Removed by idiom_if_block */'; };
				/* ELSEDEBUG
					subcontext.ops.pop();
				/* ENDDEBUG */
			}
			else
			{
				// Mark this subcontext as a stopper if its last opcode is
				subcontext.stopper = lastop.stopper;
			}
			
			/* DEBUG */
				// Check whether this could be a very complex condition
				var allbranches = 1;
				for ( i = 0; i < subcontext.ops.length; i++ )
				{
					if ( !( subcontext.ops[i] instanceof Brancher ) )
					{
						allbranches = 0;
					}
				}
				if ( allbranches == 1 )
				{
					console.info( 'Potential complex condition in ' + context.pc + ' at ' + brancher.pc );
				}
			/* ENDDEBUG */
			
			// Return 1 to signal that we can continue past the stopper
			return 1;
		}
		i++;
	}
};

/* DEBUG */

var idiom_do_while = function( context )
{
};


// Update the contexts of new contexts
// Only needed for pretty printing
var update_contexts = function( ops, context )
{
	for ( var i = 0; i < ops.length; i++ )
	{
		ops[i].context = context;
	}
};

/* ENDDEBUG */