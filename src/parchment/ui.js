/*

Parchment UI
============

Copyright (c) 2008-2015 The Parchment Contributors
BSD licenced
https://github.com/curiousdannii/parchment

*/

/*

TODO:
	Fix the stylesheets implementation to actually allow enabling/disabling in IE

*/

(function($){

var window = this,

// Map results callback
results_link = '<p><a href="' + location.href + '?story=http://mirror.ifarchive.org/',
map_results_callback = function( story )
{
	return results_link + story.path + '">' + story.desc + '</a></p>';
};

// The main UI class
parchment.lib.UI = Object.subClass({
	init: function( library )
	{
		this.library = library;
		this.panels = {};
		
		// Load indicator
		this.load_indicator = $( '<div class="dialog load"><p>Parchment is loading.<p>&gt; <blink>_</blink></div>' );
	},

	// Stylesheet management
	// Add some stylesheets, disabled at first
	stylesheet_add: function( /* title, url, ... */ )
	{
		var args = arguments, i;
		for ( i = 1; i < args.length; i++ )
		{
			// The IE way...
			if ( document.createStyleSheet )
			{
				document.createStyleSheet( args[i] );
			}
			// The better way
			else
			{
				$( '<link>', {
					rel: 'alternate stylesheet',
					href: args[i],
					title: args[0],
					type: 'text/css'
				})
					.appendTo( 'head' )
					[0].disabled = true;
			}
		}
	},
	// Switch on/off a stylesheet
	stylesheet_switch: function( title, enable )
	{
		$( 'link[rel*="stylesheet"][title="' + title + '"]' )
			.each( function(){
				this.disabled = !enable;
			}); 
	},
	
	// Load panels for the front page
	load_panels: function()
	{
		var panels = parchment.options.panels;
		
		// Look for stories at the IFDB
		if ( $.inArray( 'ifdb', panels ) != -1 )
		{
			this.panels.ifdb = $( '<p class="panel">Find stories to play at the <a href="http://ifdb.tads.org/">Interactive Fiction Database</a>.' );
		}
		
		// A form to load any story file
		if ( $.inArray( 'url', panels ) != -1 )
		{
			this.panels.url = $( '<form class="panel url"><label for="panel_url">You may use Parchment to play any story file on the internet, simply copy its address here:</label><input id="panel_url" name="story"></form>' );
		}
		
		this.library.container.append( this.panels[ panels[0] ] );
		this.panels.active = panels[0];
	}

});

})(jQuery);