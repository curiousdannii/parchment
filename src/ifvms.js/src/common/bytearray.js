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
		Needed for: @storew, @storeb, @output_stream?, @encode_text, @copy_table, @restore, @restore_undo
	check whether returning the set values is bad for perf
	consider generic funcs for set/get: get=Uint8(0), set=Uint8(0,0)

*/

;;; console.log( 'bytearray.js: ' + ( window.DataView ? 'Native DataView' : 'Emulating DataView' ) );

//var native_bytearrays = window.DataView,
var native_bytearrays = 0,

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
			return extend( data, {
				data: data,
				getUint8: function( index ) { return data[index]; },
				getUint16: function( index ) { return data[index] << 8 | data[index + 1]; },
				getBuffer: function( start, length ) { return data.slice( start, start + length ); },
				getBuffer16: function( start, length ) { return byte_to_word( data.slice( start, start + length * 2 ) ); },
				setUint8: function( index, value ) { return data[index] = value & 0xFF; },
				setUint16: function( index, value ) { data[index] = (value >> 8) & 0xFF; data[index + 1] = value & 0xFF; return value & 0xFFFF; },
				setBuffer: function( index, buffer )
				{
					var i = 0, l = buffer.length;
					while ( i < l )
					{
						data[i + index] = buffer[i++];
					}
				}
			} );
		} /* ENDZVM */
		/* GVM */ if ( GVM ) {
		} /* ENDGVM */
	};