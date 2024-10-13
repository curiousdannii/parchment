/*

Parchment Launcher for Inform 7
===============================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {gunzipSync} from 'fflate'

import {Blorb, FileView, parse_base64} from '../upstream/asyncglk/src/index-browser.ts'
import {default as Bocfel} from '../upstream/emglken/build/bocfel.js'
import {default as Glulxe} from '../upstream/emglken/build/glulxe.js'
import type {ParchmentOptions} from '../common/interface.js'
import {get_default_options, get_query_options} from '../common/options.js'

import './inform7.css'

interface Inform7ParchmentOptions extends ParchmentOptions {
    arguments?: string[],
    story_name: string,
}

interface ParchmentWindow extends Window {
    parchment_options?: Inform7ParchmentOptions
}
declare let window: ParchmentWindow

async function launch() {
    const options: Inform7ParchmentOptions = Object.assign({}, get_default_options(), window.parchment_options, get_query_options(['do_vm_autosave']))

    if (!options.default_story) {
        return options.GlkOte.error('No storyfile specified')
    }

    // Update the Dialog storage version
    await options.Dialog.init(this.options)

    // Discriminate
    const storyfilepath = options.default_story[0]
    let format
    if (/\.(zblorb|zlb|z3|z4|z5|z8)(\.js)?$/.test(storyfilepath)) {
        format = 'zcode'
    }
    else if (/\.(gblorb|glb|ulx)(\.js)?$/.test(storyfilepath)) {
        format = 'glulx'
    }
    else {
        return options.GlkOte.error('Unknown storyfile format')
    }

    // When running from a file: URL we must use <script> tags and nothing else
    $.ajaxSetup({
        cache: true,
        crossDomain: true,
    })

    const engine = format === 'zcode' ? Bocfel : Glulxe
    const wasm_base_filename = format === 'zcode' ? 'bocfel.js' : 'glulxe.js'
    let wasm_base64: string
    try {
        wasm_base64 = await $.ajax({
            dataType: 'jsonp',
            jsonp: false,
            jsonpCallback: 'processBase64Zcode',
            url: options.lib_path + wasm_base_filename,
        })
    }
    catch (err) {
        return options.GlkOte.error(`Error loading engine: ${err.status}`)
    }

    let base64data
    try {
        base64data = await $.ajax({
            dataType: 'jsonp',
            jsonp: false,
            jsonpCallback: 'processBase64Zcode',
            url: storyfilepath,
        })
    }
    catch (err) {
        return options.GlkOte.error(`Error loading storyfile: ${err.status}`)
    }

    try {
        const data = await parse_base64(base64data)
        const view = new FileView(data)
        if (view.getFourCC(0) === 'FORM' && view.getFourCC(8) === 'IFRS') {
            options.Blorb = new Blorb(data)
        }
        const storyfile_name = options.story_name.substring(0, options.story_name.length - 3)
        options.arguments = [await options.Dialog.upload(new File([data], storyfile_name))]

        const wasmBinary_gz = await parse_base64(wasm_base64)
        const wasmBinary = gunzipSync(wasmBinary_gz)
        const vm = await engine({wasmBinary})
        vm.start(options)
    }
    catch (err) {
        options.GlkOte.error(err)
    }
}

$(launch)