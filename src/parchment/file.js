/*!
 * File functions and classes
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(window){

// Text to byte array and vice versa
var text_to_array = function(text, array)
{
	var array = array || [], i = 0, l;
	for (l = text.length % 16; i < l; ++i)
		array.push(text.charCodeAt(i));
	for (l = text.length; i < l;)
		// Unfortunately unless text is cast to a String object there is no shortcut for charCodeAt,
		// and if text is cast to a String object, it's considerably slower.
		array.push(text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++),
		text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++),
		text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++),
		text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++), text.charCodeAt(i++));
	return array;
},

array_to_text = function(array, text)
{
	var text = text || '', i = 0, l, fromCharCode = String.fromCharCode;;
	for (l = array.length % 8; i < l; ++i)
		text += fromCharCode(array[i]);
	for (l = array.length; i < l;)
		text += (fromCharCode(array[i++]) + fromCharCode(array[i++]) +
		fromCharCode(array[i++]) + fromCharCode(array[i++]) +
		fromCharCode(array[i++]) + fromCharCode(array[i++]) +
		fromCharCode(array[i++]) + fromCharCode(array[i++]));
	return text;
};

// Base64 encoding and decoding
// Use the native base64 functions if available
if (window.atob)
{
	var base64_decode = function(data, out)
	{
		var out = out || [];
		return text_to_array(atob(data), out);
	},

	base64_encode = function(data, out)
	{
		var out = out || '';
		return btoa(array_to_text(data, out));
	};
}

// Unfortunately we will have to use pure Javascript functions
// Originally taken from: http://ecmanaut.blogspot.com/2007/11/javascript-base64-singleton.html
// But so much has changed the reference the reference is hardly warranted now...
// TODO: Consider combining the eNs together first, then shifting to get the cNs (for the decoder)
else
{
	var encoder = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	// Run this little function to build the decoder array
	decoder = (function(text)
	{
		var out = [], i = 0;
		for (; i < text.length; i++)
			out[text.charAt(i)] = i;
		return out;
	})(encoder),

	base64_decode = function(data, out)
	{
	    var out = out || [],
	    c1, c2, c3, e1, e2, e3, e4,
	    i = 0, l = data.length;
	    while (i < l)
	    {
	        e1 = decoder[data.charAt(i++)];
	        e2 = decoder[data.charAt(i++)];
	        e3 = decoder[data.charAt(i++)];
	        e4 = decoder[data.charAt(i++)];
	        c1 = (e1 << 2) + (e2 >> 4);
	        c2 = ((e2 & 15) << 4) + (e3 >> 2);
	        c3 = ((e3 & 3) << 6) + e4;
	        out.push(c1, c2, c3);
	    }
	    if (e4 == 64)
	        out.pop();
	    if (e3 == 64)
	        out.pop();
	    return out;
	},

	base64_encode = function(data, out)
	{
	    var out = out || '',
	    c1, c2, c3, e1, e2, e3, e4,
	    i = 0, l = data.length;
		while (i < l)
		{
			c1 = data[i++];
			c2 = data[i++];
			c3 = data[i++];
			e1 = c1 >> 2;
			e2 = ((c1 & 3) << 4) + (c2 >> 4);
			e3 = ((c2 & 15) << 2) + (c3 >> 6);
			e4 = c3 & 63;

			// Consider other string concatenation methods?
			out += (encoder.charAt(e1) + encoder.charAt(e2) + encoder.charAt(e3) + encoder.charAt(e4));
		}
		if (isNaN(c2))
			out = out.slice(0, -2) + '==';
		else if (isNaN(c3))
			out = out.slice(0, -1) + '=';
		return out;
	};
}

// A story file
var story = IFF.extend({
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
				this.images = [];
				this.resources = [];

				// Go through the chunks and extract the useful ones
				for (var i = 0, l = this.chunks.length; i < l; i++)
				{
					var type = this.chunks[i].type;
					if (type == 'RIdx')
						// The Resource Index Chunk, used by parchment for numbering images correctly
						for (var j = 0, c = IFF.num_from(this.chunks[i].data, 0); j < c; j++)
							this.resources.push({
								usage: IFF.text_from(this.chunks[i].data, 4 + j * 12),
								number: IFF.num_from(this.chunks[i].data, 8 + j * 12),
								start: IFF.num_from(this.chunks[i].data, 12 + j * 12)
							});

					else if (type == 'ZCOD' && !this.zcode)
						// Parchment uses the first ZCOD chunk it finds, but the Blorb spec says the RIdx chunk should be used
						this.zcode = this.chunks[i].data;

					else if (type == 'IFmd')
					{
						// Treaty of Babel metadata
						// Will most likely break UTF-8
						this.metadata = array_to_text(this.chunks[i].data);
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
/*
					else if (type == 'PNG ' || type == 'JPEG')
						for (var j = 0, c = this.resources.length; j < c; j++)
						{
							if (this.resources[j].usage == 'Pict' && this.resources[j].start == this.chunks[i].offset)
								// A numbered image!
								this.images[this.resources[j].number] = new image(this.chunks[i]);
						}
*/
					else if (type == 'Fspc')
						this.frontispiece = IFF.num_from(this.chunks[i].data, 0);
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
/*
	// Images made from byte arrays
	file.image = base2.Base.extend({
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
*/

window.file = {
	text_to_array: text_to_array,
	array_to_text: array_to_text,
	base64_decode: base64_decode,
	base64_encode: base64_encode,
	story: story
};
})(window);
