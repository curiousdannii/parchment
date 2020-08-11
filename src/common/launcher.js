/*

Parchment Launcher
==================

Copyright (c) 2020 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {fetch_storyfile, fetch_vm_resource} from './file.js'
import formats from './formats.js'
import GlkOte from '../upstream/glkote/glkote.js'

const default_options = {
    lib_path: 'dist/web/',
}

async function launch()
{
    const options = Object.assign(default_options, window.parchment_options)

    if (!options || !options.default_story)
    {
        return GlkOte.error('No storyfile specified')
    }

    // Discriminate
    const storyfilepath = options.default_story[0]
    let format
    for (const formatspec of formats)
    {
        if (formatspec.extensions.test(storyfilepath))
        {
            format = formatspec
            break
        }
    }
    if (!format)
    {
        return GlkOte.error('Unknown storyfile format')
    }
    const engine = format.engines[0]

    try
    {

        const requires = await Promise.all([
            fetch_storyfile(storyfilepath),
            ...engine.load.map(path => fetch_vm_resource(options, path))
        ])

        await engine.start(options, requires)
    }
    catch (err)
    {
        GlkOte.error(err)
        throw err
    }
}

$(launch)