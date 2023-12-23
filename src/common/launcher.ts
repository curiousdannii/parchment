/*

Parchment Launcher
==================

Copyright (c) 2023 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import Cookies from 'js-cookie'

import {AsyncGlk, Blorb, FileView} from '../upstream/asyncglk/src/index-browser.js'
import {get_default_options, get_query_options, ParchmentOptions} from './options.js'
import {fetch_storyfile, fetch_vm_resource, read_uploaded_file} from './file.js'
import {find_format, Format, identify_blorb_storyfile_format} from './formats.js'

interface ParchmentWindow extends Window {
    parchment: ParchmentLauncher
    parchment_options?: ParchmentOptions
}
declare let window: ParchmentWindow

class ParchmentLauncher
{
    options: ParchmentOptions

    constructor(parchment_options?: ParchmentOptions) {
        this.options = Object.assign({}, get_default_options(), parchment_options, get_query_options(['do_vm_autosave', 'story', 'use_asyncglk']))
        // Use AsyncGlk if requested
        if (this.options.use_asyncglk) {
            this.options.Glk = new AsyncGlk()
        }
    }

    get_storyfile_path() {
        return this.options.story || this.options.default_story?.[0] || null
    }

    launch() {
        try {
            // Update the Dialog storage version
            this.options.Dialog.init()

            // Apply the dark theme if set
            const theme = this.options.theme
                || Cookies.get(this.options.theme_cookie)
                // Or if the browser tells us to prefer dark
                || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : '')
            if (theme) {
                document.documentElement.setAttribute('data-theme', theme)
            }

            const storyfile_path = this.get_storyfile_path()
            if (!storyfile_path) {
                // Set up all the ways we can load a story
                $('#custom-file-upload').show().on('keydown', event => {
                    if (event.keyCode === 32 /*Space*/ || event.keyCode === 13 /*Enter*/) {
                        event.target.click()
                    }
                })
                $('#file-upload').on('change', () => {
                    const file = ($('#file-upload')[0] as HTMLInputElement)?.files?.[0]
                    if (file) {
                        this.load_uploaded_file(file)
                    }
                })
                $('#play-url').show()
                $('#play-url-button').on('click', () => this.load_url())
                $('#play-url-input').on('keydown', event => {
                    if (event.keyCode === 13 /*Enter*/) {
                        this.load_url()
                    }
                })
                return
            }

            this.load(storyfile_path, this.options.format)
        }
        catch (err) {
            this.options.GlkOte.error(err)
            throw err
        }
    }

    // Overloaded load
    // story can be a path or Uint8Array
    // format can be an engine object, id string, or null, in which case it will be identified from the story
    async load(story: string | Uint8Array, format?: Format | string) {
        try {
            // Hide the about page, and show the loading spinner instead
            $('#about').remove()
            $('#loadingpane').show()

            // Identify the format
            if (!format) {
                if (typeof story === 'string') {
                    format = find_format(null, story)
                }
                else {
                    throw new Error('Cannot identify storyfile format without path')
                }
            }

            // If a blorb file extension is generic, we must download it first to identify its format
            let blorb
            if (typeof format !== 'string' && format.id === 'blorb') {
                if (typeof story === 'string') {
                    story = await fetch_storyfile(this.options, story)
                }
                blorb = new Blorb(story)
                format = identify_blorb_storyfile_format(blorb)
            }

            if (typeof format === 'string') {
                format = find_format(format)
            }
            const engine = format.engines![0]

            const requires = await Promise.all([
                typeof story === 'string' ? fetch_storyfile(this.options, story) : story,
                ...engine.load.map(path => fetch_vm_resource(this.options, path))
            ])
            story = requires[0]

            // If the story is a Blorb, then parse it and pass in the options
            const options = Object.assign({}, this.options)
            const view = new FileView(story)
            if (view.getFourCC(0) === 'FORM' && view.getFourCC(8) === 'IFRS') {
                options.Blorb = blorb || new Blorb(story)
            }

            await engine.start(options, requires)
        }
        catch (err) {
            this.options.GlkOte.error(err)
            throw err
        }
    }

    async load_uploaded_file(file: File) {
        try {
            this.load(await read_uploaded_file(file), find_format(null, file.name))
        }
        catch (err) {
            this.options.GlkOte.error(err)
            throw err
        }
    }

    load_url() {
        const url = $('#play-url-input').val() as string
        if (!url) {
            return
        }
        // Validate the URL
        try {
            new URL(url)
        }
        catch (_) {
            $('#play-url-error').text('Please enter a valid URL')
            return
        }

        // Change the page URL
        const new_url = new URL(window.location + '')
        new_url.searchParams.set('story', url)
        window.location = new_url + ''

        // TODO: We could use the history API, but we need to then handle going back
        //history.pushState(null, '', new_url)
        //this.load(url)
    }
}

$(() => {
    const parchment = new ParchmentLauncher(window.parchment_options)
    window.parchment = parchment

    if (parchment.options.auto_launch) {
        parchment.launch()
    }
})
