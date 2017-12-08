/*

Worker controller
=================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import MessageProxy from '../common/messageproxy.mjs'

importScripts( './glkapi.js' )

let data
let GlkAcceptFunc
let vm

const GlkOte = new MessageProxy( postMessage, 'GlkOte', [ 'error', 'extevent', 'getdomcontext', 'getinterface', 'glkote_set_dom_context', 'log', 'save_allstate', 'setdomcontext', 'update', 'warning' ],
{
    init: data => {
        // Store a reference to the accept function
        GlkAcceptFunc = data.accept

        // We can't pass the actual VM through, so send a null call through, and the iframe's handler will intercept
        postMessage({
            code: 'GlkOte',
            func: 'init',
            args: null,
        })
    },
})

function onMessage( message )
{
    const messagedata = message.data
    const code = messagedata.code

    if ( code === 'prepare' )
    {
        data = messagedata.data
        importScripts( '../' + messagedata.vm.vm )
        vm = new self[ messagedata.vm.className ]()
        vm.prepare( data, {
            Glk: Glk,
        })
    }

    if ( code === 'start' )
    {
        Glk.init({
            Dialog: {},
            GlkOte: GlkOte,
            vm: vm,
        })
    }

    if ( code === 'Glk' && messagedata.func === 'accept' )
    {
        GlkAcceptFunc.apply( Glk, messagedata.args )
    }
}

addEventListener( 'message', onMessage )