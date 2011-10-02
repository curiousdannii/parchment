/*
 * Z-Machine text functions
 *
 * Copyright (c) 2011 The ifvms.js team
 * Licenced under the BSD
 * http://github.com/curiousdannii/ifvms.js
 */

/*
	
TODO:
	Proper ZSCII->ASCII transcoding
	
*/

var rnewline = /\n/g,
rdoublequote = /"/g,

// Standard alphabets
standard_alphabets = (function(a){
	var b = [[], [], []],
	i = 0;
	while ( i < 78 )
	{
		b[parseInt( i / 26 )][i % 26] = a.charCodeAt( i++ );
	}
	return b;
})( 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ*\n0123456789.,!?_#\'"/\\-:()' ),

// A class for managing everything text
Text = Object.subClass({
	init: function( engine )
	{
		var memory = engine.m,
		
		alphabet_addr = memory.getUint16( 0x34 ),
		i = 0,
		alphabets;
		
		this.e = engine;
		
		// Check for custom alphabets
		if ( alphabet_addr )
		{
			alphabets = [[], [], []];
			while ( i < 78 )
			{
				alphabets[parseInt( i / 26 )][i % 26] = memory.getUint8( alphabet_addr + i++ );
			}
		}
		// Otherwise use the standard alphabets
		else
		{
			alphabets = standard_alphabets;
		}
		this.alphabets = alphabets;
		
		// Parse the standard dictionary
		this.dictionaries = {};
		this.parse_dict( this.e.dictionary );
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
		if ( !finaladdr )
		{
			finaladdr = memory.getUint16( 0x1A ) * this.e.packing_multipler;
		}
		
		// Go through until we've reached the end of the text or a stop bit
		while ( addr < finaladdr )
		{
			word = memory.getUint16( addr );
			addr += 2;
			
			buffer.push( word >> 10, word >> 5, word );
			
			// Stop bit
			if ( word & 0x8000 )
			{
				break;
			}
		}
		
		// Process the Z-chars
		while ( i < buffer.length )
		{
			zchar = buffer[i++] & 0x1F;
			
			// Special chars
			// Space
			if ( zchar == 0 )
			{
				result.push( 32 );
			}
			// Abbreviations
			else if ( zchar < 4 )
			{
			}
			// Shift characters
			else if ( zchar < 6 )
			{
				alphabet = zchar;
			}
			// Check for a 10 bit ZSCII character
			else if ( alphabet == 2 && zchar == 6 )
			{
				result.push( (buffer[i++] & 0x1F) << 5 | (buffer[i++] & 0x1F) );
			}
			else
			{
				// Regular characters
				result.push( this.alphabets[alphabet][ zchar - 6 ] );
			}
			
			// Reset the alphabet
			alphabet = alphabet < 4 ? 0 : alphabet - 3;
		}
		
		// Cache and return
		result = [ this.array_to_text( result ), addr - start_addr ];
		this.e.jit[start_addr] = result;
		if ( start_addr < this.e.staticmem )
		{
			console.warn( 'Caching a string in dynamic memory: ' + start_addr );
		}
		return result;
	},
	
	// Escape text for JITing
	escape: function( text )
	{
		return text.replace( rnewline, '\\n' ).replace( rdoublequote, '\\"' );
	},
	
	array_to_text: function( array )
	{
		// String.fromCharCode can be given an array of numbers if we call apply on it!
		return String.fromCharCode.apply( 1, array );
	},
	
	text_to_array: function( text )
	{
		var array = [], i = 0, l = text.length;
		while ( i < l )
		{
			array.push( text.charCodeAt( i++ ) & 0xFF );
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
		separators = this.array_to_text( memory.getBuffer( addr, seperators_len ) );
		// Match either a separator or something bound by them
		dict.lexer_pattern = new RegExp( '[' + separators + ']|(^|\\b)\\S+?(?=$|[ ' + separators + '])', 'g' );
		addr += seperators_len;
		
		// Go through the dictionary and cache its entries
		entry_len = memory.getUint8( addr++ );
		endaddr = addr + 2 + entry_len * memory.getUint16( addr );
		addr += 2;
		while ( addr < endaddr )
		{
			dict[this.decode( addr, addr + 6 )[0]] = addr;
			addr += entry_len;
		}
		this.dictionaries[addr_start] = dict;
		
		return dict;
	},
	
	// Tokenise a text
	tokenise: function( text, buffer, dictionary )
	{
		// Use the default dictionary if one wasn't provided
		dictionary = dictionary || this.e.dictionary;
		
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