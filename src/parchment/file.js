/*
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
	decoder = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7,
	    'I': 8, 'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15,
	    'Q': 16, 'R': 17, 'S': 18, 'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23,
	    'Y': 24, 'Z': 25, 'a': 26, 'b': 27, 'c': 28, 'd': 29, 'e': 30, 'f': 31,
	    'g': 32, 'h': 33, 'i': 34, 'j': 35, 'k': 36, 'l': 37, 'm': 38, 'n': 39,
	    'o': 40, 'p': 41, 'q': 42, 'r': 43, 's': 44, 't': 45, 'u': 46, 'v': 47,
	    'w': 48, 'x': 49, 'y': 50, 'z': 51, 0: 52, 1: 53, 2: 54, 3: 55,
	    4: 56, 5: 57, 6: 58, 7: 59, 8: 60, 9: 61, '+': 62, '/': 63, '=': 64},

	base64_decode = function(data, out) {
	    var out = out || [], c1, c2, c3, e1, e2, e3, e4;
	    for (var i = 0, l = data.length; i < l; ) {
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

	base64_encode = function(data, out) {
	    var out = out || '', c1, c2, c3, e1, e2, e3, e4;
		for (var i = 0, l = data.length; i < l; ) {
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
	base64_encode: base64_encode
};
})(window);
