/*

Parchment Launcher for Inform 7
===============================

Copyright (c) 2020 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import Dialog from '../upstream/glkote/dialog.js'
import Glk from '../upstream/glkote/glkapi.js'
import GlkOte from '../upstream/glkote/glkote.js'

// Text to byte array and vice versa
function text_to_array(text)
{
    const array = []
    let i = 0, l
    for (l = text.length % 8; i < l; ++i)
    {
        array.push(text.charCodeAt(i) & 0xff)
    }
    for (l = text.length; i < l;)
    {
        array.push(text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff,
            text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff, text.charCodeAt(i++) & 0xff)
    }
    return array
}

function launch()
{
    const options = window.parchment_options

    if (!options || !options.default_story)
    {
        return GlkOte.error('No storyfile specified')
    }

    // Discriminate
    const storyfilepath = options.default_story[0]
    let format
    if (/\.(zblorb|z3|z4|z5|z8)(\.js)?$/.test(storyfilepath))
    {
        format = 'zcode'
    }
    else if (/\.(gblorb|ulx)(\.js)?$/.test(storyfilepath))
    {
        format = 'glulx'
    }
    else
    {
        return GlkOte.error('Unknown storyfile format')
    }

    // When running from a file: URL we must use <script> tags and nothing else
    $.ajaxSetup({
        cache: true,
        crossDomain: true,
    })

    $.getScript(options.lib_path + (format === 'zcode' ? 'zvm.js' : 'quixe.js'))
    .catch(err => {
        GlkOte.error(`Error loading engine: ${err.status}`)
    }).then(() => {
        return $.ajax({
            dataType: "jsonp",
            jsonp: false,
            jsonpCallback: "processBase64Zcode",
            url: storyfilepath,
        })
    }).catch(err => {
            GlkOte.error(`Error loading storyfile: ${err.status}`)
    }).then(data => {
        const base64_decoded = atob(data)
        const data_array = text_to_array(base64_decoded)
        
        if (format === 'zcode')
        {
            const vm = new window.ZVM()
            const data_u8array = Uint8Array.from(data_array)

            const vm_options = Object.assign({}, options, {
                vm: vm,
                Dialog: Dialog,
                GiDispa: new window.ZVMDispatch(),
                Glk: Glk,
                GlkOte: GlkOte,
            })

            vm.prepare(data_u8array, vm_options)
            Glk.init(vm_options)
        }

        if (format === 'glulx')
        {
            window.Glk = Glk
            window.GlkOte = GlkOte

            const vm_options = Object.assign({}, options, {
                blorb_gamechunk_type: 'GLUL',
                Dialog: Dialog,
                GiDispa: window.GiDispa,
                GiLoad: window.GiLoad,
                GlkOte: GlkOte,
                image_info_map: 'StaticImageInfo',
                io: Glk,
                set_page_title: false,
                spacing: 0,
                vm: window.Quixe,
            })

            window.GiLoad.load_run(vm_options, data_array, 'array')
        }
    }).catch(err => {
        GlkOte.error(err)
    })
}

$(launch)