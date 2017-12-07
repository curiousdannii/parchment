/*

Runner: load and run a story
============================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import * as file from './filesystem.mjs'
import * as formats from '../common/formats.mjs'

export async function loadStoryFromIntent( intent )
{
    try
    {
        const buffer = await file.readBufferFromIntent( intent )
        const format = await formats.identify( buffer )
        $( '#welcome' ).append( `<p><b>Format:</b></p><p class="coderesult">${ JSON.stringify( format.format ) }</p>` )
    }
    catch ( err )
    {
        if ( err instanceof file.ContentUrlAccessError )
        {
            ons.notification.alert({
                title: 'Unable to access file',
                message: `Sorry, but we couldn't access that file. If you are trying to play a story from Dropbox or another cloud app, please try exporting or downloading the file locally.`,
            })
        }
        else
        {
            throw err
        }
    }
}