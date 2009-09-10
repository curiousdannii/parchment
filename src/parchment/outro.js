/*
 * Parchment load scripts
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(window){

var parchment = window.parchment;

// The default parchment options
parchment.options = {
	default_story: 'stories/troll.z5.js',
	zcode_appspot_url: 'http://zcode.appspot.com/'
};

// Load Parchment, start it all up!
function load_parchment()
{
	// Check for any customised options
	if (window.parchment_options)
		$.extend(parchment.options, parchment_options);

	// Load the library
	var library = new Library();
	parchment.library = library;
	library.load();

	// As we only support Zcode at the moment, preload Gnusto and its runner
	// Use this sneaky trick to load the original files for parchment.full.html
	;;; $.getScript('src/gnusto/gnusto-engine.js');
	;;; $.getScript('src/parchment/engine-runner.js');
	;;; /*
	$.getScript('lib/gnusto.min.js');
	;;; */

	// Add the Analytics tracker, but only if we're at parchment.googlecode.com
	if (location.href.slice(0, 31) == 'http://parchment.googlecode.com')
		$.getScript('http://www.google-analytics.com/ga.js', function(){gat._getTracker("UA-7949545-1")._trackPageview();});
}

$(load_parchment);

})(window);
