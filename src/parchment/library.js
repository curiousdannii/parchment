/*
 * The Parchment Library
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(window){

// A story file
var Story = IFF.extend({
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
var StoryCache = Class.extend({
	// Add a story to the cache
	add: function(story)
	{
		this[story.ifid] = story;
		if (story.url)
			this.url[story.url] = story;
	},
	url: {}
});

// The Parchment Library class
window.Library = Class.extend({
	// Load a story or savefile
	load: function(id)
	{
		// Load from URL, or the default story
		var querystring = new Querystring(),
		url = querystring.get('story', parchment.options.default_story);

		storyName = getFilenameFromUrl(url);
		storyName = storyName ? storyName + " - Parchment" : "Parchment";
		window.document.title = storyName;

		// Check the story cache first
		if (this.stories.url[url])
			var story = this.stories.url[url];

		// We will have to download it
		else
		{
			$('#progress-text').html('Retrieving story file...');

			if (url.slice(-3).toLowerCase() == '.js')
				$.getScript(url);
			else
				$.getScript(parchment.options.zcode_appspot_url + '?url=' + escape(url) + '&jsonp=processZcodeAppspotResponse');
		}
	},

	// Loaded stories and savefiles
	stories: new StoryCache(),
	savefiles: {}
});

function getFilenameFromUrl(url) {
  var lastSlash = url.lastIndexOf("/");
  return url.slice(lastSlash + 1);
}

window.gZcode = null;
window.gStory = '';

// JSONP callback
window.processZcodeAppspotResponse = function(content)
{
	if (content.error)
		throw new FatalError("Error loading story: " + content.error.entityify());
	processBase64Zcode(content.data);
}

window.processBase64Zcode = function(data, decodedSoFar)
{
	var CHUNK_SIZE = 50000, next_func,
	firstChunk = data.slice(0, CHUNK_SIZE),
	restOfData = data.slice(CHUNK_SIZE);

	if (typeof(decodedSoFar) == 'undefined')
		decodedSoFar = [];

	$('#progress-text').html('Decoding ' + data.length + ' more bytes...');
	file.base64_decode(firstChunk, decodedSoFar);

	if (restOfData)
		next_func = function decode_rest()
		{
			processBase64Zcode(restOfData, decodedSoFar);
		};

	else
		next_func = function finish()
		{
			gZcode = decodedSoFar;
			$('#progress-text').html('Starting interpreter...');
			_webZuiStartup();
		};

	window.setTimeout(next_func, 1);
}

function _webZuiStartup() {
  var logfunc = function() {};

	if (window.loadFirebugConsole)
		window.loadFirebugConsole();

  if (window.console)
    logfunc = function(msg) { console.log(msg); };

  window.engine = new GnustoEngine(logfunc);
  var zui = new WebZui(logfunc);
  var runner = new EngineRunner(engine, zui, logfunc);

	window.story = new Story(gZcode.slice(), storyName);
	story.load(engine);
	logfunc("Story type: " + story.filetype);

  if (window.location.hash) {
    var b64data = window.location.hash.slice(1);
    engine.loadSavedGame(file.base64_decode(b64data));
    logfunc('Loading savefile');
  }

  runner.run();
}

})(window);
