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
	// Check for any customised options
	if ( window.parchment_options )
	{
		$.extend( parchment.options, parchment_options );
	}
	
	// Load additional options from the query string
	// Is a try/catch needed?
	if ( !parchment.options.lock_options && urloptions.options )
	{
		$.extend( parchment.options, $.parseJSON( urloptions.options ) );
	}
	
	// Instantiate our UI
	ui = parchment.ui = new UI();
	
	// Some extra debug options
	/* DEBUG */
	parchment.options.debug = urloptions.debug;
	/* ENDDEBUG */
	
	// Create a storage object
	storage_factory( 'parchment', function( storage_instance )
	{
		storage = parchment.storage = storage_instance;
		library = parchment.library = new Library( Story );
		// Start and fetch the library, and then finally load the library.
		// Have we nested enough callbacks yet?
		library.fetch( function(){ library.load(); } );
	});

	// Add the Analytics tracker, but only if we're at iplayif.com
	if ( /iplayif.com/.test( location.host ) )
	{
		$.getScript( 'http://google-analytics.com/ga.js', function(){_gat._getTracker( 'UA-7949545-3' )._trackPageview();} );
	}
});

})( this, jQuery );