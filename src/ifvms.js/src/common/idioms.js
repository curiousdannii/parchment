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
	break (& continue?)
	
*/

// Block if statements
var idiom_if_block = function( context, pc )
{
	// First, find the branch opcode
	// (-1 because we don't want to catch the very last opcode, not that it should ever branch to the following statement)
	for ( var i = 0, subcontext; i < context.ops.length - 1; i++ )
	{
		// As long as no other opcodes have an offset property we can skip the instanceof check
		if ( /* context.ops[i] instanceof Brancher && */ context.ops[i].offset == pc )
		{
			// Make a new Context to contain all of the following opcodes
			subcontext = new Context( context.e, context.ops[i + 1] );
			subcontext.ops = context.ops.slice( i + 1 );
			context.ops.length = i + 1;
			update_contexts( subcontext.ops, subcontext );
			
			// Set that Context as the branch's target, and invert its condition
			context.ops[i].result = subcontext;
			context.ops[i].invert = !context.ops[i].invert;
			
			// Mark this subcontext as a stopper if its last opcode is
			subcontext.stopper = subcontext.ops[subcontext.ops.length - 1].stopper;
			
			/* DEBUG */
				// Check whether this could be a complex condition
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
					log( 'Potential complex condition in: ' + context.pc );
				}
			/* ENDDEBUG */
			
			// Return 1 to signal that we can continue past the stopper
			return 1;
		}
	}
},

// Update the contexts of new contexts
update_contexts = function( ops, context )
{
	for ( var i = 0; i < ops.length; i++ )
	{
		ops[i].context = context;
	}
};