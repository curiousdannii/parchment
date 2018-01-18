/*

Game controller
===============

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

export default class Game
{
    constructor( direct )
    {
        this.nav = document.getElementById( 'launcher-nav' )
        this.direct = direct
    }

    async handleWorkerError( err )
    {
        await ons.notification.alert({
            title: 'Error',
            messageHTML: `<p class="coderesult">${ err.message }</p>`,
        })
        if ( !this.hasupdated )
        {
            await this.nav.popPage( { animation: 'none' } )
            this.shutdown()
        }
    }

    onIframeMessage( message )
    {
        const messagedata = message.data
        const code = messagedata.code

        if ( code === 'toolbar' )
        {
            this.page.classList.toggle( 'no-toolbar', messagedata.off )
        }

        if ( code === 'Glk' )
        {
            this.worker.postMessage( messagedata )
        }
    }

    onWorkerMessage( message )
    {
        const messagedata = message.data
        const code = messagedata.code

        if ( code === 'GlkOte' )
        {
            this.iframe.contentWindow.postMessage( messagedata, '*' )
        }
        this.hasupdated = true
    }

    async setupIframe()
    {
        this.page = await this.nav[ this.direct ? 'replacePage' : 'pushPage' ]( 'game.html', { animation: 'none' } )
        this.iframe = document.getElementById( 'glkote' )
        window.addEventListener( 'message', message => this.onIframeMessage( message ) )
    }

    async setupWorker( game )
    {
        // Relative to the .html, not to the .js
        const worker = new Worker( 'game/worker.js', { name: game.format.engines[0].id } )
        worker.addEventListener( 'error', async err => await this.handleWorkerError( err ) )
        worker.addEventListener( 'message', message => this.onWorkerMessage( message ) )
        worker.postMessage({
            code: 'prepare',
            data: game.data,
            vm: game.format.engines[0],
        })
        this.worker = worker
    }

    async shutdown()
    {
        this.worker.terminate()
    }

    async start( game )
    {
        await Promise.all( [ this.setupIframe(), this.setupWorker( game ) ] )
        this.worker.postMessage({ code: 'start' })
    }
}