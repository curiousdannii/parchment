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
        ons.notification.alert({
            title: 'Startup error',
            messageHTML: `<p class="coderesult">${ err }</p>`,
        })
    }
}