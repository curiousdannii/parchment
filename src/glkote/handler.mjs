/*

GlkOte iframe handler
=====================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

const Glk = {
    accept: function( message )
    {
        parent.postMessage( {
            code: 'Glk',
            func: 'accept',
            args: [ message ],
        }, '*' )
    },
}

function onMessage( message )
{
    const messagedata = message.data
    const code = messagedata.code

    if ( code === 'GlkOte' )
    {
        // Intercept the init call to add the proxy Glk
        if ( messagedata.func === 'init' )
        {
            messagedata.args = [ Glk ]
        }
        
        GlkOte[ messagedata.func ].apply( GlkOte, messagedata.args )
    }
}

window.addEventListener( 'message', onMessage )