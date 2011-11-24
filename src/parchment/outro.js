/*

Parchment load scripts
======================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/
;;; (function(window, $){

// Load Parchment, start it all up!
$(function()
{
	var queryoptions = /options=([^;&]+)/.exec( location.search );
	
	// Check for any customised options
	if ( window.parchment_options )
	{
		$.extend( parchment.options, parchment_options );
	}
	
	// Load additional options from the query string
	// Is a try/catch needed?
	if ( !parchment.options.lock_options && queryoptions )
	{
		$.extend( parchment.options, $.parseJSON( unescape( queryoptions[1] ) ) );
	}
	
	// Instantiate our UI
	ui = parchment.ui = new UI();
	
	// Load the library
	library = parchment.library = new Library( Story );
	library.load();

	// Add the Analytics tracker, but only if we're at iplayif.com
	if ( /iplayif.com/.test( location.host ) )
	{
		$.getScript( 'http://google-analytics.com/ga.js', function(){_gat._getTracker( 'UA-7949545-3' )._trackPageview();} );
	}
});

})( this, jQuery );