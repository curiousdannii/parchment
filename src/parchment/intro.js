/*!
 * Parchment
 *
 * Copyright (c) 2003-2010 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */

// Don't append a timestamp to XHR requests
// Use the Last-Modified/If-Modified-Since headers
$.ajaxSetup({
	cache: true,
	ifModified: true
});

// The home for Parchment to live in
var parchment = {};
