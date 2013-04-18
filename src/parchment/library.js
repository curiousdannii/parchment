/*

The Parchment Library
=====================

Copyright (c) 2008-2011 The Parchment Contributors
BSD licenced
http://code.google.com/p/parchment

*/

/*

TODO:
	Display a more specific error if one was given by the proxy

*/

(function(window, $){

var rtitle = /([-\w\s_]+)(\.[\w]+(\.js)?)?$/,
rjs = /\.js$/,

// Callback to show an error when the story file wasn't loaded
story_get_fail = function(){
	throw new FatalError( 'Parchment could not load the story. Check your connection, and that the URL is correct.' );
},

// Launcher. Will be run by jQuery.when(). jqXHR is args[2]
launch_callback = function( args )
{
	// Hide the load indicator
	$( '.load' ).detach();
	
	// Create a runner
	var runner = window.runner = new ( window[args[2].vm.runner] || Runner )(
		parchment.options,
		args[2].vm.engine
	),
	
	savefile = location.hash;
	
	// Add the callback
	runner.toParchment = function( event ) { args[2].library.fromRunner( runner, event ); };
	
	// Load it up!
	runner.fromParchment({
		code: 'load',
		data: ( new parchment.lib.Story( args[2].responseArray ) ).data
	});
	
	// Restore if we have a savefile
	if ( savefile && savefile != '#' ) // IE will set location.hash for an empty fragment, FF won't
	{
		runner.fromParchment({
			code: 'restore',
			data: file.base64_decode( savefile.slice( 1 ) )
		});
	}
	// Restart if we don't
	else
	{
		runner.fromParchment({ code: 'restart' });
	}
};

// Callback to show an error if a VM's dependant scripts could be successfully loaded
// Currently not usable as errors are not detected :(
/*scripts_fail = function(){
	throw new FatalError( 'Parchment could not load everything it needed to run this story. Check your connection and try refreshing the page.' );
};*/

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
			//this.filetype = 'zcode';
			this._super();
			this.chunks.push({
				type: 'ZCOD',
				data: data
			});
			this.data = data;
		}
		
		// Check for naked glulx
		else if (IFF.text_from(data, 0) == 'Glul')
		{
			//this.filetype = 'glulx';
			this._super();
			this.chunks.push({
				type: 'GLUL',
				data: data
			});
			this.data = data;
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
					// Parchment uses the first ZCOD/GLUL chunk it finds, but the Blorb spec says the RIdx chunk should be used
					if ( type == 'ZCOD' && !this.zcode )
					{
						this.data = this.chunks[i].data;
					}
					else if ( type == 'GLUL' && !this.glulx )
					{
						this.data = this.chunks[i].data;
					}
						
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

/*				if (this.zcode)
					this.filetype = 'ok story blorbed zcode';
				else
					this.filetype = 'error: no zcode in blorb';
*/			}
/*			// Not a blorb
			else if (this.type == 'IFZS')
				this.filetype = 'error: trying to load a Quetzal savefile';
			else
				this.filetype = 'error unknown iff';
*/		}
/*		else
			// Not a story file
			this.filetype = 'error unknown general';
*/	}
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
		
		this.ui = new parchment.lib.UI( this );
	},
	
	// Load a story or savefile
	load: function( id )
	{
		var self = this,
		
		options = parchment.options,
		
		storyfile = urloptions.story,
		storyName,
		url,
		vm = urloptions.vm,
		i = 0;
		
		// Run the default story only
		if ( options.lock_story )
		{
			// Locked to the default story
			storyfile = options.default_story;

			if ( !storyfile )
			{
				throw new FatalError( 'Story file not specified' );
			}
		}
		// Load the requested story or the default story
		else if ( options.default_story || storyfile )
		{
			// Load from URL, or the default story
			storyfile = storyfile || options.default_story;
		}
		// Show the library
		else
		{
			return this.ui.load_panels();
		}
		
		// Hide the #about, until we can do something more smart with it
		$('#about').remove();
		
		// Show the load indicator
		$( 'body' ).append( self.ui.load_indicator );
		
		// Normalise the storyfile array
		if ( !$.isArray( storyfile ) )
		{
			storyfile = [ storyfile, 0 ];
		}
		url = storyfile[0];
		self.url = url;

		storyName = rtitle.exec( url );
		storyName = storyName ? storyName[1] + " - Parchment" : "Parchment";
		
		// Change the page title
		if ( options.page_title )
		{
			window.document.title = storyName;
		}
		
		// Check the story cache first
		//if ( self.stories.url[url] )
		//	var story = self.stories.url[url];

		// We will have to download it
		//else
		//{
			// If a VM was explicitly specified, use it
			if ( vm )
			{
				vm = parchment.vms[ vm ];
			}
			// Otherwise test each in turn
			else
			{
				for ( ; i < parchment.vms.length; i++ )
				{
					if ( parchment.vms[i].match.test( url ) )
					{
						vm = parchment.vms[i];
						break;
					}
				}
			}
			// Raise an error if we have no VM
			if ( !vm )
			{
				throw new FatalError( 'File type is not supported!' );
			}
			
			// Launch the story with the VM
			try
			{
				this.launch( vm, storyfile );
			}
			catch (e)
			{
				throw new FatalError( e );
			}
		//}
	},
	
	// Get all the required files and launch the VM
	launch: function( vm, storyfile )
	{
		var self = this,
		
		// Load the story file
		actions = [
			
			$.ajax( storyfile[0], { dataType: 'binary', legacy: storyfile[1] } )
				// Attach the library for the launcher to use (yay for chaining)
				.done( function( data, textStatus, jqXHR )
				{
					jqXHR.library = self;
					jqXHR.vm = vm;
				})
				// Some error in downloading
				.fail( story_get_fail )
			
		],
		
		// Get the scripts if they haven't been loaded already
		/* DEBUG */
			scripts = [$.Deferred()],
			script_callback = function()
			{
				if ( vm.files.length == 0 )
				{
					scripts[0].resolve();
					return;
				}
				var dependency = parchment.options.lib_path + vm.files.shift();
				if ( rjs.test( dependency ) )
				{
					$.getScript( dependency, script_callback );
				}
				// CSS
				else
				{
					parchment.library.ui.stylesheet_add( vm.id, dependency );
					script_callback();
				}
			},
		/* ELSEDEBUG
			scripts = [],
		/* ENDDEBUG */
		i = 0,
		dependency;
		
		if ( !vm.loaded )
		{
			vm.loaded = 1;
			
			/* DEBUG */
				script_callback();
			/* ELSEDEBUG
				while ( i < vm.files.length )
				{
					dependency = parchment.options.lib_path + vm.files[i++];
					// JS
					if ( rjs.test( dependency ) )
					{
						scripts.push( $.getScript( dependency ) );
					}
					// CSS
					else
					{
						this.ui.stylesheet_add( vm.id, dependency );
					}
				}
			/* ENDDEBUG */

			// Use jQuery.when() to get a promise for all of the scripts
			actions[1] = $.when.apply( 1, scripts );
				//.fail( scripts_fail );
		}
		
		// Add the launcher callback
		$.when.apply( 1, actions )
			.done( launch_callback );
	},
	
	// An event from a runner
	fromRunner: function( runner, event )
	{
		var code = event.code,
		savefile = location.hash;
		
		if ( code == 'save' )
		{
			location.hash = file.base64_encode( event.data );
		}
		
		if ( code == 'restore' )
		{
			if ( savefile && savefile != '#' )
			{
				event.data = file.base64_decode( savefile.slice( 1 ) );
			}
		}
		
		runner.fromParchment( event );
	},
	
	// Loaded stories and savefiles
	stories: new StoryCache(),
	savefiles: {}
});

parchment.lib.Library = Library;

// VM definitions
parchment.vms = [];
parchment.add_vm = function( defn )
{
	parchment.vms.push( defn );
	parchment.vms[defn.id] = defn;
};

})(window, jQuery);