/*

Parchment Launcher for Inform 7
===============================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {Blorb} from '../upstream/asyncglk/src/index-browser.ts'
import {parse_base64} from '../common/file.js'
import {get_default_options, get_query_options} from '../common/options.js'
import Glk from '../upstream/glkote/glkapi.js'

async function launch() {
    const options = Object.assign({}, get_default_options(), window.parchment_options, get_query_options(['do_vm_autosave']))

    if (!options.default_story) {
        return options.GlkOte.error('No storyfile specified')
    }

    // Update the Dialog storage version
    options.Dialog.init()

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

    try {
        await $.getScript(options.lib_path + (format === 'zcode' ? 'zvm.js' : 'quixe.js'))
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
        const buffer = await parse_base64(base64data)
        const data_array = new Uint8Array(buffer)
        
        if (format === 'zcode') {
            const vm = new window.ZVM()
            const vm_options = Object.assign({}, options, {
                GiDispa: new window.ZVMDispatch(),
                Glk,
                vm,
            })

            vm.prepare(data_array, vm_options)
            Glk.init(vm_options)
        }

        if (format === 'glulx') {
            const vm_options = Object.assign({}, options, {
                Blorb: new Blorb(),
                blorb_gamechunk_type: 'GLUL',
                GiDispa: new window.GiDispa(),
                GiLoad: window.GiLoad,
                image_info_map: 'StaticImageInfo',
                io: Glk,
                set_page_title: 0,
                spacing: 0,
                use_query_story: 0,
                vm: window.Quixe,
            })

            window.GiLoad.load_run(vm_options, data_array, 'array')
        }
    }
    catch (err) {
        options.GlkOte.error(err)
    }
}

$(launch)
