/*

Parchment UI
============

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

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
		var panels = parchment.options.panels,
		search_data, search_input, search_results,
		
		// Perform a search of the archive
		dosearch = function()
		{
			// Filter the archive
			var key = RegExp( search_input.val().replace( ' ', '( )?' ), 'i' ),
			results = $.grep( search_data, function( story ){
				return key.test( story.path + story.desc );
			});
			// Limit to 30 results
			results = results.slice( 0, 30 );
			// Fill the results div
			search_results.html( $.map( results, map_results_callback ).join('') );
		};
		
		// A search box
		if ( $.inArray( 'search', panels ) != -1 )
		{
			this.panels.search = $( '<div class="panel search"><label for="panel_search">Search the IF Archive for games you can play with Parchment. You might also like to search the <a href="http://ifdb.tads.org">IFDB</a> or the <a href="http://ifwiki.org">IF Wiki</a>.</label><input id="panel_search"><div></div></div>' );
			
			search_input = this.panels.search.find( 'input' );
			search_results = search_input.next();
				
			// Load the archive json file
			search_input.keydown(function(){
				search_input.unbind( 'keydown' );
				$.getJSON( 'stories/if-archive.json' )
					.done(function( data ){
						search_data = data;
						// Attach the real handler once the archive's been downloaded, and then run it once
						search_input.keyup( dosearch );
						dosearch();
					});
			});
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