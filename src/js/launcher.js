/*

The Parchment launcher
======================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import { promisify, promplugins } from './promisify.js'

launcher()

async function launcher()
{
    try
    {
        await promisify
        const path = await getRequestedFilePath()
        if ( path )
        {
            $( '#welcome' ).append( `<p><b>Path:</b></p><p class="coderesult">${ path }</p>` )
        }
    }
    catch ( err )
    {
        ons.notification.alert({
            title: 'Startup error',
            messageHTML: `<p class="coderesult">${ err }</p>`,
        });
    }
}

async function getRequestedFilePath()
{
    const intent = await promplugins.getIntent()
    $( '#welcome' ).append( `<p class="coderesult">intent: ${ JSON.stringify( intent ) }</p>` )

    // We are being asked to open a file
    if ( intent.action === 'android.intent.action.VIEW' )
    {
        const data = intent.data
        let url = null

        // Supports: FX File Manager
        if ( data.startsWith( 'file:' ) )
        {
            return data
        }

        // Supports: nothing?
        /*try
        {
            url = await promplugins.getRealPath( data )
            if ( url )
            {
                return url
            }
        }
        catch ( err ) {}*/

        // Supports: ASUS File Manager
        try
        {
            url = await promplugins.resolveNativePath( data )
            if ( url )
            {
                return url
            }
        }
        catch ( err ) {}

        $( '#welcome' ).append( `<p><b>Could not parse path:</b></p><p class="coderesult">${ data }</p>` )
        return null
    }
    else
    {
        return null
    }
}