/*!
 * Parchment
 *
 * Copyright (c) 2003-2010 The Parchment Contributors
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
var parchment = {};
