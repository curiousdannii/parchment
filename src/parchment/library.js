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
	Change page title if Story.launch() has a vm
		rtitle = /([-\w\s_]+)(\.[\w]+(\.js)?)?$/

*/

// Savefile
var Savefile = Model.subClass( 'Savefile', {
	_init_data: 1
}),

// Storyfile
Story = Model.subClass( 'Story', {
	_has: { 'Savefile': [] },
	_id_prop: 'url',
	
	// Load this story and its VM
	launch: function( vm )
	{
		// Get a VM if we can
		vm = parchment.vms.match( vm || this.vm, this.url );
		
		// Or raise an error if we can't
		if ( !vm )
		{
			throw new FatalError( 'File type is not supported!' );
		}
		
		// Get a promise which will resolve when the story and VM are both finished loading
		$.when( this.load(), vm.load() )
			// And then launch the VM!
			.done( launch_callback );
		
		// Update some stats
		this.set( 'lastplay', ( new Date() ).getTime() );
		this.set( 'playcount', ( this.playcount || 0 ) + 1 );
	},
	
	// Get the story file from storage, or download it
	load: function()
	{
		var self = this,
		data = this.data(),
		deferred = $.Deferred();
		
		// We have the data, so resolve the Deferred
		if ( data )
		{
			// Fake an XHR, all we access are these properties
			deferred.resolve({
				responseText: data,
				responseArray: this._array || ( this._array = file.text_to_array( data ) )
			});
		}
		
		// Otherwise download the file
		else
		{
			$.ajax( this.url, { dataType: 'binary', legacy: this.backup } )
				.done( function( data, textStatus, jqXHR )
				{
					// Save the data to storage
					self.data( data );
					// Resolve our deferred with the XHR
					deferred.resolve( jqXHR );
				})
				.fail( story_get_fail );
		}
		
		return deferred;
	}
}),

// Callback to show an error when the story file wasn't loaded
story_get_fail = function(){
	throw new FatalError( 'Parchment could not load the story. Check your connection, and that the URL is correct.' );
},

// Launcher. Will be run by jQuery.when(). jqXHR is args[2]
launch_callback = function( storydata, vm )
{
	// Hide the load indicator
	$( '.load' ).detach();
	
	// Create a runner
	runner = parchment.runner = new ( window[vm.runner] || Runner )(
		parchment.options,
		vm.engine
	);
	
	var savefile = location.hash;
	
	// Add the callback
	runner.toParchment = function( event ) { library.fromRunner( runner, event ); };
	
	// Load it up!
	runner.fromParchment({
		code: 'load',
		data: ( new Blorb( storydata.responseArray ) ).data
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
},

// Callback to show an error if a VM's dependant scripts could be successfully loaded
// Currently not usable as errors are not detected :(
/*scripts_fail = function(){
	throw new FatalError( 'Parchment could not load everything it needed to run this story. Check your connection and try refreshing the page.' );
};*/

// A blorbed story file
Blorb = IFF.subClass({
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
}),

// The Parchment Library class
// Must be instantiated as library (from intro.js)
Library = Collection.subClass({
	// Set up the library
	load: function()
	{
		// Update from localStorage
		this.fetch();
		
		var self = this,
		
		options = parchment.options,
		vm = /vm=(\w+)/.exec( location.search ),
		
		// Get the requested story, if there is one
		story = this.get_story();
		
		// Show the library
		if ( !story )
		{
			return ui.load_panels();
		}
		
		// Hide the #about, until we can do something more smart with it
		$('#about').remove();
		
		// Show the load indicator
		$( 'body' ).append( ui.load_indicator );

		// If we've been told which vm to use, add it to the story
		if ( vm )
		{
			story.set( 'vm', vm = vm[1] );
		}
		
		// Launch the story
		try
		{
			story.launch( vm );
		}
		catch (e)
		{
			throw new FatalError( e );
		}
	},
	
	// Get the requested story, or fall back to a default one
	get_story: function()
	{
		var options = parchment.options,
		
		storyurl = /story=([^;&]+)/.exec( location.search ),
		backupurl,
		story;
		
		// Run the default story only
		if ( options.lock_story )
		{
			// Locked to the default story
			storyurl = options.default_story;

			if ( !storyurl )
			{
				throw 'Story file not specified';
			}
		}
		// Load the requested story or the default story
		else if ( options.default_story || storyurl )
		{
			// Load from URL, or the default story
			storyurl = storyurl && unescape( storyurl[1] ) || options.default_story;
		}
		// Give up
		else
		{
			return;
		}
		
		// storyurl could be an array if it is from the options
		if ( $.isArray( storyurl ) )
		{
			backupurl = storyurl[1];
			storyurl = storyurl[0];
		}
		
		// Try to find this story in the library
		story = this.find( 'url', storyurl )[0];
		
		// Or create it if needed
		if ( !story )
		{
			this.add( story = new Story({
				url: storyurl,
				backup: backupurl
			}) );
		}
		
		return story;
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
	}
});