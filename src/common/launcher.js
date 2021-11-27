/*

Parchment Launcher
==================

Copyright (c) 2021 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {fetch_storyfile, fetch_vm_resource} from './file.js'
import {formats, parse_blorb} from './formats.js'
import GlkOte from '../upstream/glkote/glkote.js'

const default_options = {
    auto_launch: 1,
    //default_story: PATH_TO_JSIFIED_STORY
    lib_path: 'dist/web/',
    proxy_url: 'https://proxy.iplayif.com/proxy/',
}

class ParchmentLauncher
{
    constructor(parchment_options) {
        this.options = Object.assign({}, default_options, parchment_options)
    }

    find_format(format, path) {
        for (const formatspec of formats) {
            if (formatspec.id === format || formatspec.extensions.test(path)) {
                return formatspec
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

            const format = this.find_format(null, storyfile_path)
            this.load(format, storyfile_path)
        }
        catch (err) {
            GlkOte.error(err)
            throw err
        }
    }

    // Overloaded load
    // engine can be a engine object or id
    // story can be a path or Uint8Array
    async load(format, story) {
        try {
            // Hide the about page, and show the loading spinner instead
            $('#about').remove()
            $('#loadingpane').show()

            // If a blorb URL doesn't specify its type, we must download it first
            if (format.id === 'blorb') {
                if (typeof story === 'string') {
                    story = await fetch_storyfile(this.options, story)
                }
                format = parse_blorb(story)
            }

            if (typeof format === 'string') {
                format = this.find_format(format)
            }
            const engine = format.engines[0]

            const requires = await Promise.all([
                typeof story === 'string' ? fetch_storyfile(this.options, story) : story,
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