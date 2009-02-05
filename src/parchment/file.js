new function(_)
{
	// File functions and classes
	// Based largely on code by Thomas Thurman
	var file = new base2.Package(this, {
		name: 'file',
		exports: 'iff, image, story'
	});

	eval(this.imports);

	// Get a 32 bit number from a byte array
	function num_from(s, offset)
	{
		return s[offset] << 24 | s[offset + 1] << 16 | s[offset + 2] << 8 | s[offset + 3];
	}

	// Get a 4 byte string from a byte array
	function string_from(s, offset)
	{
		return String.fromCharCode(s[offset]) +
			String.fromCharCode(s[offset+1]) +
			String.fromCharCode(s[offset+2]) +
			String.fromCharCode(s[offset+3]);
	}

	// IFF file class
	var iff = base2.Base.extend({
		// Parse a byte array or construct an empty IFF file
		constructor: function parse_iff(data)
		{
			this.type = '';
			this.chunks = [];
			if (data)
			{
				// Check this is an IFF file
				if (string_from(data, 0) != 'FORM')
					throw new FatalError('Not an IFF file!');

				// Parse the file
				this.type = string_from(data, 8);

				var i = 12, l = data.length;
				while (i < l)
				{
					var type = string_from(data, i);
					var chunk_length = num_from(data, i + 4);
					if (chunk_length < 0 || (chunk_length + i) > data.length)
						// FIXME: do something sensible here
						throw new FatalError('WEEBLE, panic\n');

					this.chunks.push({
						type: type,
						offset: i,
						data: data.slice(i + 8, i + 8 + chunk_length)
					});

					i += 8 + chunk_length;
					if (chunk_length % 2) i++;
				}
			}
		}
	});

	// A story file
	var story = iff.extend({
		// Parse a zblorb or naked zcode story file
		constructor: function parse_zblorb(data, story_name)
		{
			this.title = story_name;

			// Check for naked zcode
			// FIXME: This check is way too simple. We should look at
			// some of the other fields as well for sanity-checking.
			if (data[0] < 9)
			{
				this.filetype = 'ok story naked zcode';
				this.base();
				this.chunks.push({
					type: 'ZCOD',
					data: data
				});
				this.zcode = data;
			}
			// Check for potential zblorb
			else if (string_from(data, 0) == 'FORM')
			{
				this.base(data);
				if (this.type == 'IFRS')
				{
					// We have Blorb!
					this.images = [];
					this.resources = [];

					// Go through the chunks and extract the useful ones
					for (var i = 0, l = this.chunks.length; i < l; i++)
					{
						var type = this.chunks[i].type;
						if (type == 'RIdx')
							// The Resource Index Chunk, used by parchment for numbering images correctly
							for (var j = 0, c = num_from(this.chunks[i].data, 0); j < c; j++)
								this.resources.push({
									usage: string_from(this.chunks[i].data, 4 + j * 12),
									number: num_from(this.chunks[i].data, 8 + j * 12),
									start: num_from(this.chunks[i].data, 12 + j * 12)
								});

						else if (type == 'ZCOD' && !this.zcode)
							// Parchment uses the first ZCOD chunk it finds, but the Blorb spec says the RIdx chunk should be used
							this.zcode = this.chunks[i].data;

						else if (type == 'IFmd')
						{
							// Treaty of Babel metadata
							// Will most likely break UTF-8
							this.metadata = String.fromCharCode.apply(this, this.chunks[i].data);
							var metadataDOM = $(this.metadata);
							if (metadataDOM)
							{
								this.metadataDOM = metadataDOM;

								// Extract some useful info
								if ($('title', metadataDOM))
									this.title = $('title', metadataDOM).text();
								if ($('ifid', metadataDOM))
									this.ifid = $('ifid', metadataDOM).text();
							}
						}

						else if (type == 'PNG ' || type == 'JPEG')
							for (var j = 0, c = this.resources.length; j < c; j++)
							{
								if (this.resources[j].usage == 'Pict' && this.resources[j].start == this.chunks[i].offset)
									// A numbered image!
									this.images[this.resources[j].number] = new image(this.chunks[i]);
							}

						else if (type == 'Fspc')
							this.frontispiece = num_from(this.chunks[i].data, 0);
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
			window.document.title = this.title + ' - Parchment';
		}
	});

	// Images made from byte arrays
	var image = base2.Base.extend({
		// Initialise the image with a byte array
		constructor: function init_image(chunk)
		{
			this.chunk = chunk;

			this.dataURI = function create_dataURI()
			{
				// Only create the image when first requested, the encoding could be quite slow
				// Would be good to replace with a getter if it can be done reliably
				var encoded = encode_base64(this.chunk.data);
				if (this.chunk.type == 'PNG ')
					this.URI = 'data:image/png;base64,' + encoded;
				else if (this.chunk.type == 'JPEG')
					this.URI = 'data:image/jpeg;base64,' + encoded;
				this.dataURI = function() {return this.URI;};
				return this.URI;
			};
		}
	});

	eval(this.exports);
};
