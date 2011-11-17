/*

Z-Machine text functions
========================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	
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
		this.maxaddr = memory.getUint16( 0x1A ) * engine.packing_multipler;
		
		// Check for custom alphabets
		this.make_alphabet( alphabet_addr ? memory.getBuffer( alphabet_addr, 78 )
			// Or use the standard alphabet
			: this.text_to_zscii( 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ*\r0123456789.,!?_#\'"/\\-:()' ) );
		
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
		this.alphabets = alphabets;
	},
	
	// Make the unicode tables
	make_unicode: function( data )
	{
		var table = {},
		reverse = { 10: 13 }, // New line conversion
		i = 0;
		while ( i < data.length )
		{
			table[i + 155] = data[i];
			reverse[data[i]] = 155 + i++;
		}
		this.unicode_table = table;
		this.reverse_unicode_table = reverse;
		this.unicode_callback = function( charr ) { return String.fromCharCode( table[charr.charCodeAt(0)] || 63 ) };
	},
	
	// Decode Z-chars into ZSCII and then Unicode
	decode: function( addr, length, notext )
	{
		var memory = this.e.m,
		
		start_addr = addr,
		word,
		buffer = [],
		i = 0,
		zchar,
		alphabet = 0,
		result = [];
		
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
				result = result.concat( this.abbr[ 32 * ( zchar - 1 ) + buffer[i++] ] );
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
					result.push( buffer[i++] << 5 | buffer[i++] );
				}
			}
			else
			{
				// Regular characters
				result.push( this.alphabets[alphabet][ zchar - 6 ] );
			}
			
			// Reset the alphabet
			alphabet = alphabet < 4 ? 0 : alphabet - 3;
		}
		
		// The abbreviations table doesn't want text
		if ( !notext )
		{
			// Cache and return. Use String() so that .pc will be preserved
			result = new String( this.zscii_to_text( result ) );
			result.pc = addr;
			this.e.jit[start_addr] = result;
			if ( start_addr < this.e.staticmem )
			{
				console.warn( 'Caching a string in dynamic memory: ' + start_addr );
			}
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
			temp = alphabets[0].indexOf( achar );
			if ( temp >= 0 )
			{
				zchars.push( temp + 6 );
			}
			temp = alphabets[1].indexOf( achar );
			if ( temp >= 0 )
			{
				zchars.push( 4, temp + 6 );
			}
			temp = alphabets[2].indexOf( achar );
			if ( temp >= 0 )
			{
				zchars.push( 5, temp + 6 );
			}
			// 10-bit ZSCII
			temp = this.reverse_unicode_table[achar];
			if ( temp )
			{
				zchars.push( 5, 6, temp >> 5, temp & 0x1F );
			}
			// Pad character
			if ( achar == undefined )
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
	// Are using regex's slower than looping through the array?
	zscii_to_text: function( array )
	{
		// String.fromCharCode can be given an array of numbers if we call apply on it!
		return String.fromCharCode.apply( this, array )
			
			// Now convert the ZSCII to unicode
			// First remove any undefined codes
			.replace( /[\x00-\x0C\x0E-\x1F\x7F-\x9A\xFC-\uFFFF]/g, '' )
			
			// Then convert form feeds to new lines
			.replace( /\r/g, '\n' )
			
			// Then replace the extra characters with the ones from the unicode table, or with '?'
			.replace( /[\x9B-\xFB]/g, this.unicode_callback );
	},
	
	// If the second argument is set then don't use the unicode table
	text_to_zscii: function( text, notable )
	{
		var array = [], i = 0, l = text.length, charr;
		notable = !notable;
		while ( i < l )
		{
			charr = text.charCodeAt( i++ );
			// Non-safe ZSCII code... check the unicode table!
			if ( notable && charr != 13 && ( charr < 32 || charr > 126 ) )
			{
				// Find it or replace with '?'
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
		
		i = text + 2,
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
			letter = memory.getUint8( i );
			if ( letter == 32 || separators.indexOf( letter ) >= 0 )
			{
				if ( word.length )
				{
					words.push( [word, wordstart] );
					word = [];
					wordstart = i + 1;
				}
				if ( letter != 32 )
				{
					words.push( [letter, i] );
				}
			}
			else
			{
				word.push( letter );
			}
			i++;
		}
		if ( word.length )
		{
			words.push( [word, wordstart] );
		}
		
		// Go through the text until we either have reached the max number of words, or we're out of words
		max_words = Math.min( words.length, memory.getUint8( buffer ) );
		while ( wordcount < max_words )
		{
			word = this.encode( words[wordcount][0] );
			
			// If the flag is set then don't overwrite words which weren't found
			if ( !flag || dictionary[word] )
			{
				// Fill out the buffer
				memory.setUint16( buffer + 2 + wordcount * 4, dictionary[word] || 0 );
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
		
		// Standard ASCII
		if ( charCode > 31 && charCode < 127 )
		{
			return charCode;
		}
		
		// Consult the unicode table or return a '?'
		return this.reverse_unicode_table[charCode] || 63;
	}
});