/*

File classes
============

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import MemoryView from './memoryview.mjs'

// A basic IFF file, to be extended later
// Currently supports buffer data
export class IFF
{
    constructor( data )
    {
        this.type = ''
        this.chunks = []

        if ( data )
        {
            const view = MemoryView( data )

            // Check that it is actually an IFF file
            if ( view.getFourCC( 0 ) !== 'FORM' )
            {
                throw new Error( 'Not an IFF file' )
            }

            // Parse the file
            this.type = view.getFourCC( 8 )
            const length = view.getUint32( 4 ) + 8
            let i = 12

            while ( i < length )
            {
                let chunk_length = view.getUint32( i + 4 )

                if ( chunk_length < 0 || ( chunk_length + i ) > length )
                {
                    throw new Error( 'IFF chunk out of range' )
                }

                this.chunks.push({
                    type: view.getFourCC( i ),
                    offset: i,
                    data: view.getUint8Array( i + 8, chunk_length ),
                })

                i += 8 + chunk_length
                if ( chunk_length % 2 )
                {
                    i++
                }
            }
        }
    }

    // Comment out until we know we need it
    /*write()
    {
        // First calculate the required buffer length
        let buffer_len = 12
        for ( let i = 0; i < this.chunks.length; i++ )
        {
            // Replace typed arrays or dataviews with their buffers
            if ( this.chunks[i].data.buffer )
            {
                this.chunks[i].data = this.chunks[i].data.buffer
            }
            this.chunks[i].length = this.chunks[i].data.byteLength || this.chunks[i].data.length
            buffer_len += 8 + this.chunks[i].length
            if ( buffer_len % 2 )
            {
                buffer_len++
            }
        }

        const out = MemoryView( buffer_len )
        out.setFourCC( 0, 'FORM' )
        out.setUint32( 4, buffer_len - 8 )
        out.setFourCC( 8, this.type )

        // Go through the chunks and write them out
        let index = 12
        for ( let i = 0; i < this.chunks.length; i++ )
        {
            let chunk = this.chunks[i]
            out.setFourCC( index, chunk.type )
            out.setUint32( index + 4, chunk.length )
            out.setUint8Array( index + 8, chunk.data )
            index += 8 + chunk.length
            if ( index % 2 )
            {
                index++
            }
        }

        return out.buffer
    }*/
}

export class Blorb extends IFF
{
    constructor( data )
    {
        super( data )
        if ( data )
        {
            if ( this.type !== 'IFRS' )
            {
                throw new Error( 'Not a Blorb file' )
            }

            // Process the RIdx chunk to find the main exec chunk
            if ( this.chunks[0].type !== 'RIdx' )
            {
                throw new Error( 'Malformed Blorb: chunk 1 is not RIdx' )
            }

            const view = MemoryView( this.chunks[0].data )
            for ( let i = 4; i < this.chunks[0].data.length; i += 12 )
            {
                if ( view.getFourCC( i ) === 'Exec' && view.getUint32( i + 4 ) === 0 )
                {
                    this.exec = this.chunks.filter( chunk => chunk.offset === view.getUint32( i + 8 ) )[0]
                    return
                }
            }
        }
    }
}