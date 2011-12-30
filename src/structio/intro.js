/*

StructIO intro
==============

Copyright (c) 2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Live reverse
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

// Swap reverse colours - manually called in api.js and textgrid.js
do_reverse = function( elem )
{
	// Swap the fore and back ground colours
	elem.css({
		color: elem.css( 'bgcolor' ),
		'background-color': elem.css( 'color' )
	});
},

rBadBackground = /inh|tra|(\d+, ?){3}0/,

$window = $( window ),
$doc = $( document ),
$body,
bodylineheight;

$(function(){
	$body = $( 'body' );

	// Calculate line height, bodylineheight, in pixels.
	// The CSS value line-height can be:
	//   1) a ratio (based on font-size),
	//   2) a length (px/em/in/cm), or
	//   3) the string "normal"

	var heightstr = $body.css( 'line-height' ),
		fontsizestr = $body.css('font-size');
	// if line-height is a ratio (and therefore ends with a number), multiply it by the font size
	if ( !isNaN( parseInt(heightstr[ heightstr.length-1 ]) ) ) {
		bodylineheight = Math.floor( parseFloat( heightstr ) * parseFloat( fontsizestr ) );
	}
	// if line-height is "normal" (thus not a pixel value or ratio), guess the line height as 140% of the font size
	else if( heightstr == "normal" ) {
		bodylineheight = Math.floor( 1.4 * parseFloat( fontsizestr ) );
	}
	// else, line-height is a length value (we assume it is a px value)
	// TODO: convert em/in/cm values to pixel
	else {
		bodylineheight = parseFloat( heightstr );
	}
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
