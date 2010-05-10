// -*- tab-width: 4; -*-
/*
 * File functions and classes
 *
 * Copyright (c) 2003-2010 The Parchment Contributors
 * Licenced under the GPL v2
 * http://code.google.com/p/parchment
 */
(function(window){

// Text to byte array and vice versa
function text_to_array(text, array)
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
}

function array_to_text(array, text)
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
}

// Base64 encoding and decoding
// Use the native base64 functions if available
if (window.atob)
{
	var base64_decode = function(data, out)
	{
		return text_to_array(atob(data), out);
	},

	base64_encode = function(data, out)
	{
		return btoa(array_to_text(data, out));
	};
}

// Unfortunately we will have to use pure Javascript functions
// TODO: Consider combining the eNs together first, then shifting to get the cNs (for the decoder)
else
{
	var encoder = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	// Run this little function to build the decoder array
	decoder = (function()
	{
		var out = [], i = 0;
		for (; i < encoder.length; i++)
			out[encoder.charAt(i)] = i;
		return out;
	})(),

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

// XMLHttpRequest feature support
var xhr = jQuery.ajaxSettings.xhr(),
support = {
	// Unfortunately Opera's overrideMimeType() doesn't work
	binary: xhr.overrideMimeType !== undefined && !$.browser.opera,
	cross_origin: xhr.withCredentials !== undefined
//	cross_origin: 0
};

// Clean-up
xhr = null;

// Download a file to a byte array
function download_to_array( url, callback )
{
	// URL regexp
	var urldomain = /^(file:|(\w+:)?\/\/[^\/?#]+)/,
	
	// If url is an array we are being given a binary and a backup encoded file
	backup_url;
	if ( $.isArray( url ) )
	{
		backup_url = url[1];
		url = url[0];
	}
	
	// Test the page and data URLs
	var page_domain = urldomain.exec(location)[0],
	data_exec = urldomain.exec(url),
	data_domain = data_exec ? data_exec[0] : page_domain,

	options = {};

	// What are we trying to download here?
	/*
		Page	Data	Binary	Backup	#	Action
		http	file					1	Fail
		file	file	0		0		2	Fail
			legacy						3	Load legacy file
			same		1				4	Load directly
			same		0		1		5	Load encoded backup file directly
										6	Load from proxy (base64 + JSONP)
	*/

	// Case #3: Load legacy file
	if ( url.slice(-3).toLowerCase() == '.js' )
	{
		window['processBase64Zcode'] = function( data )
		{
			callback( base64_decode( data ));
			delete window['processBase64Zcode'];
		};
		$.getScript( url );
		return;
	}

	// Case #1: file: loaded from http:
	// Case #2: file: with neither binary support nor a backup encoded file
	if ( data_domain == 'file:' && ( page_domain != data_domain || ( !support.binary && !backup_url ) ) )
	{
		throw "Can't load local files with this browser, sorry!";
	}

	// Case #4: Local file with binary support
	if ( support.binary && page_domain == data_domain )
	{
		options = {
			beforeSend: function ( XMLHttpRequest )
			{
				XMLHttpRequest.overrideMimeType('text/plain; charset=x-user-defined');
			},
			success: function ( data )
			{
				// Check to see if this could actually be base64 encoded?
				callback( text_to_array( $.trim( data )));
			},
			url: url
		};
	}
	
	// Cases #5/6: Load base64 encoded data
	else
	{	
		// Case #5: Load encoded backup file directly
		if ( page_domain == data_domain && backup_url )
		{
			options.url = backup_url;
		}
		
		// Case #6: Load from proxy (base64 + JSONP)
		else
		{
			options = {
				data: {
					encode: 'base64',
					url: url
				},
				dataType: 'jsonp',
				url: parchment.options.proxy_url
			};
		}
		
		options.success = function ( data )
		{
			callback( base64_decode( $.trim( data )));
		};
	}
	
	// What are we trying to download here?
	// Old list... will leave here for now, until we add cross origin requests again
	/*
		Parchment	Data	Binary	XSS	#	Action
					file	0			1	Fail
		http		file				2	Fail
		legacy							3	Load legacy file
		file		file	1			4	Load directly
			same http		1			5	Load directly
			diff http		1		1	6	Attempt to load directly, fall back to raw proxy if needed
					http	0		1	7	Load base64 from proxy
					http	0		0	8	Load base64 from JSONP proxy
			diff http		1		0	9	Load base64 from JSONP proxy (uses base64 as the escaping required would be bigger still)
											TODO: investigate options.scriptCharset so #9 can load raw
	*/

/*
	// Case #1: file: but no binary support: Fail.
	// Case #2: file: loaded from http:
	if ( data_domain == 'file:' && ( !support.binary || page_domain != data_domain ) )
	{
		throw "Can't load local files with this browser, sorry!";
	}

	// Case 3: legacy support

	// Case #4/5: local file with binary support or
	// Case #6: non-local file with binary and cross origin support: Load directly
	else if ( support.binary && ( page_domain == data_domain || support.cross_origin ) )
	{
		options.beforeSend = function ( XMLHttpRequest )
		{
			XMLHttpRequest.overrideMimeType('text/plain; charset=x-user-defined');
		};
		options.success = function ( data )
		{
			// Check to see if this could actually be base64 encoded?
			callback( text_to_array( data ));
		};
		
		// Case 6: non-local file, with cross origin support
		if ( support.cross_origin && page_domain != data_domain )
		{
			// Do the magic
		}
	}
	
	// Case #7: no binary but cross origin support or
	// Case #8/9: cross origin support needed but unavailable: use the proxy server with base64 encoding
	else
	{
		options.data.url = url;
		options.url = parchment.options.proxy_url;
		options.success = function ( data )
		{
			callback( base64_decode( data ));
		};
		
		// Case #8/9: No cross origin support, so use JSONP (kind of... just use an extra callback function really)
		// See note above for why case #9 uses base64 encoding
		if ( !support.cross_origin )
		{
			options.dataType = "jsonp";
		}
		
		// Case 7: Explictly request base64
		else
		{
			options.data.encode = 'base64';
		}
	}
*/
	
	// Log the options for debugging
	;;; if ( window.console && console.log ) console.log( '$.ajax() options from download_to_array(): ', options );
	
	// Get the file
	options.error = function ( XMLHttpRequest, textStatus )
	{
		throw new FatalError('Error loading story: ' + textStatus);
	};
	$.ajax(options);
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

// Expose

window.file = {
	text_to_array: text_to_array,
	array_to_text: array_to_text,
	base64_decode: base64_decode,
	base64_encode: base64_encode,
	download_to_array: download_to_array,
	support: support
};

})(window);
