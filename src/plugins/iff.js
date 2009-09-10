/*!
 * Interchange File Format library
 *
 * Copyright (c) 2003-2009 The Gnusto Contributors
 * Licenced under the GPL v2
 * http://github.com/curiousdannii/gnusto
 */
(function(){

// Get a 32 bit number from a byte array
var num_from = function(s, offset)
{
	return s[offset] << 24 | s[offset + 1] << 16 | s[offset + 2] << 8 | s[offset + 3];
},

// Get a 4 byte string from a byte array
text_from = function(s, offset)
{
	var fromCharCode = String.fromCharCode;
	return fromCharCode(s[offset]) + fromCharCode(s[offset + 1]) + fromCharCode(s[offset + 2]) + fromCharCode(s[offset + 3]);
},

// IFF file class
// Parsers an IFF file stored in a byte array
IFF = Class.extend({
	// Parse a byte array or construct an empty IFF file
	init: function parse_iff(data)
	{
		this.type = '';
		this.chunks = [];
		if (data)
		{
			// Check this is an IFF file
			if (text_from(data, 0) != "FORM")
				throw new Error("Not an IFF file");

			// Parse the file
			this.type = text_from(data, 8);

			var i = 12, l = data.length;
			while (i < l)
			{
				var chunk_length = num_from(data, i + 4);
				if (chunk_length < 0 || (chunk_length + i) > l)
					// FIXME: do something sensible here
					throw new Error("IFF: Chunk out of range");

				this.chunks.push({
					type: text_from(data, i),
					offset: i,
					data: data.slice(i + 8, i + 8 + chunk_length)
				});

				i += 8 + chunk_length;
				if (chunk_length % 2) i++;
			}
		}
	}
});

// Expose the class and helper functions
IFF.num_from = num_from;
IFF.text_from = text_from;
window.IFF = IFF;

})();
