/*

StructIO
========

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment
 
*/
(function( $ ){

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
			})
				.addClass( 'reverse' );
		}
	}
};

// A basic ZVM runner
function run( engine )
{
	var order, i, response;

	engine.run();
	
	// Process the orders
	for ( i = 0; i < engine.orders.length; i++ )
	{
		order = engine.orders[i];
		
		// Text output
		// [ 'print', styles, text ]
		if ( order.code == 'print' )
		{
			$( order.css.node ? '<' + order.css.node + '>' : '<span>' )
				.appendTo( '#output' )
				.css( order.css )
				.html( order.text.replace( /\n/g, '<br>' ) );
		}
		
		// Line input
		if ( order.code == 'read' )
		{
			// Get the input
			response = prompt( 'Text input' ) || '';
			// Don't append, it is the interpreter's responsibility to send the response back
			//$( '#output' ).append( response + '<br>' );
			
			// Return the input to the VM
			order.response = response;
			order.terminator = 13; // 1.1 spec
			engine.event( order );
		}
		
		// Quit
		if ( order.code == 'quit' )
		{
			return;
		}
	}
	
	setTimeout( function(){ run(engine); }, 1 );
}

window.run = run;

})( jQuery );