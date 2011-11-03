/*

StructIO
========

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Timed input
	input terminators
	Determine the width properly

*/

(function( $, undefined ){

// Subclass jQuery
// No point until subclasses support their own csshooks
//var $ = originaljQuery.sub();

// Add a CSS hook for reverse text
$.cssHooks.reverse = {
	set: function( elem, value )
	{
		if ( value )
		{
			// Get the current foreground and background colours
			var $elem = $( elem ),
			foreground = $elem.css( 'color' ),
			background;
			// Getting the current background colour is hard: go through the parent elements until one with a real colour is found
			$elem.add( $elem.parents() )
				.each( function() {
					var mybackground = $( this ).css( 'background-color' );
					if ( !background && mybackground && mybackground != 'transparent' && mybackground != 'inherit' )
					{
						background = mybackground;
					}
				});
			// Now swap them!
			$elem.css({
				color: background,
				'background-color': foreground
			});
		}
	}
};

// Root stream handler. Some structures (like text grids) could have alternative handlers
var basic_stream_handler = function( e )
{
	var order = e.order,
	struct = e.io.structures[order.name] || { node: 'span' },
	
	// Create the new element and set everything that needs to be set
	elem = $( '<' + ( order.node || struct.node ) + '>' )
		.appendTo( e.target )
		.addClass( order.name )
		.css( order.css || {} );
	order.text && elem.html( order.text.replace( /\n/g, '<br>' ) );
	
	// If we have a custom function to run, do so
	if ( struct.func )
	{
		struct.func( elem, e.io );
	}
		
	return false;
};

// The public API
// .input() must be set by whatever uses StructIO
window.StructIO = Object.subClass({
	
	init: function( element )
	{
		element = $( element );
		this.container = element
		this.target = element;
		element.bind( 'stream', basic_stream_handler );
		this.TextInput = new TextInput( this.container );
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
		this.env = {
			width: 80
		};
	},
	
	// Process some output events
	event: function( orders )
	{
		var order, code, i,
		target = this.target,
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
				( order.name ? $( '.' + order.name ) : target )
					.empty()
					.css( 'background-color', order.css && order.css['background-color'] );
			}
			
			// Line input
			if ( code == 'read' )
			{
				order.target = target;
				this.TextInput.getLine( order );
			}
			
			// Character input
			if ( code == 'char' )
			{
				this.TextInput.getChar( order );
			}
		}
	}
});

})( jQuery );