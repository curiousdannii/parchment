/*

StructIO
========

Copyright (c) 2012 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Timed input
	input terminators
	Listen for the window being resized to smaller than the current width
	Allow the window to be drag-resized
	Detect that position: fixed doesn't work

*/

// Root stream handler. Some structures (like text grids) could have alternative handlers
var basic_stream_handler = function( e )
{
	var order = e.order,
	struct = e.io.structures[order.name] || { node: 'span' },
	node = order.node || struct.node,
	text = order.text,
	
	// Create the new element and set everything that needs to be set
	elem = $( '<' + node + '>' )
		.appendTo( e.target )
		.addClass( order.name )
		.css( order.css || {} )
		.text( text || '' );
	
	// If we have a custom function to run, do so
	if ( struct.func )
	{
		struct.func( elem, e.io );
	}
		
	return false;
};

// The public API
// .input() must be set by whatever uses StructIO
StructIO = Object.subClass({
	
	init: function( env )
	{
		env = extend( {}, env );
		this.env = env;
		var element = $( env.container ),
		
		// Calculate the width we want
		measureelem = $( '<tt>00000</tt>' )
			.appendTo( element ),
		charheight = measureelem.height(),
		charwidth = measureelem.width() / 5,
		widthinchars = Math.min( Math.floor( element.width() / charwidth ), env.width || 80 );
		measureelem.remove();
		
		extend( env, {
			charheight: charheight,
			charwidth: charwidth,
			width: widthinchars,
			fgcolour: element.css( 'color' ),
			bgcolour: element.css( 'bgcolor' )
		});
		// Set the container's width: +2 to account for the 1px of padding the structures inside will receive to hide obnoxious serifs
		element.width( widthinchars * charwidth + 2 );
		
		this.container = element
		this.target = element;
		element.on( 'stream', basic_stream_handler );
		this.TextInput = new TextInput( element );
		
		// Default structures
		this.structures = {
			main: {
				node: 'div'
			},
			status: {
				node: 'div',
				func: function( elem, io ) { new TextGrid( elem, io ); }
			}
		};
	},
	
	// Process some output events
	event: function( orders )
	{
		var order, code, i,
		target = this.target,
		TextInput = this.TextInput,
		temp;
		
		// Process the orders
		for ( i = 0; i < orders.length; i++ )
		{
			order = orders[i];
			code = order.code;
			
			// Specify the elements to use for various structures
			// All structures must specify at least the node to use
			if ( code == 'structures' )
			{
				order.code = undefined;
				$.extend( this.structures, order );
			}
			
			// Find a new target element
			if ( code == 'find' )
			{
				this.target = target = $( '.' + order.name );
			}
			
			// Add a structure
			if ( code == 'stream' )
			{
				// .to will let you temporarily stream to something else
				( order.to ? $( '.' + order.to ) : target )
					.trigger({
						type: 'stream',
						io: this,
						order: order
					});
			}
			
			if ( code == 'clear' )
			{
				var temp = order.name ? $( '.' + order.name ) : target;
				temp.empty();
				// Set the background colour
				// If we're clearing the main window, then change <body> instead
				if ( order.css && order.css['background-color'] )
				{
					( order.name == 'main' ? $body : temp ).css( 'background-color', order.css['background-color'] );
				}
			}
			
			// Line input
			if ( code == 'read' )
			{
				order.target = target;
				TextInput.getLine( order );
			}
			
			// Character input
			if ( code == 'char' )
			{
				TextInput.getChar( order );
			}
			
			// When quitting, scroll to the bottom in case something was printed since the last input
			if ( code == 'quit' )
			{
				TextInput.scroll();
			}
		}
	}
});