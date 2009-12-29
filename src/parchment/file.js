/*
 * File functions and classes
 *
 * Copyright (c) 2003-2009 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(window){

// Saved regexps
var base64_wrapper = /\(['"](.+)['"]\)/,

// Text to byte array and vice versa
text_to_array = function(text, array)
{
	var array = array || [], i = 0, l;
	for (l = text.length % 8; i < l; ++i)
		array.push(text.charCodeAt(i) & 0xff);
	for (l = text.length; i < l;)
		// Unfortunately unless text is cast to a String object there is no shortcut for charCodeAt,
		// and if text is cast to a String object, it's considerably slower.
		array.push(text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff,
			text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff);
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

// Download a file to a byte array
var download_to_array = function( url, callback ) {
	// Callback function for legacy .js storyfiles, process with base64
	var download_base64 = function ( data ) {
		// TODO: Investigate chunking the data
		callback( base64_decode( base64_wrapper.exec(data)[1] ));
	},
	
	// Callback function for raw binary data
	download_raw = function ( data ) {
		// Check to see if this could actually be base64 encoded
	
		callback(text_to_array(data));
	};

	// What are we trying to download here?

	// Looks like a legacy .js storyfile
	if ( url.slice(-3).toLowerCase() === '.js' ) {
		// Make the request
		// Only works on local files currently
		$.ajax({
			dataType: 'text',
			error: download_error,
			success: download_base64,
			url: url
		});

	// Downloading a raw binary file
	} else {
		// Make the request
		// Only works on local files currently
		$.ajax({
			beforeSend: binary_charset,
			dataType: 'text',
			error: download_error,
			success: download_raw,
			url: url
		});
	}

},

// Change the charset for binary data
binary_charset = function ( XMLHttpRequest ) {
	XMLHttpRequest.overrideMimeType('text/plain; charset=x-user-defined');
},

// Error callback
download_error = function ( XMLHttpRequest, textStatus ) {
	throw new FatalError('Error loading story: ' + textStatus);
};

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
	download_to_array: download_to_array
};
})(window);
