/*

Z-Machine text functions
========================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*
	
TODO:
	I think the dictionary will fail for long strings finishing with a multi-Zchar
	
*/

var rnewline = /\n/g,
rformfeed = /\r/g,
rdoublequote = /"/g,
rzsciiundefined = /[\x00-\x0C\x0E-\x1F\x7F-\x9A\xFC-\uFFFF]/g,
rzsciiextras = /[\x9B-\xFB]/g,

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
		
		// Check for custom alphabets
		this.make_alphabet( alphabet_addr ? memory.getBuffer( alphabet_addr, 78 )
			// Or use the standard alphabet
			: this.text_to_zscii( 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ*\r0123456789.,!?_#\'"/\\-:()' ) );
		
		// Check for a custom unicode table
		this.make_unicode( unicode_addr ? memory.getBuffer16( unicode_addr, unicode_len )
			// Or use the default
			: this.text_to_zscii( unescape( '%E4%F6%FC%C4%D6%DC%DF%BB%AB%EB%E2%EA%EE%F4%FB%C2%CA%CE%D4%DB%EF%FF%CB%CF%E1%E9%ED%F3%FA%FD%C1%C9%CD%D3%DA%DD%E0%E8%EC%F2%F9%C0%C8%CC%D2%D9%E5%C5%F8%D8%E3%F1%F5%C3%D1%D5%E6%C6%E7%C7%FE%F0%DE%D0%A3%u0153%u0152%A1%BF' ), 1 ) );
		
		// Abbreviations
		abbreviations = memory.getUint16( 0x18 );
		if ( abbreviations )
		{
			while ( i < l )
			{
				abbr_array.push( this.decode( memory.getUint16( abbreviations + 2 * i++ ) * 2 ) );
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
	},
	
	// Decode Z-chars into Unicode
	decode: function( addr, finaladdr )
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
		
		// Don't go past the end of the file if we haven't been given a final address
		finaladdr = finaladdr || memory.getUint16( 0x1A ) * this.e.packing_multipler;
		
		// Go through until we've reached the end of the text or a stop bit
		while ( addr < finaladdr )
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
				result.push( buffer[i++] << 5 | buffer[i++] );
			}
			else
			{
				// Regular characters
				result.push( this.alphabets[alphabet][ zchar - 6 ] );
			}
			
			// Reset the alphabet
			alphabet = alphabet < 4 ? 0 : alphabet - 3;
		}
		
		// If we haven't finished making the abbreviations table don't convert to text
		if ( this.abbr )
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
	
	// Escape text for JITing
	escape: function( text )
	{
		return text.replace( rnewline, '\\n' ).replace( rdoublequote, '\\"' );
	},
	
	// In these two functions zscii means an array of ZSCII codes and text means a regular Javascript unicode string
	// Are using regex's slower than looping through the array?
	zscii_to_text: function( array )
	{
		var unicode_table = this.unicode_table;
		// String.fromCharCode can be given an array of numbers if we call apply on it!
		return String.fromCharCode.apply( this, array )
			
			// Now convert the ZSCII to unicode
			// First remove any undefined codes
			.replace( rzsciiundefined, '' )
			
			// Then convert form feeds to new lines
			.replace( rformfeed, '\n' )
			
			// Then replace the extra characters with the ones from the unicode table, or with '?'
			.replace( rzsciiextras, function( charr ){ return String.fromCharCode( unicode_table[charr.charCodeAt(0)] || 63 ) } );
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
		
		// Get the word separators and generate a RegExp to tokenise with
		seperators_len = memory.getUint8( addr++ ),
		separators = this.zscii_to_text( memory.getBuffer( addr, seperators_len ) );
		// Match either a separator or something bound by them (max of 9 characters)
		dict.lexer_pattern = new RegExp( '[' + separators + ']|\\b\\S{1,9}(?=\\S*?(\\b|[' + separators + ']))', 'g' );
		addr += seperators_len;
		
		// Go through the dictionary and cache its entries
		entry_len = memory.getUint8( addr++ );
		endaddr = addr + 2 + entry_len * memory.getUint16( addr );
		addr += 2;
		while ( addr < endaddr )
		{
			dict[this.decode( addr, addr + 6 )] = addr;
			addr += entry_len;
		}
		this.dictionaries[addr_start] = dict;
		
		return dict;
	},
	
	// Tokenise a text
	tokenise: function( text, buffer, dictionary )
	{
		// Use the default dictionary if one wasn't provided
		dictionary = dictionary || this.dict;
		
		// Parse the dictionary if needed
		dictionary = this.dictionaries[dictionary] || this.parse_dict( dictionary );
		
		var memory = this.e.m,
		
		i = 0,
		max_words = memory.getUint8( buffer ),
		lexer = dictionary.lexer_pattern,
		word;
		
		// Reset the lexer's index
		lexer.lastIndex = 0;
		
		// Go through the text until we either have reached the max number of words, or we can't find any more
		text = text.toLowerCase();
		while ( i < max_words && ( word = lexer.exec( text ) ) )
		{
			// Fill out the buffer
			memory.setUint16( buffer + 2 + i * 4, dictionary[word[0]] || 0 );
			memory.setUint8( buffer + 4 + i * 4, word[0].length );
			memory.setUint8( buffer + 5 + i++ * 4, word.index );
		}
		// Update the number of found words
		memory.setUint8( buffer + 1, i );
	}
});