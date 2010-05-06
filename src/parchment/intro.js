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
$.ajaxSetup({
	cache: true,
	dataType: 'text',
	ifModified: location.protocol !== 'file:'
});

// The home for Parchment to live in
var parchment = {

	// The default parchment options
	options: {
		default_story: 'stories/troll.z5.js',
		lib_path: 'lib/',
		page_title: 1,
		proxy_url: 'http://zcode.appspot.com/proxy/'
	},

	// Classes etc
	lib: {}
};
