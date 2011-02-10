/*

The Parchment Library
=====================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/
(function(window, $){

// A story file
parchment.lib.Story = IFF.subClass({
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
});

// Story file cache
var StoryCache = Object.subClass({
	// Add a story to the cache
	add: function(story)
	{
		this[story.ifid] = story;
		if (story.url)
			this.url[story.url] = story;
	},
	url: {}
}),

// The Parchment Library class
Library = Object.subClass({
	// Set up the library
	init: function()
	{
		// Keep a reference to our container
		this.container = $( parchment.options.container );
		
		// Load indicator
		this.load_indicator = $( '<div class="dialog load"><p>Parchment is loading.<p>&gt; <blink>_</blink></div>' );
	},
	
	// Load a story or savefile
	load: function(id)
	{
		var self = this,
		
		options = parchment.options;
		
		// Show the load indicator
		$( 'body' ).append( self.load_indicator );
		
		if ( options.lock_story )
		{
			// Locked to the default story
			var storyfile = options.default_story;
		}
		else
		{
			// Load from URL, or the default story
			var querystring = new Querystring(),
			storyfile = querystring.get('story', options.default_story);
		}
		if ( !$.isArray( storyfile ) )
		{
			storyfile = [ storyfile, 0 ];
		}
		var url = storyfile[0];
		self.url = url;

		storyName = url.slice( url.lastIndexOf("/") + 1 );
		storyName = storyName ? storyName + " - Parchment" : "Parchment";
		
		// Change the page title
		if ( options.page_title )
		{
			window.document.title = storyName;
		}
		
		// Check the story cache first
		if ( self.stories.url[url] )
			var story = self.stories.url[url];

		// We will have to download it
		else
		{
			// When Glulx support is added we will need to sniff the filename to decide which to launch
			try
			{
				this.launch( parchment.vms[0], storyfile );
			}
			catch (e)
			{
				throw new FatalError( e );
			}
		}
	},
	
	// Get all the required files and launch the VM
	launch: function( vm, storyfile )
	{
		var self = this,
		scripts = [], when = [];
		
		// Load the story file
		when.push( $.ajax( storyfile[0], { dataType: 'binary', legacy: storyfile[1] } )
		
			// Attach the library for the launcher to use (yay for chaining)
			.done( function( data, textStatus, jqXHR )
			{
				jqXHR.library = self;
			})
			
		);
		
		// Get the scripts if they haven't been loaded already
		if ( !vm.loaded )
		{
			vm.loaded = 1;
			
			$.each( vm.files, function( i, value )
			{
				scripts.push( $.getScript( parchment.options.lib_path + value ) );
			});
			
			// Use jQuery.when() to get a promise for all of the scripts
			when.push( $.when.apply( 1, scripts ) );
		}
		
		// Add the launcher callback
		$.when.apply( 1, when )
			.done( vm.launcher );
	},

	// Loaded stories and savefiles
	stories: new StoryCache(),
	savefiles: {}
});

parchment.lib.Library = Library;

// VM definitions
parchment.vms = [];

})(window, jQuery);
