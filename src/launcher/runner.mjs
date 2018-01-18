/*

Runner: load and run a story
============================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import * as file from '../common/filesystem.mjs'
import * as formats from '../common/formats.mjs'
import Game from '../game/game.mjs'

export async function loadStoryFromIntent( intent )
{
    try
    {
        const buffer = await file.readBufferFromIntent( intent )
        const identification = await formats.identify( buffer )

        if ( identification && identification.format.engines )
        {
            const game = new Game( intent.direct )
            await game.start( identification )
        }
        else
        {
            ons.notification.alert({
                title: 'Unable to play file',
                message: `Sorry, but we don't know how to play that kind of file.`,
            })
        }
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