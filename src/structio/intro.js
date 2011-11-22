/*

StructIO intro
==============

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

Note:
	Requires extend() from parchment/intro.js

*/

(function( window, $, undefined ){

;;; })();

var rBadBackground = /inh|tra|(\d+, ?){3}0/,

$window = $( window ),
$doc = $( document ),
$body;

$(function(){ $body = $( 'body' ); });

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
	},
	
	// A hook for reverse style text
	reverse: {
		set: function( elem, value )
		{
			if ( value )
			{
				var $elem = $( elem );
				// Swap the fore and back ground colours
				$elem.css({
					color: $elem.css( 'bgcolor' ),
					'background-color': $elem.css( 'color' )
				});
			}
		}
	}

});