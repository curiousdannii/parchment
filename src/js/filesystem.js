/*

Promisified file system functions
=================================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import pify from 'pify'

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
    const fileEntry = await file.resolveLocalFileSystemURL( intent.data )
    const fileobj = await file.fileFromFileEntry( fileEntry )
    const buffer = await file.readAsArrayBuffer( fileobj )

    return buffer
}

export const resolveLocalFileSystemURL = pify( ( contentUrl, callback ) => {
    window.resolveLocalFileSystemURL( contentUrl, path => callback( null, path ), err => callback ( err ) )
})