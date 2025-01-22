/*

Parchment Launcher
==================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import '../web/web.css'

import Cookies from 'js-cookie'

import {/*AsyncGlk,*/ Blorb, fetch_resource, FileView, type ProgressCallback} from '../upstream/asyncglk/src/index-browser.js'
import emglken_file_sizes from 'emglken/build/file-sizes.json'

import {find_format, identify_blorb_storyfile_format} from './formats.js'
import type {ParchmentOptions, StoryOptions} from './interface.js'
import {get_default_options, get_query_options} from './options.js'

import LoadingPane from './ui/LoadingPane.svelte'

interface ParchmentWindow extends Window {
    parchment: ParchmentLauncher
    parchment_options?: ParchmentOptions
}
declare let window: ParchmentWindow

class ParchmentLauncher {
    loading_pane?: LoadingPane
    options: ParchmentOptions
    story?: StoryOptions

    constructor(parchment_options?: ParchmentOptions) {
        // Only get story from the URL if there is no story already in the parchment_options
        const query_options: Array<keyof ParchmentOptions> = ['autoplay', 'do_vm_autosave', 'use_asyncglk']
        if (!parchment_options?.story) {
            query_options.push('story')
        }
        this.options = Object.assign({}, get_default_options(), parchment_options, get_query_options(query_options))
        // Use AsyncGlk if requested
        /*if (this.options.use_asyncglk) {
            this.options.Glk = new AsyncGlk()
        }*/
    }

    get_storyfile_path(): StoryOptions | null {
        if (this.options.story) {
            if (typeof this.options.story === 'string') {
                return {url: this.options.story}
            }
            return this.options.story
        }
        if (this.options.default_story) {
            return {url: this.options.default_story?.[0]}
        }
        return null
    }

    async launch() {
        try {
            // Update the Dialog storage version
            await this.options.Dialog.init(this.options)

            // Apply the dark theme if set
            const theme = this.options.theme
                || Cookies.get(this.options.theme_cookie)
                // Or if the browser tells us to prefer dark
                || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : '')
            if (theme) {
                document.documentElement.setAttribute('data-theme', theme)
            }

            const storyfile = this.get_storyfile_path()
            if (!storyfile) {
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
                $('#play-url-button').on('click', () => this.play_url())
                $('#play-url-input').on('keydown', event => {
                    if (event.keyCode === 13 /*Enter*/) {
                        this.play_url()
                    }
                })
                return
            }

            this.story = storyfile
            this.preload()
        }
        catch (err) {
            this.options.GlkOte.error(err)
            throw err
        }
    }

    /** Prepare to load the game, but if autoplaying is disabled this will only show the loading pane */
    preload() {
        try {
            const story = this.story!
            // Check we were given a sufficient story object
            if (!story.path) {
                if (!story.url) {
                    throw new Error('Needs story path or URL')
                }
            }

            // Hide the about page, and show the loading pane instead
            $('#about').remove()
            const cover_image_url = $('#loadingpane img').attr('src')!
            $('#loadingpane').remove()

            const gameport = document.getElementById('gameport')!
            this.loading_pane = new LoadingPane({
                target: gameport,
                props: {
                    cover_image_url,
                    play: this.load,
                    playing: !!this.options.autoplay,
                    // At this point in time we don't know the final (after following redirects) URL of the storyfile. For Unboxer URLs we could have an ugly query string, so try to account for that by just cutting off the URL after the last =
                    title: story.title ?? /([/=])([^/=]+)$/.exec((story.path || story.url)!)![2],
                },
            })
            if (this.options.autoplay) {
                this.load()
            }
        }
        catch (err) {
            this.options.GlkOte.error(err)
            throw err
        }
    }

    /** Actually load and play the storyfile */
    load = async () => {
        try {
            const story = this.story!
            // We'll display download progress only if we know the file size of the storyfile
            let progress_callback: ProgressCallback | undefined
            if (story.filesize) {
                this.loading_pane!.add_file(story.filesize, true)
                progress_callback = this.loading_pane!.update_progress
            }

            // Identify the format
            let format = find_format(story.format, story.path || story.url)

            // If a blorb file extension is generic, we must download it first to identify its format
            const options = Object.assign({}, this.options)
            if (format.id === 'blorb') {
                if (!story.path) {
                    story.path = await this.options.Dialog.download(story.url!, progress_callback)
                }
                const data = (await this.options.Dialog.read(story.path))!
                options.Blorb = new Blorb(data)
                format = identify_blorb_storyfile_format(options.Blorb)
            }

            const engine = format.engines![0]

            const requires = await Promise.all([
                story.path || this.options.Dialog.download(story.url!, progress_callback),
                ...engine.load.map(path => {
                    if (story.filesize && (path in emglken_file_sizes)) {
                        this.loading_pane!.add_file(emglken_file_sizes[path as keyof typeof emglken_file_sizes])
                    }
                    return fetch_resource(this.options, path, progress_callback)
                }),
            ])
            // TODO: load glkaudio_bg.wasm if we predict we'll need it
            story.path = requires.shift()

            // If the story is a Blorb then parse it
            if (format.blorbable && !options.Blorb) {
                const data = (await this.options.Dialog.read(story.path!))!
                const view = new FileView(data)
                if (view.getFourCC(0) === 'FORM' && view.getFourCC(8) === 'IFRS') {
                    options.Blorb = new Blorb(data)
                }
            }

            await engine.start(story, options, requires)
        }
        catch (err) {
            this.options.GlkOte.error(err)
            throw err
        }
    }

    async load_uploaded_file(file: File) {
        try {
            this.options.autoplay = 1
            this.story = {
                path: await this.options.Dialog.upload(file),
                title: file.name,
            }
            this.preload()
        }
        catch (err) {
            this.options.GlkOte.error(err)
            throw err
        }
    }

    play_url() {
        const url = $('#play-url-input').val() as string
        if (!url) {
            return
        }
        // Validate the URL
        try {
            new URL(url)
        }
        catch {
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
