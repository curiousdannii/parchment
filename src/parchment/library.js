/*
 * The Parchment Library
 *
 * Copyright (c) 2003-2010 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(window){

// A story file
var Story = IFF.subClass({
	// Parse a zblorb or naked zcode story file
	init: function parse_zblorb(data, story_name)
	{
		this.title = story_name;

		// Check for naked zcode
		// FIXME: This check is way too simple. We should look at
		// some of the other fields as well for sanity-checking.
		if (data[0] < 9)
		{
			this.filetype = 'ok story naked zcode';
			this._super();
			this.chunks.push({
				type: 'ZCOD',
				data: data
			});
			this.zcode = data;
		}
		// Check for potential zblorb
		else if (IFF.text_from(data, 0) == 'FORM')
		{
			this._super(data);
			if (this.type == 'IFRS')
			{
				// We have Blorb!
//				this.images = [];
//				this.resources = [];

				// Go through the chunks and extract the useful ones
				for (var i = 0, l = this.chunks.length; i < l; i++)
				{
					var type = this.chunks[i].type;
/*
					if (type == 'RIdx')
						// The Resource Index Chunk, used by parchment for numbering images correctly
						for (var j = 0, c = IFF.num_from(this.chunks[i].data, 0); j < c; j++)
							this.resources.push({
								usage: IFF.text_from(this.chunks[i].data, 4 + j * 12),
								number: IFF.num_from(this.chunks[i].data, 8 + j * 12),
								start: IFF.num_from(this.chunks[i].data, 12 + j * 12)
							});
*/
					if (type == 'ZCOD' && !this.zcode)
						// Parchment uses the first ZCOD chunk it finds, but the Blorb spec says the RIdx chunk should be used
						this.zcode = this.chunks[i].data;

					else if (type == 'IFmd')
					{
						// Treaty of Babel metadata
						// Will most likely break UTF-8
						this.metadata = file.array_to_text(this.chunks[i].data);
						var metadataDOM = $(this.metadata);
						if (metadataDOM)
						{
							//this.metadataDOM = metadataDOM;

							// Extract some useful info
							if ($('title', metadataDOM))
								this.title = $('title', metadataDOM).text();
							if ($('ifid', metadataDOM))
								this.ifid = $('ifid', metadataDOM).text();
							if ($('release', metadataDOM))
								this.release = $('release', metadataDOM).text();
						}
					}
/*
					else if (type == 'PNG ' || type == 'JPEG')
						for (var j = 0, c = this.resources.length; j < c; j++)
						{
							if (this.resources[j].usage == 'Pict' && this.resources[j].start == this.chunks[i].offset)
								// A numbered image!
								this.images[this.resources[j].number] = new image(this.chunks[i]);
						}

					else if (type == 'Fspc')
						this.frontispiece = IFF.num_from(this.chunks[i].data, 0);
*/
				}

				if (this.zcode)
					this.filetype = 'ok story blorbed zcode';
				else
					this.filetype = 'error: no zcode in blorb';
			}
			// Not a blorb
			else if (this.type == 'IFZS')
				this.filetype = 'error: trying to load a Quetzal savefile';
			else
				this.filetype = 'error unknown iff';
		}
		else
			// Not a story file
			this.filetype = 'error unknown general';
	},

	// Load zcode into engine
	load: function loadIntoEngine(engine)
	{
		if (this.zcode)
			engine.loadStory(this.zcode);
		//window.document.title = this.title + ' - Parchment';
	}
}),

// Story file cache
StoryCache = Object.subClass({
	// Add a story to the cache
	add: function(story)
	{
		this[story.ifid] = story;
		if (story.url)
			this.url[story.url] = story;
	},
	url: {}
}),

// Z-Machine launcher
launch_zmachine = function( url, library )
{
	// Store the story in this closure so we can still launch when things load out of order
	var story,
	
	files = 1, timer, lib_path = parchment.options.lib_path,

	// Callback to check if everything has loaded, and to launch the Z-Machine if so
	callback = function( data )
	{
		// Are we being called with a byte array story?
		if ( $.isArray(data) )
			story = data;
		
		if ( --files == 0 )
		{
			// Theoretically everything has been loaded now... though that may not be the case in reality
			// Call stage2() with a timer in case we have to wait a little longer.
			timer = setInterval( stage2, 10 );
		}
	},
	
	// Truly launch it now
	stage2 = function()
	{
		// Check that everything has loaded
		if ( library.loaded_zmachine || 
		     window.GnustoEngine && window.Quetzal && window.EngineRunner && window.Console && window.WebZui && story )
		{
			// Everything is here, finally
			library.loaded_zmachine = true;
			clearInterval( timer );
			
			// Start the VM
			$('#progress-text').html('Starting interpreter...');
			
			var logfunc = typeof console !== undefined ?
				function() {} :
				function(msg) { window.console.log(msg); },

			engine = new GnustoEngine( logfunc ),
			zui = new WebZui( library, engine, logfunc ),
			runner = new EngineRunner( engine, zui, logfunc ),

			mystory = new Story( story, storyName ),
			savefile = location.hash;
			
			logfunc( "Story type: " + mystory.filetype )
			mystory.load( engine );

			if ( savefile && savefile != '#' ) // IE will set location.hash for an empty fragment, FF won't
			{
				engine.loadSavedGame( file.base64_decode( savefile.slice(1)));
				logfunc( 'Loading savefile' );
			}

			runner.run();
		}
	};

	// Download the Z-Machine libs now so they can be parallelised
	if ( !library.loaded_zmachine )
	{
		// Get the correct files for parchment.full.html/parchment.html
		;;; files = 6;
		;;; var libs = ['src/gnusto/gnusto-engine.js', 'src/plugins/quetzal.js', 'src/parchment/engine-runner.js', 'src/parchment/console.js', 'src/parchment/web-zui.js'], i = 0, l = 5;
		;;; while ( i < l ) {
		;;; 	$.getScript( libs[i], callback );
		;;; 	i++;
		;;; }
		;;; /*
		files = 3;
		$.getScript( lib_path + 'gnusto.min.js', callback );
		$.getScript( lib_path + 'zmachine.min.js', callback );
		;;; */
	}
		
	// Download the story
	file.download_to_array( url, callback );
},

// The Parchment Library class
Library = Object.subClass({
	// Load a story or savefile
	load: function(id)
	{
		var options = parchment.options,
		
		// Load from URL, or the default story
		querystring = new Querystring(),
		storyfile = querystring.get('story', options.default_story),
		url = $.isArray( storyfile ) ? storyfile[0] : storyfile;
		this.url = url;

		storyName = url.slice( url.lastIndexOf("/") + 1 );
		storyName = storyName ? storyName + " - Parchment" : "Parchment";
		
		// Change the page title
		if ( options.page_title )
		{
			window.document.title = storyName;
		}

		// Check the story cache first
		if (this.stories.url[url])
			var story = this.stories.url[url];

		// We will have to download it
		else
		{
			$('#progress-text').html('Retrieving story file...');
			// When Glulx support is added we will need to sniff the filename to decide which to launch
			try
			{
				launch_zmachine( storyfile, this );
			}
			catch (e)
			{
				throw new FatalError( e );
			}
		}
	},

	// Loaded stories and savefiles
	stories: new StoryCache(),
	savefiles: {}
});

window.Library = Library;

})(window);
