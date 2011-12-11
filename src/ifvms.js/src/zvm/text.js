/*

Z-Machine text functions
========================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	Consider quote suggestions from 1.1 spec
	
*/

// Key codes accepted by the Z-Machine
var ZSCII_keyCodes = (function(){
	var keycodes = {
		8: 8, // delete/backspace
		13: 13, // enter
		27: 27, // escape
		37: 131, 38: 129, 39: 132, 40: 130 // arrow keys
	},
	i = 96;
	while ( i < 106 )
	{
		keycodes[i] = 49 + i++; // keypad
	}
	i = 112;
	while ( i < 124 )
	{
		keycodes[i] = 21 + i++; // function keys
	}
	return keycodes;
})(),

// A class for managing everything text
Text = Object.subClass({
	init: function( engine )
	{
		var memory = engine.m,
		
		alphabet_addr = memory.getUint16( 0x34 ),
		unicode_addr = engine.extension_table( 3 ),
		unicode_len = unicode_addr && memory.getUint8( unicode_addr++ ),
		abbreviations,
		abbr_array = [],
		i = 0, l = 96;
		
		this.e = engine;
		this.maxaddr = memory.getUint16( 0x1A ) * engine.addr_multipler;
		
		// Check for custom alphabets
		this.make_alphabet( alphabet_addr ? memory.getBuffer( alphabet_addr, 78 )
			// Or use the standard alphabet
			: this.text_to_zscii( 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ \r0123456789.,!?_#\'"/\\-:()', 1 ) );
		
		// Check for a custom unicode table
		this.make_unicode( unicode_addr ? memory.getBuffer16( unicode_addr, unicode_len )
			// Or use the default
			: this.text_to_zscii( unescape( '%E4%F6%FC%C4%D6%DC%DF%BB%AB%EB%EF%FF%CB%CF%E1%E9%ED%F3%FA%FD%C1%C9%CD%D3%DA%DD%E0%E8%EC%F2%F9%C0%C8%CC%D2%D9%E2%EA%EE%F4%FB%C2%CA%CE%D4%DB%E5%C5%F8%D8%E3%F1%F5%C3%D1%D5%E6%C6%E7%C7%FE%F0%DE%D0%A3%u0153%u0152%A1%BF' ), 1 ) );
		
		// Abbreviations
		abbreviations = memory.getUint16( 0x18 );
		if ( abbreviations )
		{
			while ( i < l )
			{
				abbr_array.push( this.decode( memory.getUint16( abbreviations + 2 * i++ ) * 2, 0, 1 ) );
			}
		}
		this.abbr = abbr_array;
		
		// Parse the standard dictionary
		this.dictionaries = {};
		this.dict = memory.getUint16( 0x08 );
		this.parse_dict( this.dict );
		
		// Optimise our own functions
		/* DEBUG */
		//if ( !debugflags.nooptimise )
		//	optimise_obj( this, 'TEXT' );
		/* ENDDEBUG */
	},
	
	// Generate alphabets
	make_alphabet: function( data )
	{
		var alphabets = [[], [], []],
		i = 0;
		while ( i < 78 )
		{
			alphabets[parseInt( i / 26 )][i % 26] = data[ i++ ];
		}
		// A2->7 is always a newline
		alphabets[2][1] = 13;
		this.alphabets = alphabets;
	},
	
	// Make the unicode tables
	make_unicode: function( data )
	{
		var table = { 13: '\n' }, // New line conversion
		reverse = { 10: 13 },
		i = 0;
		while ( i < data.length )
		{
			table[155 + i] = String.fromCharCode( data[i] );
			reverse[data[i]] = 155 + i++;
		}
		i = 32;
		while ( i < 127 )
		{
			table[i] = String.fromCharCode( i );
			reverse[i] = i++;
		}
		this.unicode_table = table;
		this.reverse_unicode_table = reverse;
	},
	
	// Decode Z-chars into ZSCII and then Unicode
	decode: function( addr, length, nowarn )
	{
		var memory = this.e.m,
		
		start_addr = addr,
		word,
		buffer = [],
		i = 0,
		zchar,
		alphabet = 0,
		result = [],
		resulttexts = [],
		tenbit,
		tempi,
		unicodecount = 0;
		
		// Check if this one's been cached already
		if ( this.e.jit[addr] )
		{
			return this.e.jit[addr];
		}
		
		// If we've been given a length, then use it as the finaladdr,
		// Otherwise don't go past the end of the file
		length = length ? length + addr : this.maxaddr;
		
		// Go through until we've reached the end of the text or a stop bit
		while ( addr < length )
		{
			word = memory.getUint16( addr );
			addr += 2;
			
			buffer.push( word >> 10 & 0x1F, word >> 5 & 0x1F, word & 0x1F );
			
			// Stop bit
			if ( word & 0x8000 )
			{
				break;
			}
		}
		
		// Process the Z-chars
		while ( i < buffer.length )
		{
			zchar = buffer[i++];
			
			// Special chars
			// Space
			if ( zchar == 0 )
			{
				result.push( 32 );
			}
			// Abbreviations
			else if ( zchar < 4 )
			{
				result.push( -1 );
				resulttexts.push( this.abbr[ 32 * ( zchar - 1 ) + buffer[i++] ] );
			}
			// Shift characters
			else if ( zchar < 6 )
			{
				alphabet = zchar;
			}
			// Check for a 10 bit ZSCII character
			else if ( alphabet == 2 && zchar == 6 )
			{
				// Check we have enough Z-chars left.
				if ( i + 1 < buffer.length )
				{
					tenbit = buffer[i++] << 5 | buffer[i++];
					// A regular character
					if ( tenbit < 768 )
					{
						result.push( tenbit );
					}
					// 1.1 spec Unicode strings - not the most efficient code, but then noone uses this
					else
					{
						tenbit -= 767;
						unicodecount += tenbit;
						tempi = i;
						i = ( i % 3 ) + 3;
						while ( tenbit-- )
						{
							result.push( -1 );
							resulttexts.push( String.fromCharCode( buffer[i] << 10 | buffer[i + 1] << 5 | buffer[i + 2] ) );
							// Set those characters so they won't be decoded again
							buffer[i++] = buffer[i++] = buffer[i++] = 0x20;
						}
						i = tempi;
					}
				}
			}
			// Regular characters
			else if ( zchar < 0x20 )
			{
				result.push( this.alphabets[alphabet][ zchar - 6 ] );
			}
			
			// Reset the alphabet
			alphabet = alphabet < 4 ? 0 : alphabet - 3;
			
			// Add to the index if we've had raw unicode
			if ( ( i % 3 ) == 0 )
			{
				i += unicodecount;
				unicodecount = 0;
			}
		}
		
		// Cache and return. Use String() so that .pc will be preserved
		result = new String( this.zscii_to_text( result, resulttexts ) );
		result.pc = addr;
		this.e.jit[start_addr] = result;
		if ( !nowarn && start_addr < this.e.staticmem )
		{
			console.warn( 'Caching a string in dynamic memory: ' + start_addr );
		}
		return result;
	},
	
	// Encode ZSCII into Z-chars
	encode: function( zscii )
	{
		var alphabets = this.alphabets,
		zchars = [],
		i = 0,
		achar,
		temp,
		result = [];
		
		// Encode the Z-chars
		while ( zchars.length < 9 )
		{
			achar = zscii[i++];
			// Space
			if ( achar == 32 )
			{
				zchars.push( 0 );
			}
			// Alphabets
			else if ( ( temp = alphabets[0].indexOf( achar ) ) >= 0 )
			{
				zchars.push( temp + 6 );
			}
			else if ( ( temp = alphabets[1].indexOf( achar ) ) >= 0 )
			{
				zchars.push( 4, temp + 6 );
			}
			else if ( ( temp = alphabets[2].indexOf( achar ) ) >= 0 )
			{
				zchars.push( 5, temp + 6 );
			}
			// 10-bit ZSCII / Unicode table
			else if ( temp = this.reverse_unicode_table[achar] )
			{
				zchars.push( 5, 6, temp >> 5, temp & 0x1F );
			}
			// Pad character
			else if ( achar == undefined )
			{
				zchars.push( 5 );
			}
		}
		zchars.length = 9;
		
		// Encode to bytes
		i = 0;
		while ( i < 9 )
		{
			result.push( zchars[i++] << 2 | zchars[i] >> 3, ( zchars[i++] & 0x07 ) << 5 | zchars[i++] );
		}
		result[4] |= 0x80;
		return result;
	},
	
	// In these two functions zscii means an array of ZSCII codes and text means a regular Javascript unicode string
	zscii_to_text: function( zscii, texts )
	{
		var i = 0, l = zscii.length,
		charr,
		j = 0,
		result = '';
		
		while ( i < l )
		{
			charr = zscii[i++];
			// Text substitution from abbreviations or 1.1 unicode
			if ( charr == -1 )
			{
				result += texts[j++];
			}
			// Regular characters
			if ( charr = this.unicode_table[charr] )
			{
				result += charr;
			}
		}
		return result;
	},
	
	// If the second argument is set then don't use the unicode table
	text_to_zscii: function( text, notable )
	{
		var array = [], i = 0, l = text.length, charr;
		while ( i < l )
		{
			charr = text.charCodeAt( i++ );
			// Check the unicode table
			if ( !notable )
			{
				charr = this.reverse_unicode_table[charr] || 63;
			}
			array.push( charr );
		}
		return array;
	},
	
	// Parse and cache a dictionary
	parse_dict: function( addr )
	{
		var memory = this.e.m,
		
		addr_start = addr,
		dict = {},
		seperators_len,
		entry_len,
		endaddr,
		anentry,
		
		// Get the word separators
		seperators_len = memory.getUint8( addr++ );
		dict.separators = memory.getBuffer( addr, seperators_len );
		addr += seperators_len;
		
		// Go through the dictionary and cache its entries
		entry_len = memory.getUint8( addr++ );
		endaddr = addr + 2 + entry_len * memory.getUint16( addr );
		addr += 2;
		while ( addr < endaddr )
		{
			dict['' + memory.getBuffer( addr, 6 )] = addr;
			addr += entry_len;
		}
		this.dictionaries[addr_start] = dict;
		
		return dict;
	},
	
	// Tokenise a text
	tokenise: function( text, buffer, dictionary, flag )
	{
		// Use the default dictionary if one wasn't provided
		dictionary = dictionary || this.dict;
		
		// Parse the dictionary if needed
		dictionary = this.dictionaries[dictionary] || this.parse_dict( dictionary );
		
		var memory = this.e.m,
		
		i = 2,
		textend = i + memory.getUint8( text + 1 ),
		letter,
		separators = dictionary.separators,
		word = [],
		words = [],
		wordstart = i,
		max_words,
		wordcount = 0;
		
		// Find the words, separated by the separators, but as well as the separators themselves
		while ( i < textend )
		{
			letter = memory.getUint8( text + i++ );
			if ( letter == 32 || separators.indexOf( letter ) >= 0 )
			{
				if ( word.length )
				{
					words.push( [word, wordstart] );
					wordstart += word.length;
					word = [];
				}
				if ( letter != 32 )
				{
					words.push( [[letter], wordstart] );
				}
				wordstart++;
			}
			else
			{
				word.push( letter );
			}
		}
		if ( word.length )
		{
			words.push( [word, wordstart] );
		}
		
		// Go through the text until we either have reached the max number of words, or we're out of words
		max_words = Math.min( words.length, memory.getUint8( buffer ) );
		while ( wordcount < max_words )
		{
			word = dictionary['' + this.encode( words[wordcount][0] )];
			
			// If the flag is set then don't overwrite words which weren't found
			if ( !flag || word )
			{
				// Fill out the buffer
				memory.setUint16( buffer + 2 + wordcount * 4, word || 0 );
				memory.setUint8( buffer + 4 + wordcount * 4, words[wordcount][0].length );
				memory.setUint8( buffer + 5 + wordcount * 4, words[wordcount][1] );
			}
			wordcount++;
		}
		
		// Update the number of found words
		memory.setUint8( buffer + 1, wordcount );
	},
	
	// Handle key input
	keyinput: function( data )
	{
		var charCode = data.charCode,
		keyCode = data.keyCode;
		
		// Handle keyCodes first
		if ( ZSCII_keyCodes[keyCode] )
		{
			return ZSCII_keyCodes[keyCode];
		}
		
		// Check the character table or return a '?'
		return this.reverse_unicode_table[charCode] || 63;
	}
});