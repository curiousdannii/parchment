/*

MemoryView: an enhanced DataView
================================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

// Accepts an ArrayBuffer, typed array, or a length number
export default function MemoryView( buffer, byteOffset, byteLength )
{
    if ( typeof buffer === 'number' )
    {
        buffer = new ArrayBuffer( buffer )
    }
    // Typed arrays
    if ( buffer.buffer )
    {
        buffer = buffer.buffer
    }

    return Object.assign( new DataView( buffer, byteOffset, byteLength ), {
        getUint8Array: function( start, length )
        {
            return new Uint8Array( this.buffer.slice( start, start + length ) )
        },
        setUint8Array: function( start, data )
        {
            if ( data instanceof ArrayBuffer )
            {
                data = new Uint8Array( data )
            }
            ( new Uint8Array( this.buffer ) ).set( data, start )
        },

        // For use with IFF files
        getFourCC: function( index )
        {
            return String.fromCharCode( this.getUint8( index ), this.getUint8( index + 1 ), this.getUint8( index + 2 ), this.getUint8( index + 3 ) )
        },
        setFourCC: function( index, text )
        {
            this.setUint8( index, text.charCodeAt( 0 ) )
            this.setUint8( index + 1, text.charCodeAt( 1 ) )
            this.setUint8( index + 2, text.charCodeAt( 2 ) )
            this.setUint8( index + 3, text.charCodeAt( 3 ) )
        },
    })
}