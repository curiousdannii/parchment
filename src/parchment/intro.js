/*!
 * Parchment
 * Built: BUILDDATE
 *
 * Copyright (c) 2008-2010 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */

// Don't append a timestamp to XHR requests
// Use the Last-Modified/If-Modified-Since headers, but not when loading from a file:
jQuery.ajaxSetup({
	cache: true,
	dataType: 'text',
	ifModified: location.protocol !== 'file:'
});

// The home for Parchment to live in
var parchment = {

	// The default parchment options
	options: {
		// A selector for the top HTML element which we will have complete control over
		container: '#parchment',
		
		// Should no ?story= be given, run this
		default_story: 'stories/troll.z5.js',
		
		// Where shall we find the lib .js files?
		lib_path: 'lib/',
		
		// Lock Parchment so it will only run the default story
		lock_story: 0,
		
		// Set to 0 if you don't want Parchment to overwrite your <title>		
		page_title: 1,
		
		// URL of proxy server to use for files we can't directly load
		proxy_url: 'http://zcode.appspot.com/proxy/'
	},

	// Classes etc
	lib: {}
};
