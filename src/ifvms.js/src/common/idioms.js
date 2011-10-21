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
	break (& continue?)
	when opcodes are removed, if debug then add a comment
	
*/

// Block if statements
var idiom_if_block = function( context, pc )
{
	var i = 0,
	subcontext,
	sublen,
	brancher,
	lastop;
	
	// First, find the branch opcode
	// (-1 because we don't want to catch the very last opcode, not that it should ever branch to the following statement)
	while ( i < context.ops.length - 1 )
	{
		// As long as no other opcodes have an offset property we can skip the instanceof check
		if ( /* context.ops[i] instanceof Brancher && */ context.ops[i].offset == pc )
		{
			// Make a new Context to contain all of the following opcodes
			subcontext = new Context( context.e, context.ops[i + 1].pc );
			subcontext.ops = context.ops.slice( i + 1 );
			sublen = subcontext.ops.length - 1;
			context.ops.length = i + 1;
			update_contexts( subcontext.ops, subcontext );
			
			// Set that Context as the branch's target, and invert its condition
			brancher = context.ops[i];
			brancher.result = subcontext;
			brancher.invert = !brancher.invert;
			
			// Check if this is actually a loop
			lastop = subcontext.ops[sublen];
			if ( lastop.code == 140 && ( U2S( lastop.operands[0].v ) + lastop.next - 2 ) == brancher.pc )
			{
				brancher.keyword = 'while';
				subcontext.ops.pop();
			}
			else
			{
				// Mark this subcontext as a stopper if its last opcode is
				subcontext.stopper = lastop.stopper;
			}
			
			/* DEBUG */
				// Check whether this could be a complex condition
				var allbranches = 1;
				for ( i = 0; i < sublen + 1; i++ )
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
},

// Update the contexts of new contexts
update_contexts = function( ops, context )
{
	for ( var i = 0; i < ops.length; i++ )
	{
		ops[i].context = context;
	}
};