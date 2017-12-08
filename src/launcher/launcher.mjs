/*

The Parchment launcher
======================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import * as plugins from './plugins.mjs'
import * as runner from './runner.mjs'

launcher()

async function launcher()
{
    try
    {
        await plugins.deviceready
        const intent = await plugins.getIntent()

        // We are being asked to open a file
        if ( intent.action === 'android.intent.action.VIEW' )
        {
            intent.direct = true
            await runner.loadStoryFromIntent( intent )
        }
    }
    catch ( err )
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
        $( '#welcome' ).append( message )
    }
}