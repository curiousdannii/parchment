new function(_)
{
	// File functions and classes
	// Based largely on code by Thomas Thurman
	var file = new base2.Package(this, {
		name: 'file',
		exports: 'iff, story'
	});

	eval(this.imports);

	// Get a 32 bit number from a byte array
	function num_from(s, offset)
	{
		return s[offset]<<24 | s[offset+1]<<16 | s[offset+2]<<8 | s[offset+3];
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

				var i = 12;
				while (i < data.length)
				{
					var type = string_from(data, i);
					var chunk_length = num_from(data, i + 4);
					if (chunk_length < 0 || (chunk_length + i) > data.length)
						// FIXME: do something sensible here
						throw new FatalError('WEEBLE, panic\n');

					this.chunks.push({
						type: type,
						length: chunk_length,
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
		constructor: function parse_zblorb(data)
		{
			// Check for naked zcode
			// FIXME: This check is way too simple. We should look at
			// some of the other fields as well for sanity-checking.
			if (data[0] < 9)
			{
				this.filetype = 'ok story naked zcode';
				this.base();
				this.chunks.push({
					type: 'ZCOD',
					length: data.length,
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
					// Go through the chunks and extract the useful ones
					for (i = 0, l = this.chunks.length; i < l; i++)
					{
						if (this.chunks[i].type == 'ZCOD' && !this.zcode)
							// Parchment uses the first ZCOD chunk it finds, but the Blorb spec says the RIdx chunk should be used
							this.zcode = this.chunks[i].data;
					}
					this.filetype = 'ok story blorbed zcode';
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
		}
	});

	eval(this.exports);
};
