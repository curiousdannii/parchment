/*

Parchment load scripts
======================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/
(function(window, $){

var parchment = window.parchment;

// Load Parchment, start it all up!
$(function()
{
	// Check for any customised options
	if ( window.parchment_options )
	{
		$.extend( parchment.options, parchment_options );
	}
	
	// Load the library
	var library = new parchment.lib.Library();
	parchment.library = library;
	library.load();

	// Add the Analytics tracker, but only if we're at iplayif.com
	if ( location.href.indexOf( 'iplayif.com' ) != -1 )
	{
		$.getScript( 'http://google-analytics.com/ga.js', function(){_gat._getTracker( 'UA-7949545-3' )._trackPageview();} );
	}
});

})( this, jQuery );