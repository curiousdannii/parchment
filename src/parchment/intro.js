/*

Parchment Intro: utility functions and various other things that need to be set up
==================================================================================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

(function( window, jQuery, undefined ){ 'use strict';

;;; })();

var $ = jQuery,

extend = function( old, add )
{
	for ( var name in add )
	{
		old[name] = add[name];
	}
	return old;
},

// Are we running from file:? Do it this way just to be fancy and save a few bytes
LOCAL =

// Don't append a timestamp to XHR requests
// Converter for use with the binary dataType prefilter in file.js
$.ajaxSetup({
	cache: 1,
	converters: {
		'* binary': true
    }
})

.isLocal,

// A simple pub/sub implementation
// from http://addyosmani.com/blog/jquery-1-7s-callbacks-feature-demystified/
topics = {},
topic = function( id )
{
	var callbacks,
	topic = topics[id];
	if ( !topic )
	{
		callbacks = $.Callbacks();
		topic = topics[id] = callbacks.fire;
		topic.sub = callbacks.add;
		topic.unsub = callbacks.remove;
	}
	return topic;
},

library,

// The home for Parchment to live in
parchment = window.parchment = {

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
		
		// Output width in characters
		// NOTE: this is not guaranteed to be a stable API option
		//width: 80
	},
	
	//topics: topics,
	topic: topic,
	
	// VM definitions
	vms: []
};
extend( parchment.vms, {
	add: function( defn )
	{
		this.push( defn );
		this[defn.id] = defn;
	},
	match: function( id, url )
	{
		if ( this[id] )
		{
			return this[id];
		}
		for ( var i = 0; i < this.length; i++ )
		{
			if ( this[i].match.test( url ) )
			{
				return this[i];
			}
		}
	}
});

// Don't use XHR for local files
if ( LOCAL )
{
	jQuery.ajaxPrefilter( 'script', function( options /*, originalOptions, jqXHR*/ )
	{
		options.crossDomain = 1;
	});
}