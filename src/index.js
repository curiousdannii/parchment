/*

Parchment Luancher
==================

Copyright (c) 2020 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import Dialog from './upstream/glkote/dialog.js'
import Glk from './upstream/glkote/glkapi.js'
import GlkOte from './upstream/glkote/glkote.js'

import ZVM from './upstream/ifvms.js/src/zvm.js'
import ZVMDispatch from './upstream/ifvms.js/src/zvm/dispatch.js'

import Quixe from './upstream/quixe/src/quixe/quixe.js'
import QuixeDispatch from './upstream/quixe/src/quixe/gi_dispa.js'
import QuixeLoad from './upstream/quixe/src/quixe/gi_load.js'

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
    if (!window.parchment_options)
    {
        return GlkOte.error('No storyfile specified')
    }

    // Discriminate
    const storyfilepath = window.parchment_options.story[0]
    let format
    if (/zblorb|z3|z4|z5|z8/.test(storyfilepath))
    {
        format = 'zcode'
    }
    else if (/gblorb|ulx/.test(storyfilepath))
    {
        format = 'glulx'
    }
    else
    {
        return GlkOte.error('Unknown storyfile format')
    }

    $.ajax({
        cache: true,
        crossDomain: true,
        dataType: "jsonp",
        jsonp: false,
        jsonpCallback: "processBase64Zcode",
        url: storyfilepath,
    }).catch(err => {
        GlkOte.error(`Error loading storyfile: ${err.status}`)
    }).then(data => {
        const base64_decoded = atob(data)
        const data_array = text_to_array(base64_decoded)
        
        if (format === 'zcode')
        {
            const vm = new ZVM()
            const data_u8array = Uint8Array.from(data_array)

            const options = {
                vm: vm,
                Dialog: Dialog,
                Dispatch: ZVMDispatch,
                Glk: Glk,
                GlkOte: GlkOte,
            }

            vm.prepare(data_u8array, options)
            Glk.init(options)
        }

        if (format === 'glulx')
        {
            window.GiDispa = QuixeDispatch.GiDispa
            window.Glk = Glk
            window.GlkOte = GlkOte

            QuixeLoad.GiLoad.load_run({
                blorb_gamechunk_type: 'GLUL',
                Dialog: Dialog,
                GiDispa: QuixeDispatch.GiDispa,
                GiLoad: QuixeLoad.GiLoad,
                GlkOte: GlkOte,
                image_info_map: 'StaticImageInfo',
                io: Glk,
                set_page_title: false,
                spacing: 0,
                vm: Quixe.Quixe,
            }, data_array, 'array')
        }
    }).catch(err => {
        GlkOte.error(err)
    })
}

$(launch)