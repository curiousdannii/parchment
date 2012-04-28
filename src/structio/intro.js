/*

StructIO intro
==============

Copyright (c) 2012 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Calculate bodylineheight with the rest of the metrics?

*/

(function( window, $, undefined ){

;;; })();

var extend = function( old, add )
{
	for ( var name in add )
	{
		old[name] = add[name];
	}
	return old;
},

rBadBackground = /inh|tra|(\d+, ?){3}0/,

$window = $( window ),
$doc = $( document ),
$body,
bodylineheight;

$(function()
{
	$body = $( 'body' );
	
	// Calculate the body line-height
	var elem = $( '<span>&nbsp;</span>' ).appendTo( $body );
	bodylineheight = elem.height();
	elem.remove();
});

extend( $.cssHooks, {

	// Hooks for messing around with background colours
	bgcolor: {
		// Get the resolved colour - no inherits or transparents allowed!
		get: function( elem )
		{
			var $elem = $( elem ),
			background = $elem.css( 'background-color' );
			// Getting the current background colour is hard: go through the parent elements until one with a real colour is found
			if ( rBadBackground.test( background ) )
			{
				return $elem.parent().css( 'bgcolor' );
			}
			return background;
		},
		// Set the background colour of all elements up the tree until one is found with a proper colour
		set: function( elem, value )
		{
			var $elem = $( elem ),
			parent = $elem.parent();
			$elem.css( 'background-color', value );
			// Recurse up the tree
			if ( rBadBackground.test( parent.css( 'background-color' ) ) )
			{
				parent.css( 'bgcolor', value );
			}
		}
	}

});