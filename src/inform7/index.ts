/*

Parchment Launcher for Inform 7
===============================

Copyright (c) 2026 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {Blorb, fetch_resource, FileView, utf8encoder} from '../upstream/asyncglk/src/index-browser.js'
import {default as Bocfel} from 'emglken/build/bocfel-noz6.js'
import {default as Glulxe} from 'emglken/build/glulxe.js'
import type {EmglkenEngine, EmglkenEngineOptions, StoryOptions} from '../common/interface.js'
import {get_default_options, get_query_options} from '../common/options.js'

import './inform7.css'

interface Inform7ParchmentOptions extends EmglkenEngineOptions {
    story: StoryOptions,
}

interface ParchmentWindow extends Window {
    parchment_options?: Inform7ParchmentOptions
}
declare let window: ParchmentWindow

async function launch() {
    const options: Inform7ParchmentOptions = Object.assign({}, get_default_options(), window.parchment_options, get_query_options(['do_vm_autosave']))

    if (!options.story) {
        return options.GlkOte.error('No storyfile specified')
    }

    // Update the Dialog storage version
    await options.Dialog.init(options)

    // Discriminate
    const format = (/\.(zblorb|zlb|z3|z4|z5|z8)$/.test(options.story.filename!)) ? 'zcode' : 'glulx'

    const resources = [
        format === 'zcode' ? 'bocfel-noz6.js' : 'glulxe.js',
        options.story.url!,
    ]
    const resource_map = options.story.resource_map
    if (resource_map && !resource_map.startsWith('[')) {
        resources.push('jsresourcemap.js')
    }
    const requires: any[] = await Promise.all(resources.map(path => fetch_resource(options, path)))
    const wasmBinary: Uint8Array<ArrayBuffer> = requires[0]
    const story_data: Uint8Array<ArrayBuffer> = requires[1]

    try {
        options.arguments = [await options.Dialog.upload(new File([story_data], options.story.filename!))]
        const view = new FileView(story_data)
        if (view.getFourCC(0) === 'FORM' && view.getFourCC(8) === 'IFRS') {
            options.Blorb = new Blorb(story_data)
        }
        else if (requires[2]) {
            options.Blorb = new Blorb(requires[2])
            const resource_map_data = utf8encoder.encode(JSON.stringify(requires[2]))
            options.arguments.push('-resourcemap', await options.Dialog.upload(new File([resource_map_data], options.story.filename! + '.resourcemap.json')))
        }

        const engine = format === 'zcode' ? Bocfel : Glulxe
        const vm: EmglkenEngine = await engine({wasmBinary}) as EmglkenEngine
        vm.start(options)
    }
    catch (err) {
        options.GlkOte.error(err)
    }
}

$(launch)