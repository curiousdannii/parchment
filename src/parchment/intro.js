/*

Parchment
=========

Copyright (c) 2013 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

if ( typeof DEBUG === 'undefined' )
{
	DEBUG = true;
}

// Wrap all of Parchment in a closure/namespace, and enable strict mode
(function( window, $ ){ 'use strict';

// Don't append a timestamp to XHR requests
// Converter for use with the binary dataType prefilter in file.js
jQuery.ajaxSetup({
	cache: 1,
	converters: {
		'* binary': true
    }
});

// Don't use XHR for local files
// Limit to Chrome?
jQuery.ajaxPrefilter( 'script', function( options /*, originalOptions, jqXHR*/ )
{
	if ( options.isLocal )
	{
		options.crossDomain = 1;
	}
});

// The home for Parchment to live in
window.parchment = {

	// The default parchment options
	options: {
		// A selector for the top HTML element which we will have complete control over
		container: '#parchment',
		
		// Should no ?story= be given, run this
		// May be an array, in which case [0] is the .z5/.zblorb and [1] is a backup legacy .js file
		//default_story: [ 'stories/troll.z5', 'stories/troll.z5.js' ],
		
		// Where shall we find the lib .js files?
		lib_path: 'lib/',
		
		// Don't allow people to specify additional options in the query string
		//lock_options: 0,
		
		// Lock Parchment so it will only run the default story, which must be provided!
		//lock_story: 0,
		
		// Set to 0 if you don't want Parchment to overwrite your <title>		
		page_title: 1,
		
		// Front page panels to display if no default story
		panels: [ 'search', 'url', 'about' ],
		
		// URL of proxy server to use for files we can't directly load
		proxy_url: 'http://zcode.appspot.com/proxy/'
	},

	// Classes etc
	lib: {}
};

// Isolate the query string options we have
var urloptions = (function( options ) {
	var i = 0, result = {}, temp;
	if ( options[0] == '' )
	{
		i++;
	}
	while ( i < options.length )
	{
		temp = /([^=]+)(=(.*))?/.exec( options[i++] );
		result[temp[1]] = temp[3] ? unescape( temp[3] ) : true;
	}
	return result;
} )( location.search.slice(1).split( /[&;]/g ) );