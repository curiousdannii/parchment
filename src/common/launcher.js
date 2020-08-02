/*

Parchment Launcher
==================

Copyright (c) 2020 Dannii Willis
MIT licenced
https://github.com/curiousdannii/parchment

*/

import {fetch_file} from './file.js'

import Dialog from '../upstream/glkote/dialog.js'
import Glk from '../upstream/glkote/glkapi.js'
import GlkOte from '../upstream/glkote/glkote.js'

async function launch()
{
    const options = window.parchment_options

    if (!options || !options.default_story)
    {
        return GlkOte.error('No storyfile specified')
    }

    // Discriminate
    const storyfilepath = options.default_story[0]
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

    try
    {
        const [file_data, vm_module] = await Promise.all([
            fetch_file(storyfilepath),
            import(`./${format === 'zcode' ? 'zvm.js' : 'quixe.js'}`),
        ])

        if (format === 'zcode')
        {
            const vm = new vm_module.ZVM()

            const vm_options = Object.assign({}, options, {
                vm: vm,
                Dialog: Dialog,
                GiDispa: new vm_module.ZVMDispatch(),
                Glk: Glk,
                GlkOte: GlkOte,
            })

            vm.prepare(file_data, vm_options)
            Glk.init(vm_options)
        }

        if (format === 'glulx')
        {
            const data_array = Array.from(file_data)

            window.GiDispa = vm_module.GiDispa
            window.GiLoad = vm_module.GiLoad
            window.Glk = Glk
            window.GlkOte = GlkOte

            const vm_options = Object.assign({}, options, {
                blorb_gamechunk_type: 'GLUL',
                Dialog: Dialog,
                GiDispa: vm_module.GiDispa,
                GiLoad: vm_module.GiLoad,
                GlkOte: GlkOte,
                image_info_map: 'StaticImageInfo',
                io: Glk,
                set_page_title: false,
                spacing: 0,
                vm: vm_module.Quixe,
            })

            vm_module.GiLoad.load_run(vm_options, data_array, 'array')
        }
    }
    catch (err)
    {
        GlkOte.error(err)
    }
}

$(launch)