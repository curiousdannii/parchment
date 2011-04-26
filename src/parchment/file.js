/*
 * File functions and classes
 *
 * Copyright (c) 2008-2011 The Parchment Contributors
 * Licenced under the BSD
 * http://code.google.com/p/parchment
 */

/*

TODO:
	Consider whether it's worth having cross domain requests to things other than the proxy
	
	Add transport for XDR
	
	Access buffer if possible (don't change encodings)
	
	Is the native base64_decode function still useful?
	If such a time comes when everyone has native atob(), then always expose the decoded text in process_binary_XHR()
	
	If we know we have a string which is latin1 (say from atob()), would it be faster to have a separate text_to_array() that doesn't need to &0xFF?
	
	Consider combining the eNs together first, then shifting to get the cNs (for the base64 decoder)

*/
 
(function(window, $){

// VBScript code
if ( window.execScript )
{
	execScript(
		
		// Idea from http://stackoverflow.com/questions/1919972/#3050364
		
		// Convert a byte array (xhr.responseBody) into a 16-bit characters string
		// Javascript code will separate the characters back into 8-bit numbers again
		'Function VBCStr(x)\n' +
			'VBCStr=CStr(x)\n' +
		'End Function\n' +
		
		// If the byte array has an odd length, this function is needed to get the last byte
		'Function VBLastAsc(x)\n' +
			'Dim l\n' +
			'l=LenB(x)\n' +
			'If l mod 2 Then\n' +
				'VBLastAsc=AscB(MidB(x,l,1))\n' +
			'Else\n' +
				'VBLastAsc=-1\n' +
			'End If\n' +
		'End Function'
	
	, 'VBScript' );
}

var chrome = /chrome\/(\d+)/i.exec( navigator.userAgent ),
chrome_no_file = chrome && parseInt( chrome[1] ) > 4,

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
	// String.fromCharCode can be given an array of numbers if we call apply on it!
	return ( text || '' ) + String.fromCharCode.apply( 1, array );
},

// Base64 encoding and decoding
// Use the native base64 functions if available

// Run this little function to build the decoder array
encoder = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
decoder = (function()
{
	var out = [], i = 0;
	for (; i < encoder.length; i++)
		out[encoder.charAt(i)] = i;
	return out;
})(),

base64_decode = function(data, out)
{
	if ( window.atob )
	{
		return text_to_array( atob( data ), out );
	}
	
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
	if ( window.btoa )
	{
		return btoa( array_to_text( data, out ) );
	}
	
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
},

// Convert IE's byte array to an array we can use
bytearray_to_array = function( bytearray )
{
	// VBCStr will convert the byte array into a string, with two bytes combined into one character
	var text = VBCStr( bytearray ),
	// VBLastAsc will return the last character, if the string is of odd length
	last = VBLastAsc( bytearray ),
	result = [],
	i = 0,
	l = text.length % 4,
	thischar;
	
	while ( i < l )
	{
		result.push(
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8
		);
	}
	
	l = text.length;
	while ( i < l )
	{
		result.push(
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8,
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8,
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8,
			( thischar = text.charCodeAt(i++) ) & 0xff, thischar >> 8
		);
	}
	
	if ( last > -1 )
	{
		result.push( last );
	}
	
	return result;
},

// XMLHttpRequest feature support
xhr = jQuery.ajaxSettings.xhr(),
support = {
	// Unfortunately in Opera < 10.5 overrideMimeType() doesn't work
	binary:
		xhr.overrideMimeType && !( $.browser.opera && parseFloat( $.browser.version ) < 10.5 ) ? 'charset' :
		'responseBody' in xhr ? 'responseBody' :
		0
},

// Process a binary XHR
process_binary_XHR = function( data, textStatus, jqXHR )
{
	var array, buffer, text;
	
	data = $.trim( data );
	
	// Decode base64
	if ( jqXHR.mode == 'base64' )
	{
		// Expose the decoded text if we have native decoding
		if ( window.atob )
		{
			text = atob( data );
			array = text_to_array( text );
		}
		else
		{
			array = base64_decode( data );
		}
	}
	
	// Binary support through charset=x-user-defined
	else if ( jqXHR.mode == 'charset' )
	{
		array = text_to_array( data );
	}
	
	// Access responseBody
	else
	{
		array = bytearray_to_array( jqXHR.xhr.responseBody );
	}
	
	jqXHR.responseArray = array;
	jqXHR.responseText = text;
};

// Clean-up the temp XHR used above
xhr = undefined;

// Prefilters for binary ajax
$.ajaxPrefilter( 'binary', function( options, originalOptions, jqXHR )
{
	// Chrome > 4 doesn't allow file:// to file:// XHR
	// It should however work for the rest of the world, so we have to test here, rather than when first checking for binary support
	var binary = options.isLocal && !options.crossDomain && chrome_no_file ? 0 : support.binary,
	
	// Expose the real XHR object onto the jqXHR
	XHRFactory = options.xhr;
	options.xhr = function()
	{
		return jqXHR.xhr = XHRFactory.apply( options );
	};
	
	// Set up the options and jqXHR
	options.binary = binary;
	jqXHR.done( process_binary_XHR );
	
	// Options for jsonp, which may not be used if we redirect to 'text'
	options.jsonp = false;
	options.jsonpCallback = 'processBase64Zcode';
	jqXHR.mode = 'base64';
	
	// Load a legacy file
	if ( options.url.slice( -3 ).toLowerCase() == '.js' )
	{
		return 'jsonp';
	}
	
	// Binary support and same domain: use a normal text handler
	// Encoding stuff is done in the text prefilter below
	if ( binary && !options.crossDomain )
	{
		return 'text';
	}
	
	// Use a backup legacy file if provided
	if ( options.legacy )
	{
		options.url = options.legacy;
		return 'jsonp';
	}
	
	// Use the proxy when no binary support || cross domain request
	options.data = 'url=' + options.url;
	options.url = parchment.options.proxy_url;
	
	if ( binary && $.support.cors )
	{
		return 'text';
	}
	
	options.data += '&encode=base64&callback=pproxy';
	options.jsonpCallback = 'pproxy';
	return 'jsonp';
});

// Set options for binary requests
$.ajaxPrefilter( 'text', function( options, originalOptions, jqXHR )
{
	jqXHR.mode = options.binary;
	
	if ( jqXHR.mode == 'charset' )
	{
		options.mimeType = 'text/plain; charset=x-user-defined';
	}
});

// Converters are set in intro.js

/* DEBUG */

// Download a file to a byte array
// Note: no longer used by library.js
function download_to_array( url, callback )
{
	// Request the file with the binary type
	$.ajax( url, { dataType: 'binary' } )
		.success(function( data, textStatus, jqXHR )
		{
			callback( jqXHR.responseArray );
		});
}

/* ENDDEBUG */

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

// Expose

window.file = {
	text_to_array: text_to_array,
	array_to_text: array_to_text,
	base64_decode: base64_decode,
	base64_encode: base64_encode,
	support: support
};
;;; window.file.download_to_array = download_to_array;

})(window, jQuery);