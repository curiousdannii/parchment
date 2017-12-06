/*

Promisified file system functions
=================================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import pify from 'pify'

export class ContentUrlAccessError extends Error {}

export const fileFromFileEntry = pify( ( fileEntry, callback ) => {
    fileEntry.file( file => callback( null, file ), err => callback( err ) )
})

export const readAsArrayBuffer = pify( ( file, callback ) => {
    const reader = new FileReader()
    reader.onload = () => callback( null, reader.result )
    reader.onerror = () => callback( reader.error )
    reader.readAsArrayBuffer( file )
})

// Read a file buffer from an intent
export async function readBufferFromIntent( intent )
{
    let fileEntry

    // Try to resolve the URL, but catch errors from apps like Dropbox
    try
    {
        fileEntry = await resolveLocalFileSystemURL( intent.data )
    }
    catch ( err )
    {
        if ( err.code === FileError.ENCODING_ERR )
        {
            throw new ContentUrlAccessError()
        }
        throw err
    }

    const file = await fileFromFileEntry( fileEntry )
    const buffer = await readAsArrayBuffer( file )

    return buffer
}

export const resolveLocalFileSystemURL = pify( ( contentUrl, callback ) => {
    window.resolveLocalFileSystemURL( contentUrl, path => callback( null, path ), err => callback ( err ) )
})