/*

The Parchment launcher
======================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import * as file from './filesystem.js'
import * as plugins from './plugins.js'

launcher()

async function launcher()
{
    try
    {
        await plugins.deviceready
        const intent = await plugins.getIntent()
        $( '#welcome' ).append( `<p class="coderesult">intent: ${ JSON.stringify( intent ) }</p>` )

        // We are being asked to open a file
        if ( intent.action === 'android.intent.action.VIEW' )
        {
            const buffer = await file.readBufferFromIntent( intent )
            if ( buffer )
            {
                $( '#welcome' ).append( `<p><b>Buffer read:</b></p><p class="coderesult">${ buffer.byteLength }</p>` )
            }
        }
    }
    catch ( err )
    {
        if ( err instanceof file.ContentUrlAccessError )
        {
            ons.notification.alert({
                title: 'Unable to access file',
                messageHTML: `Sorry, but we couldn't access that file. If you are trying to play a story from Dropbox or another cloud app, please try exporting or downloading the file locally.`,
            })
        }
        else
        {
            let message = `<p class="coderesult">${ err.message || JSON.stringify( err ) }</p>`
            if ( err.stack )
            {
                message += `<p class="coderesult">${ err.stack }</p>`
            }
            ons.notification.alert({
                title: 'Startup error',
                messageHTML: message,
            })
        }
    }
}