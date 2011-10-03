/*

ByteArray classes, using Typed Arrays if possible
=================================================

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/
 
/*

Todo:
	consider whether direct array access would help (what did i mean by this???)
	is signed access needed?
	add a system for guards, to run callbacks if certain addresses were written to
	check whether returning the set values is bad for perf

*/

;;; log( 'bytearray.js: ' + ( window.DataView ? 'Native DataView' : 'Emulating DataView' ) );

var native_bytearrays = window.DataView,

ByteArray = native_bytearrays ?
	// Converts the data to a buffer and then initiates a DataView on it
	function( data )
	{
		var buffer = new ArrayBuffer( data ),
		data = new DataView( buffer );
		data.buffer = buffer;
		return data;
	} :
	
	// Emulate DataView
	function( data )
	{
		// Copy the passed in array
		data = data.slice();
		
		/* ZVM */ if ( ZVM ) {
			return {
				data: data,
				getUint8: function( index ) { return data[index]; },
				getUint16: function( index ) { return data[index] << 8 | data[index + 1]; },
				getBuffer: function( start, length ) { return data.slice( start, start + length ); },
				setUint8: function( index, value ) { return data[index] = value & 0xFF; },
				setUint16: function( index, value ) { data[index] = (value >> 8) & 0xFF; data[index + 1] = value & 0xFF; return value & 0xFFFF; },
				setBuffer: function( index, buffer, safe )
				{
					// If we know the buffer is an array of bytes we can concat
					if ( safe )
					{
						return data = data.slice( 0, index ).concat( buffer, data.slice( index + buffer.length ) );
					}
					
					for ( var i = 0; i < buffer.length; i++ )
					{
						data[index + i] = buffer[i] & 0xFF;
					}
				}
			};
		} /* ENDZVM */
		/* GVM */ if ( GVM ) {
		} /* ENDGVM */
	};