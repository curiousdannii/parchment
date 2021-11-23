/*

Parchment Launcher
==================

Copyright (c) 2021 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {fetch_storyfile, fetch_vm_resource} from './file.js'
import formats from './formats.js'
import GlkOte from '../upstream/glkote/glkote.js'

const default_options = {
    auto_launch: 1,
    //default_story: PATH_TO_JSIFIED_STORY
    lib_path: 'dist/web/',
}

class ParchmentLauncher
{
    constructor(parchment_options) {
        this.options = Object.assign({}, default_options, parchment_options)
    }

    find_engine(format, path) {
        for (const formatspec of formats) {
            if (formatspec.id === format || formatspec.extensions.test(path)) {
                return formatspec.engines[0]
            }
        }
        throw new Error('Unknown storyfile format')
    }

    get_storyfile_path() {
        const query = new URLSearchParams(document.location.search.substring(1))
        const story = query.get('story')
        if (story) {
            return story
        }

        if (this.options.default_story) {
            return this.options.default_story[0]
        }

        return null
    }

    launch() {
        try {
            const storyfile_path = this.get_storyfile_path()
            if (!storyfile_path) {
                return
            }
            const engine = this.find_engine(null, storyfile_path)
            this.load(engine, storyfile_path)
        }
        catch (err) {
            GlkOte.error(err)
            throw err
        }
    }

    // Overloaded load
    // engine can be a engine object or id
    // story can be a path or Uint8Array
    async load(engine, story) {
        try {
            if (typeof format === 'string') {
                format = this.find_engine(format)
            }

            const requires = await Promise.all([
                typeof story === 'string' ? fetch_storyfile(story) : story,
                ...engine.load.map(path => fetch_vm_resource(this.options, path))
            ])

            await engine.start(this.options, requires)
        }
        catch (err) {
            GlkOte.error(err)
            throw err
        }
    }
}

$(() => {
    const parchment = new ParchmentLauncher(window.parchment_options)
    window.parchment = parchment

    if (parchment.options.auto_launch) {
        parchment.launch()
    }
})