/*

Parchment Intro: utility functions and various other things that need to be set up
==================================================================================

Copyright (c) 2008-2012 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Invesigate these Apple media options
	    <link rel="apple-touch-icon" href="media/img/iphone/icon.png">
		<link rel="apple-touch-startup-image" href="media/img/iphone/splash.png">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black">

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

// These will all be class instances, but there should only ever be one at once
storage,
ui,
library,
runner,
engine,

// Isolate the query string options we have
urloptions = (function( options ) {
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
	},
	
	//topics: topics,
	topic: topic,
	
	// VM definitions
	vms: []
},

// Load a VM's dependent files - attached by vms.add()
load_vm = function( callback )
{
	// We've loaded this VM before, so run the callback immediately
	if ( this.loaded )
	{
		return callback( this );
	}
	
	this.loaded = 1;
	
	var self = this,
	i = 0,
	dependency,
	
	// Ensure that the files are loaded in the correct order (Debug only)
	/* DEBUG */
		scripts = [$.Deferred()],
		script_callback = function()
		{
			if ( self.files.length == 0 )
			{
				scripts[0].resolve();
				return;
			}
			var dependency = parchment.options.lib_path + self.files.shift();
			if ( /\.js$/.test( dependency ) )
			{
				$.getScript( dependency, script_callback );
			}
			// CSS
			else
			{
				parchment.library.ui.stylesheet_add( self.id, dependency );
				script_callback();
			}
		};
	/* ELSEDEBUG
		scripts = [];
	/* ENDDEBUG */
	
	// Load all the dependencies
	/* DEBUG */
		script_callback();
	/* ELSEDEBUG
		while ( i < this.files.length )
		{
			dependency = parchment.options.lib_path + this.files[i++];
			// JS
			if ( /\.js$/.test( dependency ) )
			{
				scripts.push( $.getScript( dependency ) );
			}
			// CSS
			else
			{
				ui.stylesheet_add( this.id, dependency );
			}
		}
	/* ENDDEBUG */
	
	// Use jQuery.when() to get a promise for all of the scripts
	$.when.apply( this, scripts )
		// When all the scripts are loaded, then run the callback function with this vm
		.done( function(){ callback( self ); } );
		//.fail( scripts_fail );
};

// Callback to show an error if a VM's dependant scripts could be successfully loaded
// Currently not usable as errors are not detected :(
/*scripts_fail = function(){
	throw new FatalError( 'Parchment could not load everything it needed to run this story. Check your connection and try refreshing the page.' );
};*/

// VM helper functions - here is as good a place as any to define them
extend( parchment.vms, {
	add: function( defn )
	{
		this.push( defn );
		this[defn.id] = defn;
		defn.load = load_vm;
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