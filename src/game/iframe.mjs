/*

GlkOte iframe handler
=====================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import throttle from 'lodash-es/throttle'

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

/* Approach inspired by https://codepen.io/IliaSky/pen/VjgBqQ */
function onScrollOrTouch()
{
    var win = $( this )

    function toggleToolbar( off )
    {
        parent.postMessage( {
            code: 'toolbar',
            off: off,
        }, '*' )
        win.data( 'noToolbar', off )
        setTimeout( () => win.data( 'scrollTop', win[0].scrollTop ), 400 )
    }

    const noToolbar = win.data( 'noToolbar' )
    const oldScrollTop = win.data( 'scrollTop' ) || 0
    const newScrollTop = this.scrollTop
    const delta = newScrollTop - oldScrollTop

    if ( Math.abs( delta ) > 8 )
    {
        if ( delta > 0 && !noToolbar )
        {
            toggleToolbar( 1 )
        }
        else if ( delta < 0 && noToolbar )
        {
            toggleToolbar( 0 )
        }
    }
    win.data( 'scrollTop', newScrollTop )
}

$(function()
{
    window.addEventListener( 'message', onMessage )

    $( '#windowport' ).on( 'scroll touchmove', '.BufferWindow', throttle( onScrollOrTouch, 200 ) )
})